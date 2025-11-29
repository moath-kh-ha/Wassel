// Netlify Function: getOrdersByDriver
// Fetches all orders assigned to a specific driver (status: accepted, picked, or delivered)
// Query param: driver_id

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

  let creds;
  try {
    creds = JSON.parse(credsJson);
  } catch (err) {
    throw new Error('invalid_google_credentials_json: ' + err.message);
  }

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
    const driverId = event.queryStringParameters?.driver_id;
    if (!driverId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'driver_id required' }) };
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return { statusCode: 500, body: JSON.stringify({ error: 'missing_spreadsheet_id' }) };

    // Read from Orders sheet (columns: A=order_id, B=agent_id, C=merchant_id, D=goods_type, E=weight, F=price, G=pickup_location, H=drop_location, I=status, J=created_at, K=driver_id)
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Orders!A2:K'
    });

    const rows = resp.data.values || [];
    const orders = rows
      .filter(row => row[10] === driverId && ['accepted', 'picked'].includes(row[8])) // Filter by driver_id (column K) and status (column I)
      .map(row => ({
        order_id: row[0] || '',
        agent_id: row[1] || '',
        merchant_id: row[2] || '',
        goods_type: row[3] || '',
        weight: parseFloat(row[4]) || 0,
        price: parseFloat(row[5]) || 0,
        pickup_location: row[6] || '',
        drop_location: row[7] || '',
        status: row[8] || 'accepted',
        created_at: row[9] || '',
        driver_id: row[10] || ''
      }));

    return { statusCode: 200, body: JSON.stringify(orders) };
  } catch (e) {
    console.error('getOrdersByDriver error:', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
