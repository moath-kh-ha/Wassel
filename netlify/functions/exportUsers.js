// Netlify Function: exportUsers
// Generates an XLSX file of users and returns it as binary (base64) response
// Uses Google Sheets if GOOGLE_SHEETS_CREDENTIALS/ID are provided, otherwise falls back to Airtable (existing create/get functions must be configured)

const ExcelJS = require('exceljs');
const { google } = require('googleapis');
// Ensure `fetch` is available in Node (Netlify runtime provides fetch, but keep a fallback)
const fetch = (typeof fetch !== 'undefined') ? fetch : require('node-fetch');

async function getSheetsClient() {
  const credsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!credsJson) throw new Error('missing_google_credentials');
  const creds = JSON.parse(credsJson);

  const jwtClient = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await jwtClient.authorize();
  return google.sheets({ version: 'v4', auth: jwtClient });
}

async function fetchUsersFromSheets() {
  const sheets = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const sheetName = process.env.GOOGLE_SHEETS_RANGE || 'Users';
  const range = `${sheetName}!A1:I`;
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = resp.data.values || [];
  // rows include header
  const header = rows[0] || [];
  const dataRows = rows.slice(1);
  const users = dataRows.map(r => ({
    name: r[0] || '', phone: r[1] || '', role: r[2] || '', location: r[3] || '', rating: r[4] || '', created_at: r[5] || '', is_blocked: r[6] || '', user_id: r[7] || '', __backendId: r[8] || ''
  }));
  return users;
}

async function fetchUsersFromAirtable() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME || 'Users';
  const airtableUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}?pageSize=1000`;
  const resp = await fetch(airtableUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
  const json = await resp.json();
  const users = (json.records || []).map(rec => {
    const f = rec.fields || {};
    return { name: f.Name || '', phone: f.Phone || '', role: f.Role || '', location: f.Location || '', rating: f.Rating || '', created_at: f.CreatedAt || '', is_blocked: f.IsBlocked || '', user_id: f.UserId || '', __backendId: f.BackendId || rec.id };
  });
  return users;
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    let users = [];
    if (process.env.GOOGLE_SHEETS_CREDENTIALS && process.env.GOOGLE_SHEETS_ID) {
      users = await fetchUsersFromSheets();
    } else if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
      users = await fetchUsersFromAirtable();
    } else {
      return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'no_backend_configured' } }) };
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Users');
    sheet.addRow(['Name','Phone','Role','Location','Rating','CreatedAt','IsBlocked','UserId','BackendId']);
    users.forEach(u => sheet.addRow([u.name, u.phone, u.role, u.location, u.rating, u.created_at, u.is_blocked, u.user_id, u.__backendId]));

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="users_export_${new Date().toISOString().split('T')[0]}.xlsx"`
      },
      isBase64Encoded: true,
      body: buffer.toString('base64')
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
