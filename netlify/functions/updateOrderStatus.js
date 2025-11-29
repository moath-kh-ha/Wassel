// Netlify Function: updateOrderStatus
// Updates the status of an order (e.g., pending → accepted → picked → delivered)
// Body: { order_id, new_status, driver_id (optional, required for 'accepted' status) }

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
  if (event.httpMethod !== 'PUT' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { order_id, new_status, driver_id } = payload;

    if (!order_id || !new_status) {
      return { statusCode: 400, body: JSON.stringify({ isOk: false, error: { message: 'order_id and new_status required' } }) };
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_spreadsheet_id' } }) };

    // Read all orders to find the target order
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Orders!A2:K'
    });

    const rows = resp.data.values || [];
    let rowIndex = -1;
    let orderRow = null;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === order_id) {
        rowIndex = i;
        orderRow = rows[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { statusCode: 404, body: JSON.stringify({ isOk: false, error: { message: 'order_not_found' } }) };
    }

    // Update status (column I = index 8)
    orderRow[8] = new_status;
    // Update driver_id if provided (column K = index 10)
    if (driver_id) {
      orderRow[10] = driver_id;
    }

    // Write updated row back to sheet (row index + 2 because data starts at row 2)
    const updateRange = `Orders!A${rowIndex + 2}:K${rowIndex + 2}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      requestBody: { values: [orderRow] }
    });

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        isOk: true, 
        message: `Order ${order_id} updated to status ${new_status}` 
      }) 
    };
  } catch (e) {
    console.error('updateOrderStatus error:', e);
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
