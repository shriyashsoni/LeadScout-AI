const axios = require('axios');
const KeyRotator = require('../utils/keyRotator');

const apolloKeys = new KeyRotator([
  process.env.APOLLO_KEY_1,
  process.env.APOLLO_KEY_2,
]);

async function enrichLeads(query, perPage = 25) {
  const apiKey = apolloKeys.getNextKey();
  if (!apiKey) return [];

  try {
    const response = await axios.post('https://api.apollo.io/v1/people/search', {
      q_keywords: query,
      per_page: perPage,
    }, {
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });

    return response.data.people.map(person => ({
      name: person.name,
      email: person.email,
      linkedin: person.linkedin_url,
      company: person.organization?.name,
      companySize: person.organization?.estimated_num_employees,
      location: `${person.city}, ${person.state}`,
      domain: person.organization?.primary_domain,
    }));
  } catch (error) {
    console.error('Apollo.io Error:', error.response?.data || error.message);
    return [];
  }
}

module.exports = { enrichLeads };
