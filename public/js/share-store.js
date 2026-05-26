// ── netlify/functions/share-store.js ─────────────────────────────────────────
// Serverless Key-Value Router using Netlify Blobs for short-link resolution

exports.handler = async (event, context) => {
  // Setup standard CORS & preflight response headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Dynamically load the Netlify Blobs module to safely handle serverless scopes
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('shared_recipes');

    // ── POST: Generate a new short-key and save the recipe data payload ──────
    if (event.httpMethod === 'POST') {
      const { recipe } = JSON.parse(event.body);
      if (!recipe || !recipe.title) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid recipe object required' }) };
      }

      // Generate a short, clean, random 6-character unique alphanumeric key token
      const shortId = Math.random().toString(36).substring(2, 8);

      // Write the clean recipe snapshot string straight into the key-value store bucket
      await store.set(shortId, JSON.stringify(recipe), {
        metadata: { title: recipe.title, savedAt: new Date().toISOString() }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ id: shortId })
      };
    }

    // ── GET: Read an existing recipe payload from a short-key string ─────────
    if (event.httpMethod === 'GET') {
      const shortId = event.queryStringParameters?.id;
      if (!shortId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing recipe identifier key parameter' }) };
      }

      const rawRecipe = await store.get(shortId);
      if (!rawRecipe) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Recipe link expired or not found' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: rawRecipe
      };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  } catch (err) {
    console.error('Netlify Blobs share engine failure:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Storage engine error processing request: ' + err.message })
    };
  }
};
