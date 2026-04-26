const axios = require('axios');

const DEFAULT_SUBREDDITS = [
  'forhire',
  'freelance_forhire',
  'entrepreneur',
  'smallbusiness',
  'startups',
  'agency',
  'marketing',
  'webdev',
];

async function searchSubreddit(query, subreddit, limit) {
  try {
    const response = await axios.get(`https://www.reddit.com/r/${subreddit}/search.json`, {
      params: {
        q: query,
        sort: 'new',
        limit: limit,
        t: 'month',
        restrict_sr: 1,
      },
      headers: {
        'User-Agent': 'LeadScout/1.0.0 (by /u/ShriyashSoni)',
      },
    });

    return response.data.data.children.map(child => ({
      title: child.data.title,
      author: child.data.author,
      url: `https://reddit.com${child.data.permalink}`,
      snippet: child.data.selftext || child.data.title,
      subreddit: child.data.subreddit,
    }));
  } catch (error) {
    console.error(`Reddit Search Error (${subreddit}):`, error.response?.data || error.message);
    return []; // Return empty array to not break the pipeline
  }
}

async function searchReddit(query, limit = 100, subreddits = DEFAULT_SUBREDDITS) {
  const perSubreddit = Math.max(2, Math.ceil(limit / subreddits.length));
  const results = await Promise.all(
    subreddits.map((subreddit) => searchSubreddit(query, subreddit, perSubreddit))
  );

  return results.flat().slice(0, limit);
}

module.exports = { searchReddit };
