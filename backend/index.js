require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { searchGoogle } = require('./services/serpapi');
const { searchReddit } = require('./services/reddit');
const { findEmails } = require('./services/hunter');
const { enrichLeads } = require('./services/apollo');
const { scoreLead } = require('./services/groq');
const { getAuthUrl, setTokens, createDraft } = require('./services/gmail');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PORT = process.env.PORT || 3001;
const PYTHON_ENRICHER = 'http://localhost:5050';
const GOOGLE_BLOCKLIST = [
  'upwork.com',
  'fiverr.com',
  'freelancer.com',
  'indeed.com',
  'ziprecruiter.com',
  'glassdoor.com',
  'linkedin.com/jobs',
  'linkedin.com/hiring',
  'toptal.com',
  'guru.com',
  'peopleperhour.com',
];
const REDDIT_BLOCKLIST = [
  'UnrealEngine5',
  'FifaCareers',
  'SoloDevelopment',
  'teenagers',
  'memes',
];
const COMMUNITY_HOST_HINTS = [
  'reddit.com',
  'quora.com',
  'indiehackers.com',
  'community.',
  'forum.',
  'forums.',
];
const BUYING_INTENT_TERMS = [
  'looking for',
  'need',
  'seeking',
  'recommend',
  'hire',
  'hiring',
  'agency',
  'freelancer',
  'contractor',
  'developer',
  'designer',
  'help with',
  'build',
  'project',
];
const STRONG_BUYING_INTENT_TERMS = [
  "i'm looking for",
  'i am looking for',
  'we need',
  'i need',
  'can anyone recommend',
  'who do you recommend',
  'looking for someone',
  'need help with',
  'looking to hire',
  'hiring',
];
const NEGATIVE_PROVIDER_TERMS = [
  'our services',
  'we offer',
  'best agencies',
  'best agency',
  'outsourcing',
  'for hire',
  'hire top',
  'website redesign service',
  'digital marketing agency',
  'top web design',
  'web design services',
  'job opening',
  'jobs',
  'salary',
];

// ------------------------------------------------------------------
// Health check
// ------------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ------------------------------------------------------------------
// Helper: extract domain from URL
// ------------------------------------------------------------------
function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function buildSearchQuery(keyword, niche) {
  return [
    `"${keyword}"`,
    `"${niche}"`,
    '("looking for" OR "need" OR "recommend" OR "who do you recommend" OR "help with" OR "looking to hire")',
    '(site:reddit.com OR site:quora.com OR site:indiehackers.com OR site:community.shopify.com OR site:forum.webflow.com)',
    '-site:upwork.com',
    '-site:fiverr.com',
    '-site:freelancer.com',
    '-jobs',
    '-job',
    '-salary',
    '-services',
    '-agency',
  ].join(' ');
}

function hasBuyingIntent(text) {
  const haystack = normalizeText(text);
  return BUYING_INTENT_TERMS.some((term) => haystack.includes(term));
}

function isBlockedDomain(url) {
  const normalized = normalizeText(url);
  return GOOGLE_BLOCKLIST.some((domain) => normalized.includes(domain));
}

function isBlockedSubreddit(subreddit) {
  return REDDIT_BLOCKLIST.includes(subreddit || '');
}

function isCommunityUrl(url) {
  const normalized = normalizeText(url);
  return COMMUNITY_HOST_HINTS.some((hint) => normalized.includes(hint));
}

function filterRawLead(lead) {
  if (!lead.sourceUrl || !lead.snippet) return false;
  const combinedText = normalizeText(`${lead.name} ${lead.snippet} ${lead.rawSnippet || ''}`);

  if (lead.source.startsWith('google') && isBlockedDomain(lead.sourceUrl)) {
    return false;
  }

  if (lead.source === 'reddit' && isBlockedSubreddit(lead.subreddit)) {
    return false;
  }

  if (NEGATIVE_PROVIDER_TERMS.some((term) => combinedText.includes(term))) {
    return false;
  }

  if (lead.source.startsWith('google') && !isCommunityUrl(lead.sourceUrl)) {
    return STRONG_BUYING_INTENT_TERMS.some((term) => combinedText.includes(term));
  }

  return hasBuyingIntent(combinedText);
}

// ------------------------------------------------------------------
// Helper: call Python enricher with fallback
// ------------------------------------------------------------------
async function tryPython(route, payload) {
  try {
    const r = await axios.post(`${PYTHON_ENRICHER}${route}`, payload, { timeout: 30000 });
    return r.data;
  } catch (e) {
    console.warn(`Python enricher ${route} unavailable: ${e.message}`);
    return null;
  }
}

// ------------------------------------------------------------------
// POST /api/search — main pipeline
// ------------------------------------------------------------------
app.post('/api/search', async (req, res) => {
  const { keyword, niche, targetCount = 20 } = req.body;

  if (!keyword || !niche) {
    return res.status(400).json({ error: 'keyword and niche are required' });
  }

  console.log(`\n🔍 LeadScout search: "${keyword}" | niche: "${niche}" | target: ${targetCount}`);

  try {
    const searchQuery = buildSearchQuery(keyword, niche);
    let rawLeads = [];

    // ── 1. SerpAPI (paid, highest quality) ──────────────────────────
    try {
      const googleResults = await searchGoogle(searchQuery, Math.min(targetCount * 3, 100));
      rawLeads.push(
        ...googleResults.map(r => ({
          name: r.title || '',
          source: 'google',
          sourceUrl: r.link || '',
          snippet: r.snippet || '',
          domain: getDomain(r.link || ''),
          rawSnippet: r.snippet || '',
        }))
      );
      console.log(`  ✅ SerpAPI: ${googleResults.length} results`);
    } catch (e) {
      console.warn('  ⚠️  SerpAPI failed, falling back to free scraper:', e.message);

      // Fallback: free Google scrape via Python
      const pyResult = await tryPython('/scrape/google', { keyword: searchQuery, num: Math.min(targetCount * 2, 50) });
      if (pyResult?.results) {
        rawLeads.push(...pyResult.results.map(r => ({
          name: r.title || '',
          source: 'google-free',
          sourceUrl: r.link || '',
          snippet: r.snippet || '',
          domain: getDomain(r.link || ''),
          rawSnippet: r.snippet || '',
        })));
        console.log(`  ✅ Free scraper: ${pyResult.results.length} results`);
      }
    }

    // ── 2. Reddit (free public API) ─────────────────────────────────
    try {
      const redditResults = await searchReddit(`${keyword} ${niche}`, Math.min(targetCount * 2, 40));
      rawLeads.push(
        ...redditResults.map(r => ({
          name: r.title || r.author || 'Reddit User',
          source: 'reddit',
          sourceUrl: r.url || '',
          snippet: r.snippet || '',
          domain: 'reddit.com',
          rawSnippet: r.snippet || '',
          reddit: r.url || null,
          subreddit: r.subreddit || '',
        }))
      );
      console.log(`  ✅ Reddit: ${redditResults.length} results`);
    } catch (e) {
      console.warn('  ⚠️  Reddit failed:', e.message);
    }

    // ── 3. Apollo B2B enrichment (paid) ─────────────────────────────
    try {
      const apolloLeads = await enrichLeads(keyword, Math.ceil(targetCount / 4));
      if (apolloLeads.length > 0) {
        rawLeads.push(
          ...apolloLeads.map(p => ({
            name: p.name || '',
            email: p.email || null,
            source: 'apollo',
            sourceUrl: p.linkedin || '',
            snippet: `${p.name} at ${p.company || ''} — ${p.location || ''}`,
            domain: p.domain || '',
            company: p.company || null,
            companySize: p.companySize ? String(p.companySize) : null,
            location: p.location || null,
            linkedin: p.linkedin || null,
            rawSnippet: `${p.name} at ${p.company || ''} — ${p.location || ''}`,
          }))
        );
        console.log(`  ✅ Apollo: ${apolloLeads.length} results`);
      }
    } catch (e) {
      console.warn('  ⚠️  Apollo failed:', e.message);
    }

    // Deduplicate by URL
    const seen = new Set();
    rawLeads = rawLeads.filter(l => {
      if (seen.has(l.sourceUrl)) return false;
      seen.add(l.sourceUrl);
      return true;
    });

    rawLeads = rawLeads.filter(filterRawLead);

    // Limit to target count
    rawLeads = rawLeads.slice(0, targetCount);
    console.log(`  📋 Total unique leads before scoring: ${rawLeads.length}`);

    // ── 4. AI scoring with Groq (LLaMA 3) ─────────────────────────
    const processedLeads = [];
    for (const lead of rawLeads) {
      // Skip scoring Apollo leads that already have emails and scores
      const scored = await scoreLead(lead, niche);
      const processedLead = {
        name: lead.name || 'Unknown',
        email: lead.email || null,
        domain: lead.domain || '',
        source: lead.source || 'unknown',
        sourceUrl: lead.sourceUrl || '',
        company: lead.company || null,
        companySize: lead.companySize || null,
        location: lead.location || null,
        linkedin: lead.linkedin || null,
        twitter: lead.twitter || null,
        reddit: lead.reddit || null,
        intentScore: scored.intentScore || 1,
        intentLabel: scored.intentLabel || 'cold',
        outreachDraft: scored.outreachDraft || '',
        rawSnippet: lead.rawSnippet || lead.snippet || '',
        createdAt: Date.now(),
      };

      // ── 5. Hunter.io email enrichment (for non-reddit leads) ──────
      if (!processedLead.email && processedLead.domain && processedLead.domain !== 'reddit.com') {
        try {
          const emails = await findEmails(processedLead.domain);
          if (emails.length > 0) {
            processedLead.email = emails[0].email || null;
            processedLead.linkedin = processedLead.linkedin || emails[0].linkedin || null;
            processedLead.twitter = processedLead.twitter || emails[0].twitter || null;
          }
        } catch (e) {
          // Hunter quota may be exhausted; try Python fallback
          const pyEmails = await tryPython('/enrich/email', { domain: processedLead.domain });
          if (pyEmails?.emails?.length > 0) {
            processedLead.email = pyEmails.emails[0];
          }
        }
      }

      processedLeads.push(processedLead);
    }

    console.log(`  🎯 Done. ${processedLeads.length} scored leads.\n`);
    res.json({ leads: processedLeads, total: processedLeads.length });

  } catch (error) {
    console.error('Search pipeline error:', error);
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

// ── Gmail OAuth Routes ─────────────────────────────────────────────
app.get('/api/gmail/auth', (req, res) => {
  const url = getAuthUrl();
  res.json({ url });
});

app.get('/api/gmail/callback', async (req, res) => {
  const { code } = req.query;
  try {
    await setTokens(code);
    res.send('Authentication successful! You can close this window.');
  } catch (error) {
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/gmail/drafts', async (req, res) => {
  const { leads } = req.body;
  const results = [];

  for (const lead of leads) {
    if (!lead.email) continue;
    try {
      const draft = await createDraft(
        lead.email,
        `Re: ${lead.name} - Inquiry`,
        lead.outreachDraft || 'Hi, just following up...'
      );
      results.push({ email: lead.email, success: true, draftId: draft.id });
    } catch (error) {
      results.push({ email: lead.email, success: false, error: error.message });
    }
  }

  res.json({ results });
});

// ------------------------------------------------------------------
// GET /api/leads — placeholder (leads are stored in Convex via frontend)
// ------------------------------------------------------------------
app.get('/api/leads', (req, res) => {
  res.json({ message: 'Leads are stored in Convex. Use the frontend to query them.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 LeadScout Backend running on http://localhost:${PORT}`);
  console.log(`   API keys loaded: SerpAPI=${!!process.env.SERP_KEY_1}, Hunter=${!!process.env.HUNTER_KEY_1}, Apollo=${!!process.env.APOLLO_KEY_1}, Groq=${!!process.env.GROQ_API_KEY}`);
});
