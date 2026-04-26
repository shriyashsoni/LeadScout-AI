"""
LeadScout Python Enrichment Microservice
Provides open-source lead discovery & enrichment using:
- googlesearch-python (free Google scraping)
- praw (Reddit API, no key needed for read)
- BeautifulSoup4 (HTML parsing / email extraction)
- requests (HTTP)
- groq (LLaMA scoring)
"""

import os
import re
import json
import time
import logging
from urllib.parse import urlparse, urlencode

import requests
from bs4 import BeautifulSoup
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# -------------------------------------------------------------------
# Utility: extract emails from a page
# -------------------------------------------------------------------
def extract_emails_from_url(url: str) -> list[str]:
    try:
        resp = requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(resp.text, "lxml")
        text = soup.get_text(separator=" ")
        return list(set(EMAIL_RE.findall(text)))
    except Exception as e:
        logger.warning(f"Email extraction failed for {url}: {e}")
        return []


# -------------------------------------------------------------------
# Route: Google scrape (no API key — uses googlesearch-python)
# -------------------------------------------------------------------
@app.route("/scrape/google", methods=["POST"])
def scrape_google():
    body = request.json or {}
    keyword = body.get("keyword", "")
    num = int(body.get("num", 20))

    results = []
    try:
        from googlesearch import search as gsearch
        urls = list(gsearch(keyword, num_results=num, lang="en", sleep_interval=1))
        for url in urls:
            results.append({
                "title": url,
                "link": url,
                "snippet": f"Result for: {keyword}",
                "domain": urlparse(url).netloc.replace("www.", ""),
                "source": "google-free"
            })
    except Exception as e:
        logger.error(f"Google scrape error: {e}")

    return jsonify({"results": results})


# -------------------------------------------------------------------
# Route: Reddit scrape (public JSON API)
# -------------------------------------------------------------------
@app.route("/scrape/reddit", methods=["POST"])
def scrape_reddit():
    body = request.json or {}
    keyword = body.get("keyword", "")
    subreddits = body.get("subreddits", ["forhire", "entrepreneur", "startups", "smallbusiness", "freelance"])
    limit = int(body.get("limit", 25))

    results = []
    headers = {"User-Agent": "LeadScout/1.0 (open-source)"}

    for sub in subreddits:
        try:
            url = f"https://www.reddit.com/r/{sub}/search.json"
            params = {"q": keyword, "sort": "new", "limit": limit, "t": "month", "restrict_sr": 1}
            resp = requests.get(url, params=params, headers=headers, timeout=10)
            data = resp.json()
            posts = data.get("data", {}).get("children", [])
            for p in posts:
                d = p["data"]
                results.append({
                    "title": d.get("title", ""),
                    "author": d.get("author", ""),
                    "link": f"https://reddit.com{d.get('permalink', '')}",
                    "snippet": (d.get("selftext", "") or d.get("title", ""))[:500],
                    "subreddit": d.get("subreddit", ""),
                    "domain": "reddit.com",
                    "source": "reddit"
                })
            time.sleep(0.5)
        except Exception as e:
            logger.warning(f"Reddit scrape error for r/{sub}: {e}")

    return jsonify({"results": results})


# -------------------------------------------------------------------
# Route: Email extraction from a domain homepage
# -------------------------------------------------------------------
@app.route("/enrich/email", methods=["POST"])
def enrich_email():
    body = request.json or {}
    domain = body.get("domain", "")
    if not domain:
        return jsonify({"emails": []})

    # Try multiple paths
    candidates = [
        f"https://{domain}",
        f"https://{domain}/contact",
        f"https://{domain}/about",
    ]
    all_emails = []
    for url in candidates:
        emails = extract_emails_from_url(url)
        all_emails.extend(emails)
        if all_emails:
            break

    # Filter common no-reply / placeholder emails
    filtered = [e for e in all_emails if not any(x in e.lower() for x in ["noreply", "no-reply", "example", "test@"])]
    return jsonify({"emails": list(set(filtered))[:5]})


# -------------------------------------------------------------------
# Route: AI scoring via Groq (LLaMA 3)
# -------------------------------------------------------------------
@app.route("/ai/score", methods=["POST"])
def ai_score():
    body = request.json or {}
    leads = body.get("leads", [])
    niche = body.get("niche", "freelancing services")

    scored = []
    for lead in leads:
        system_prompt = f"""You are a lead qualification expert for {niche} services.
Given a web result or Reddit post, evaluate if this person/company is looking to hire or buy.

Return ONLY valid JSON with these keys:
{{
  "intentScore": <integer 1-10>,
  "intentLabel": "hot" | "warm" | "cold",
  "outreachDraft": "<2-3 line human-sounding cold outreach, no emojis>",
  "reasoning": "<one sentence>"
}}"""

        user_msg = f"""Source: {lead.get('source', 'unknown')}
Text: {lead.get('snippet', '')[:600]}
URL: {lead.get('link', '')}
Niche: {niche}"""

        try:
            resp = groq_client.chat.completions.create(
                model="llama3-8b-8192",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg},
                ],
                response_format={"type": "json_object"},
                max_tokens=400,
            )
            result = json.loads(resp.choices[0].message.content)
            scored.append({**lead, **result})
        except Exception as e:
            logger.error(f"Groq scoring error: {e}")
            scored.append({
                **lead,
                "intentScore": 1,
                "intentLabel": "cold",
                "outreachDraft": "",
                "reasoning": "Scoring failed"
            })
        time.sleep(0.3)  # rate limit buffer

    return jsonify({"scored": scored})


# -------------------------------------------------------------------
# Route: Full pipeline  (scrape → enrich → score)
# -------------------------------------------------------------------
@app.route("/pipeline", methods=["POST"])
def full_pipeline():
    body = request.json or {}
    keyword = body.get("keyword", "")
    niche = body.get("niche", "services")
    target = int(body.get("targetCount", 20))

    # 1. Google scrape
    g_resp = requests.post("http://localhost:5050/scrape/google",
                           json={"keyword": keyword, "num": target // 2})
    google_leads = g_resp.json().get("results", []) if g_resp.ok else []

    # 2. Reddit scrape
    r_resp = requests.post("http://localhost:5050/scrape/reddit",
                           json={"keyword": keyword, "limit": target // 2})
    reddit_leads = r_resp.json().get("results", []) if r_resp.ok else []

    all_leads = (google_leads + reddit_leads)[:target]

    # 3. AI score
    score_resp = requests.post("http://localhost:5050/ai/score",
                               json={"leads": all_leads, "niche": niche})
    scored = score_resp.json().get("scored", all_leads) if score_resp.ok else all_leads

    # 4. Email enrichment (for non-reddit leads with domains)
    enriched = []
    for lead in scored:
        domain = lead.get("domain", "")
        if domain and domain != "reddit.com":
            try:
                e_resp = requests.post("http://localhost:5050/enrich/email",
                                       json={"domain": domain}, timeout=10)
                emails = e_resp.json().get("emails", []) if e_resp.ok else []
                lead["email"] = emails[0] if emails else None
            except Exception:
                lead["email"] = None
        else:
            lead["email"] = None
        enriched.append(lead)

    return jsonify({"leads": enriched, "total": len(enriched)})


if __name__ == "__main__":
    app.run(port=5050, debug=False)
