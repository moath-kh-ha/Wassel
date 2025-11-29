// Netlify Function: updateUser_gs
// Updates user row in Google Sheets by matching BackendId column (assumes BackendId is column J)
const { google } = require('googleapis');
const fs = require('fs');

async function getSheetsClient() {
  let credsJson = process.env.GOOGLE_SHEETS_CREDENTIALS || null;
  if (!credsJson && process.env.GOOGLE_SHEETS_CREDENTIALS_B64) {
    credsJson = Buffer.from(process.env.GOOGLE_SHEETS_CREDENTIALS_B64, 'base64').toString('utf8');
  }
  if (!credsJson && process.env.GOOGLE_SHEETS_CREDENTIALS_FILE) {
    credsJson = fs.readFileSync(process.env.GOOGLE_SHEETS_CREDENTIALS_FILE, 'utf8');
  }
  if (!credsJson) throw new Error('missing_google_credentials');
  const creds = JSON.parse(credsJson);
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
    const backendId = payload.__backendId || payload.backendId;
    const updates = payload.updates || {};
    if (!backendId || !updates || Object.keys(updates).length === 0) {
      return { statusCode: 400, body: JSON.stringify({ isOk: false, error: { message: 'invalid_payload' } }) };
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_spreadsheet_id' } }) };
    const sheetName = process.env.GOOGLE_SHEETS_RANGE || 'Users';

    // Read all rows to find the matching BackendId (assume BackendId in column J)
    const range = `${sheetName}!A2:J`;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values || [];

    let foundRowIndex = -1; // 0-based in rows array
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowBackend = row[9] || '';
      if (rowBackend === backendId) { foundRowIndex = i; break; }
    }

    if (foundRowIndex === -1) {
      return { statusCode: 404, body: JSON.stringify({ isOk: false, error: { message: 'not_found' } }) };
    }

    const sheetRowNumber = 2 + foundRowIndex; // because A2 is rows[0]

    // Fetch the full current row to preserve non-updated columns
    const rowRange = `${sheetName}!A${sheetRowNumber}:J${sheetRowNumber}`;
    const current = await sheets.spreadsheets.values.get({ spreadsheetId, range: rowRange });
    const currentRow = (current.data.values && current.data.values[0]) || [];

    // Map columns: 0:Name,1:Phone,2:Role,3:Location,4:Rating,5:CreatedAt,6:IsApproved,7:IsBlocked,8:UserId,9:BackendId
    const newRow = currentRow.slice(0, 10);
    // ensure length
    while (newRow.length < 10) newRow.push('');

    if (typeof updates.is_approved !== 'undefined') newRow[6] = updates.is_approved ? 'true' : 'false';
    if (typeof updates.is_blocked !== 'undefined') newRow[7] = updates.is_blocked ? 'true' : 'false';
    if (typeof updates.name !== 'undefined') newRow[0] = updates.name;
    if (typeof updates.phone !== 'undefined') newRow[1] = updates.phone;
    if (typeof updates.location !== 'undefined') newRow[3] = updates.location;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rowRange,
      valueInputOption: 'RAW',
      requestBody: { values: [newRow] }
    });

    return { statusCode: 200, body: JSON.stringify({ isOk: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
