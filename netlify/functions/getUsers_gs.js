// Netlify Function: getUsers_gs
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
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_spreadsheet_id' } }) };
    const sheetName = process.env.GOOGLE_SHEETS_RANGE || 'Users';
    const range = `${sheetName}!A2:I`;

    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values || [];

    const users = rows.map(row => ({
      name: row[0] || '',
      phone: row[1] || '',
      role: row[2] || '',
      location: row[3] || '',
      rating: row[4] ? parseFloat(row[4]) : 5.0,
      created_at: row[5] || new Date().toISOString(),
      is_blocked: row[6] === 'true',
      user_id: row[7] || '',
      __backendId: row[8] || ''
    }));

    return { statusCode: 200, body: JSON.stringify(users) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
