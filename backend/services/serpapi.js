const axios = require('axios');
const KeyRotator = require('../utils/keyRotator');

const serpKeys = new KeyRotator([
  process.env.SERP_KEY_1,
  process.env.SERP_KEY_2,
  process.env.SERP_KEY_3,
  process.env.SERP_KEY_4,
]);

async function searchGoogle(query, num = 100) {
  const apiKey = serpKeys.getNextKey();
  if (!apiKey) {
    throw new Error('No SerpAPI keys provided');
  }

  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        api_key: apiKey,
        num: num,
        engine: 'google',
      },
    });

    return response.data.organic_results || [];
  } catch (error) {
    console.error('SerpAPI Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { searchGoogle };
