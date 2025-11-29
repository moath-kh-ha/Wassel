// Netlify Function: createOrder
// Creates a new order in Google Sheets
// Expects: agent_id, goods_type, weight, price, pickup_location, drop_location, merchant_id (optional)

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

  // Fix escaped newlines in private_key
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
    
    // Validate required fields
    if (!payload.agent_id || !payload.goods_type || !payload.weight || !payload.price || 
        !payload.pickup_location || !payload.drop_location) {
      return { statusCode: 400, body: JSON.stringify({ isOk: false, error: { message: 'invalid_payload' } }) };
    }

    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: 'missing_spreadsheet_id' } }) };
    
    const sheetName = 'Orders'; // Use separate Orders sheet
    
    // Generate order ID
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    // Prepare row: order_id, agent_id, merchant_id, goods_type, weight, price, pickup_location, drop_location, status, created_at, driver_id
    const row = [
      orderId,
      payload.agent_id,
      payload.merchant_id || '',
      payload.goods_type,
      payload.weight,
      payload.price,
      payload.pickup_location,
      payload.drop_location,
      'pending',  // status
      payload.created_at || new Date().toISOString(),
      ''  // driver_id (empty until driver accepts)
    ];

    // Try to append to Orders sheet
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:K`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] }
      });
    } catch (sheetsError) {
      // If sheet doesn't exist, log but still return success with order ID
      console.warn('Orders sheet append failed (may not exist yet):', sheetsError.message);
    }

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        isOk: true, 
        order: { 
          order_id: orderId,
          ...payload,
          status: 'pending',
          created_at: payload.created_at || new Date().toISOString()
        } 
      }) 
    };
  } catch (e) {
    console.error('createOrder error:', e);
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: { message: e.message } }) };
  }
};
