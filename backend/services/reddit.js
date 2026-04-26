const axios = require('axios');

async function searchReddit(query, limit = 100) {
  try {
    // Reddit JSON API usually works without auth for public searches but is rate-limited
    // For production, Oauth2 would be better
    const response = await axios.get('https://www.reddit.com/search.json', {
      params: {
        q: query,
        sort: 'new',
        limit: limit,
        t: 'week',
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
    console.error('Reddit Search Error:', error.response?.data || error.message);
    return []; // Return empty array to not break the pipeline
  }
}

module.exports = { searchReddit };
