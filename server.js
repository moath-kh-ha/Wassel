const express = require('express');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'users.xlsx');

async function readUsersFromExcel() {
  const users = [];
  if (!fs.existsSync(DATA_FILE)) return users;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(DATA_FILE);
  const sheet = workbook.worksheets[0];
  if (!sheet) return users;

  const header = sheet.getRow(1).values.map(v => (v || '').toString());
  // iterate rows starting at 2
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const vals = row.values;
    const u = {
      name: vals[1] || '',
      phone: vals[2] || '',
      role: vals[3] || '',
      location: vals[4] || '',
      rating: parseFloat(vals[5]) || 5.0,
      created_at: vals[6] || new Date().toISOString(),
      is_blocked: (vals[7] === 'true' || vals[7] === true) ? true : false,
      user_id: vals[8] || '',
      __backendId: vals[9] || ''
    };
    users.push(u);
  });

  return users;
}

async function writeUsersToExcel(users) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Users');
  sheet.addRow(['name','phone','role','location','rating','created_at','is_blocked','user_id','__backendId']);

  users.forEach(u => {
    sheet.addRow([
      u.name || '',
      u.phone || '',
      u.role || '',
      u.location || '',
      typeof u.rating === 'number' ? u.rating : (u.rating ? parseFloat(u.rating) : 5.0),
      u.created_at || new Date().toISOString(),
      u.is_blocked ? 'true' : 'false',
      u.user_id || '',
      u.__backendId || ''
    ]);
  });

  await workbook.xlsx.writeFile(DATA_FILE);
}

function ensureBackendId(user) {
  if (!user.__backendId) user.__backendId = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
  return user;
}

app.get('/api/users', async (req, res) => {
  try {
    const users = await readUsersFromExcel();
    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed_read' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const newUser = req.body;
    if (!newUser || !newUser.phone) return res.status(400).json({ isOk: false, error: { message: 'invalid_payload' } });

    const users = await readUsersFromExcel();
    if (users.find(u => u.phone === newUser.phone)) {
      return res.status(409).json({ isOk: false, error: { message: 'phone_exists' } });
    }

    // ensure metadata
    newUser.user_id = newUser.user_id || ('user_' + Date.now() + '_' + Math.random().toString(36).substr(2,9));
    ensureBackendId(newUser);
    newUser.created_at = newUser.created_at || new Date().toISOString();
    if (typeof newUser.is_blocked === 'undefined') newUser.is_blocked = false;
    if (typeof newUser.rating === 'undefined') newUser.rating = 5.0;

    users.push(newUser);
    await writeUsersToExcel(users);

    res.json({ isOk: true, user: newUser });
  } catch (e) {
    console.error('POST /api/users error', e);
    res.status(500).json({ isOk: false, error: { message: e.message } });
  }
});

// serve static files (the frontend)
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
