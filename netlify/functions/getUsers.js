// Netlify Function: getUsers
// Expects environment variables: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME

// Ensure `fetch` is available in Node (Netlify runtime provides fetch, but keep a fallback)
const fetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME || 'Users';

  if (!apiKey || !baseId) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_airtable_config' } }) };
  }

  try {
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=1000`;
    const resp = await fetch(airtableUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const json = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ isOk: false, error: json }) };
    }

    // Map Airtable records to the frontend's expected user shape
    const users = (json.records || []).map(rec => {
      const f = rec.fields || {};
      return {
        name: f.Name || '',
        phone: f.Phone || '',
        role: f.Role || '',
        location: f.Location || '',
        rating: typeof f.Rating === 'number' ? f.Rating : parseFloat(f.Rating) || 5.0,
        created_at: f.CreatedAt || new Date().toISOString(),
        is_blocked: !!f.IsBlocked,
        is_approved: !!f.IsApproved,
        user_id: f.UserId || '',
        __backendId: f.BackendId || rec.id
      };
    });

    return { statusCode: 200, body: JSON.stringify(users) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
