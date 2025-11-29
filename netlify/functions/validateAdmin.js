// Netlify Function: validateAdmin
// Validates admin username and password against environment variables
// Returns { isOk: true/false }

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { username, password } = payload;

    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ isOk: false, error: 'Missing credentials' }) };
    }

    // Validate against environment variables
    const adminUsername = process.env.ADMIN_USERNAME || '712345678';
    const adminPassword = process.env.ADMIN_PASSWORD || 'KHSHiph32001';

    if (username === adminUsername && password === adminPassword) {
      return { statusCode: 200, body: JSON.stringify({ isOk: true }) };
    } else {
      return { statusCode: 401, body: JSON.stringify({ isOk: false, error: 'Invalid credentials' }) };
    }
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: e.message }) };
  }
};
