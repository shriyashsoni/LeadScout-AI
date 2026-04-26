const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const POSITIVE_TERMS = [
  "i'm looking for",
  'i am looking for',
  'we need',
  'i need',
  'can anyone recommend',
  'who do you recommend',
  'looking to hire',
  'need help with',
  'help me build',
  'budget',
  'quote',
  'proposal',
  'redesign',
];
const NEGATIVE_TERMS = [
  'our services',
  'we offer',
  'for hire',
  'best agency',
  'best agencies',
  'job',
  'jobs',
  'salary',
  'course',
  'template',
];

function heuristicScoreLead(leadData, niche) {
  const text = `${leadData.snippet || ''} ${leadData.sourceUrl || ''}`.toLowerCase();
  let score = 3;

  for (const term of POSITIVE_TERMS) {
    if (text.includes(term)) score += 2;
  }

  for (const term of NEGATIVE_TERMS) {
    if (text.includes(term)) score -= 2;
  }

  if ((leadData.sourceUrl || '').includes('reddit.com')) score += 1;

  score = Math.max(1, Math.min(10, score));
  const intentLabel = score >= 8 ? 'hot' : score >= 5 ? 'warm' : 'cold';
  const outreachDraft = intentLabel === 'cold'
    ? ''
    : `Hi, I came across your post about ${niche.toLowerCase()} and it sounded like you may need a hand.\nI help with this kind of work and can share a few practical ideas if helpful.`;

  return {
    intentScore: score,
    intentLabel,
    outreachDraft,
    reasoning: 'Heuristic fallback based on buyer-intent phrases in the source text.',
  };
}

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
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: GROQ_MODEL,
      response_format: { type: 'json_object' },
    });

    return JSON.parse(chatCompletion.choices[0].message.content);
  } catch (error) {
    console.error('Groq Scoring Error:', error);
    return heuristicScoreLead(leadData, niche);
  }
}

module.exports = { scoreLead };
