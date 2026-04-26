const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function scoreLead(leadData, niche) {
  const systemPrompt = `
You are a lead qualification expert. You will receive raw text (a Google snippet, Reddit post, or tweet) from a potential client who might need ${niche} services.

Your job:
1. Detect if this person has BUYING INTENT for the service.
2. Score them 1–10 (10 = actively looking to hire / buy)
3. Label them: hot (8-10), warm (5-7), cold (1-4)
4. Write a short, human-sounding outreach message (2-3 lines, no emojis, no corporate tone) as if a real freelancer sent it.

Return ONLY valid JSON:
{
  "intentScore": <number 1-10>,
  "intentLabel": "hot" | "warm" | "cold",
  "outreachDraft": "<string>",
  "reasoning": "<1 sentence>"
}
`;

  const userMessage = `
Source: ${leadData.source}
Text: ${leadData.snippet}
Their domain/profile: ${leadData.sourceUrl}
Service niche: ${niche}
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620", // Updating to a current model version
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const content = response.content[0].text;
    return JSON.parse(content);
  } catch (error) {
    console.error('Claude Scoring Error:', error);
    return {
      intentScore: 1,
      intentLabel: "cold",
      outreachDraft: "",
      reasoning: "Error processing lead",
    };
  }
}

async function batchPersonalize(leads) {
  const systemPrompt = `
You are a cold outreach expert. Given a list of leads, write personalized 3-line cold emails.
Rules:
- Sound human, not AI
- Mention something specific from their profile/snippet
- End with one clear CTA
- No emojis, no dashes, no bullet points
- Return as JSON array

Input format:
[
  { "name": "...", "company": "...", "snippet": "...", "niche": "..." }
]

Output format:
[
  { "name": "...", "email_draft": "..." }
]
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(leads) }],
    });

    return JSON.parse(response.content[0].text);
  } catch (error) {
    console.error('Claude Batch Personalization Error:', error);
    return [];
  }
}

module.exports = { scoreLead, batchPersonalize };
