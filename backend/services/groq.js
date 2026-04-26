const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      model: 'llama3-8b-8192',
      response_format: { type: 'json_object' },
    });

    return JSON.parse(chatCompletion.choices[0].message.content);
  } catch (error) {
    console.error('Groq Scoring Error:', error);
    return {
      intentScore: 1,
      intentLabel: 'cold',
      outreachDraft: '',
      reasoning: 'Error processing lead',
    };
  }
}

module.exports = { scoreLead };
