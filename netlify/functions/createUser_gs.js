// Netlify Function: createUser_gs
// Expects environment variables: GOOGLE_SHEETS_CREDENTIALS (JSON string), GOOGLE_SHEETS_ID, GOOGLE_SHEETS_RANGE (optional, default 'Users')

const { google } = require('googleapis');
const fs = require('fs');

async function getSheetsClient() {
  // Support three ways to provide credentials:
  // 1) GOOGLE_SHEETS_CREDENTIALS (raw JSON string)
  // 2) GOOGLE_SHEETS_CREDENTIALS_B64 (base64-encoded JSON)
  // 3) GOOGLE_SHEETS_CREDENTIALS_FILE (local file path, useful for local dev)
  let credsJson = process.env.GOOGLE_SHEETS_CREDENTIALS || null;
  if (!credsJson && process.env.GOOGLE_SHEETS_CREDENTIALS_B64) {
    credsJson = Buffer.from(process.env.GOOGLE_SHEETS_CREDENTIALS_B64, 'base64').toString('utf8');
  }
  if (!credsJson && process.env.GOOGLE_SHEETS_CREDENTIALS_FILE) {
    credsJson = fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_FILE, 'utf8');
  }

  if (!credsJson) throw new Error('missing_google_credentials');

  let creds;
  try {
    creds = JSON.parse(credsJson);
  } catch (err) {
    throw new Error('invalid_google_credentials_json: ' + err.message);
  }

  // The private_key in environment variables is often stored with escaped newlines ("\n"); fix that
  if (creds.private_key && creds.private_key.indexOf('\\n') !== -1) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }

  const jwtClient = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await jwtClient.authorize();
  return google.sheets({ version: 'v4', auth: jwtClient });
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    if (!payload.phone || !payload.name || !payload.role) {
      return { statusCode: 400, body: JSON.stringify({ isOk: false, error: { message: 'invalid_payload' } }) };
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_spreadsheet_id' } }) };
    const sheetName = process.env.GOOGLE_SHEETS_RANGE || 'Users';

    // Check for duplicate phone by reading existing rows (inefficient for very large sheets)
    const getResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!A2:B` });
    const rows = getResp.data.values || [];
    if (rows.find(r => (r[1] || '') === payload.phone)) {
      return { statusCode: 409, body: JSON.stringify({ isOk: false, error: { message: 'phone_exists' } }) };
    }

    // Prepare row: Name,Phone,Role,Location,Rating,CreatedAt,IsApproved,IsBlocked,UserId,BackendId
    const userId = payload.user_id || ('user_' + Date.now() + '_' + Math.random().toString(36).substr(2,9));
    const backendId = payload.__backendId || ('b_' + Date.now() + '_' + Math.random().toString(36).substr(2,9));
    const createdAt = payload.created_at || new Date().toISOString();
    const isApproved = payload.is_approved ? 'true' : 'false';
    const row = [payload.name, payload.phone, payload.role, payload.location || '', payload.rating || 5.0, createdAt, isApproved, payload.is_blocked ? 'true' : 'false', userId, backendId];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:J`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });

    return { statusCode: 200, body: JSON.stringify({ isOk: true, user: { ...payload, user_id: userId, __backendId: backendId, created_at: createdAt, is_approved: payload.is_approved || false } }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
