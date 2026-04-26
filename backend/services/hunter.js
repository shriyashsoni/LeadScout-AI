const axios = require('axios');
const KeyRotator = require('../utils/keyRotator');

const hunterKeys = new KeyRotator([
  process.env.HUNTER_KEY_1,
  process.env.HUNTER_KEY_2,
]);

async function findEmails(domain) {
  const apiKey = hunterKeys.getNextKey();
  if (!apiKey) return [];

  try {
    const response = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: {
        domain: domain,
        api_key: apiKey,
      },
    });

    return response.data.data.emails.map(e => ({
      email: e.value,
      linkedin: e.linkedin,
      twitter: e.twitter,
    }));
  } catch (error) {
    console.error('Hunter.io Error:', error.response?.data || error.message);
    return [];
  }
}

module.exports = { findEmails };
