// Netlify Function: createUser
// Expects environment variables: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME

// Ensure `fetch` is available in Node (Netlify runtime provides fetch, but keep a fallback)
const fetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME || 'Users';

  if (!apiKey || !baseId) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_airtable_config' } }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');

    // Basic server-side validation
    if (!payload.phone || !payload.name || !payload.role) {
      return { statusCode: 400, body: JSON.stringify({ isOk: false, error: { message: 'invalid_payload' } }) };
    }

    // Map fields to Airtable field names
    const fields = {
      Name: payload.name,
      Phone: payload.phone,
      Role: payload.role,
      Location: payload.location || '',
      Rating: payload.rating || 5.0,
      CreatedAt: payload.created_at || new Date().toISOString(),
      IsBlocked: payload.is_blocked ? true : false,
      UserId: payload.user_id || '',
      BackendId: payload.__backendId || ''
    };

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;

    // Create record
    const resp = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    });

    const json = await resp.json();

    if (!resp.ok) {
      // Airtable returns errors in JSON
      return { statusCode: resp.status, body: JSON.stringify({ isOk: false, error: json }) };
    }

    // Return simplified success
    return { statusCode: 200, body: JSON.stringify({ isOk: true, record: json }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
