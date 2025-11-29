# Wassel Project - Code Audit & Fix Report

**Date:** November 29, 2025  
**Project:** Wassel - Smart Logistics Platform (Agent ↔ Merchant ↔ Driver)

---

## Executive Summary

Your codebase currently implements **user management (registration, login, admin dashboard)** but is **missing the core business logic** for the platform: the Orders System, Notifications, Chat, Rating, and Payment. This report identifies what works, what doesn't, and a prioritized fix roadmap.

**Status: ~20% complete vs. MVP spec**

---

## Part 1: What's Working ✅

### Frontend (index.html)
- ✅ **Authentication System**
  - Registration with 3 roles (Agent, Merchant, Driver)
  - Login validation
  - Admin login with hardcoded credentials
  - Password toggle visibility
  - Phone uniqueness validation

- ✅ **User Management (Admin Dashboard)**
  - User listing with role badges, ratings, status
  - Block/Unblock users
  - Delete users (with confirmation)
  - Edit user details (name, phone, location, role)
  - Export to CSV
  - Export to JSON
  - Print user report
  - Filter/search users (partial)

- ✅ **Role-Based Dashboards**
  - Agent Dashboard (shows stats, driver rating)
  - Merchant Dashboard (shows stats, merchant rating)
  - Driver Dashboard (shows stats, availability toggle)
  - Each has placeholder order sections (removed example orders)

- ✅ **Design & UX**
  - Glassmorphic design with gradients
  - Arabic RTL support
  - Responsive mobile layout
  - Loading spinners
  - Toast messages (success/error)

### Backend (Netlify Functions)
- ✅ **createUser_gs.js**
  - Creates users in Google Sheets
  - Phone duplicate check
  - Supports 3 credential sources (raw JSON, base64, file path)
  - Returns user ID and backend ID

- ✅ **getUsers_gs.js**
  - Fetches all users from Google Sheets
  - Maps to user object format
  - Returns array of users

---

## Part 2: What's Broken or Missing ❌

### Core Business Logic (MVP Features)

| Feature | Status | Issue | Priority |
|---------|--------|-------|----------|
| **Orders System** | 0% | No order creation, retrieval, or state management | CRITICAL |
| **Order Lifecycle** | 0% | No "pending→accepted→picked→delivered" workflow | CRITICAL |
| **Notifications** | 5% | `notification.mp3` exists; no real notification API | CRITICAL |
| **Real-time Updates** | 0% | No WebSocket/Socket.io; no polling mechanism | HIGH |
| **Chat System** | 0% | No chat function between Agent↔Driver or Driver↔Merchant | HIGH |
| **Rating System** | 0% | No rating submission, averaging, or retrieval | HIGH |
| **Payment Integration** | 0% | No payment method support (cash/transfer/in-app balance) | HIGH |
| **GPS Tracking** | 0% | No location tracking or ETA calculation | MEDIUM |
| **Driver Availability** | 10% | Toggle exists; not persisted or visible to others | MEDIUM |
| **Location/Search** | 0% | No nearby driver search, no radius-based filtering | MEDIUM |
| **Admin Notifications** | 10% | `sendBulkNotification()` is dummy; no real broadcast | MEDIUM |

---

## Part 3: Detailed Function-by-Function Audit

### **Frontend Functions**

#### 1. `initializeApp()` ✅
**What it does:** Initializes SDKs and loads users on page load  
**Works correctly:** YES  
**Issues:** None observed

---

#### 2. `handleRegister(event)` ✅
**What it does:** Create new user account  
**Works correctly:** YES  
**Details:**
- Validates role selection
- Checks password match & length
- Prevents duplicate phones
- Tries Netlify serverless API first, falls back to dataSdk
- Creates user with 9 properties (name, phone, role, location, rating, created_at, is_available, is_blocked, is_approved)

**Issues Found:** None; function is robust

---

#### 3. `handleLogin(event)` ✅
**What it does:** Authenticate user  
**Works correctly:** YES  
**Details:**
- Finds user by phone + password
- Checks if blocked or pending approval
- Loads appropriate dashboard

**Issues Found:** None; basic login works

---

#### 4. `handleAdminLogin(event)` ✅
**What it does:** Admin authentication  
**Works correctly:** YES  
**Details:**
- Hardcoded credentials (default: `712345678` / `password`)
- Shows admin dashboard on success

**Issues Found:** SECURITY - hardcoded credentials in code. Should use environment variables.

---

#### 5. `handleEditUser(event)` ✅
**What it does:** Modify user properties  
**Works correctly:** YES  
**Issues Found:** None observed

---

#### 6. `toggleBlockUser(backendId, shouldBlock)` ✅
**What it does:** Block or unblock a user  
**Works correctly:** YES; updates user.is_blocked locally  
**Issues Found:** Changes not persisted to Google Sheets (only to local dataSdk)

---

#### 7. `deleteUser(backendId)` ✅
**What it does:** Delete user with two-step confirmation  
**Works correctly:** YES  
**Issues Found:** None observed

---

#### 8. `filterUsers()` (called from loadAdminDashboard)  ❌
**What it does:** Should filter/search users  
**Works correctly:** NOT VERIFIED - function exists but search box integration may be incomplete  
**Issues Found:** Search functionality not fully implemented; filter criteria not clear

---

#### 9. `exportToCSV()`, `exportToJSON()`, `printReport()` ✅
**What it does:** Export user data  
**Works correctly:** YES  
**Issues Found:** None observed

---

#### 10. `sendBulkNotification()` ❌
**What it does:** Send notification to all users  
**Works correctly:** NO - only shows toast message  
**Current Code:**
```javascript
function sendBulkNotification() {
  const message = '📢 تم إرسال إشعار جماعي...[placeholder]';
  showAdminMessage(message);
}
```
**Issue:** Completely dummy; no actual notification API call  
**Fix Needed:** Implement real notification service (Firebase, OneSignal, or custom API)

---

#### 11. `renderOrders()` and `handleSystemOrder()` (newly added) ⚠️
**What it does:** Render orders from System, play notification.mp3  
**Works correctly:** Partially - structure ready but no System source feeding orders  
**Issues Found:**
- No actual orders being sent to these functions
- Expects `window.System.on('order', ...)` but System doesn't exist
- No order management functions (create, update, cancel)

---

### **Backend Functions**

#### 1. `createUser_gs.js` ✅
**What it does:** Create user in Google Sheets  
**Works correctly:** YES  
**Issues Found:** None; robust credential handling

---

#### 2. `getUsers_gs.js` ✅
**What it does:** Fetch all users from Google Sheets  
**Works correctly:** YES  
**Issues Found:** None observed

---

#### 3. `exportUsers.js` ⚠️
**What it does:** Export users to Excel  
**Status:** Exists but not tested in current session  
**Likely Issues:** May need to call getUsers_gs or fetch from Sheets

---

#### 4. **MISSING: Order Management Functions** ❌
- `createOrder.js` - NOT IMPLEMENTED
- `getOrders.js` - NOT IMPLEMENTED
- `updateOrderStatus.js` - NOT IMPLEMENTED
- `acceptOrder.js` - NOT IMPLEMENTED
- `submitRating.js` - NOT IMPLEMENTED
- `createChat.js` - NOT IMPLEMENTED
- `getChat.js` - NOT IMPLEMENTED
- `processPayment.js` - NOT IMPLEMENTED
- `sendNotification.js` - NOT IMPLEMENTED

---

## Part 4: Spec Compliance Matrix

### MVP Requirements vs. Implementation

| MVP Feature | Implemented | % Complete | Notes |
|-------------|-------------|-----------|-------|
| **Registration (3 roles)** | ✅ | 100% | All three roles working |
| **Login** | ✅ | 100% | Phone + password auth |
| **Agent Dashboard** | ⚠️ | 40% | UI present, no order creation |
| **Merchant Dashboard** | ⚠️ | 40% | UI present, no order reception |
| **Driver Dashboard** | ⚠️ | 30% | UI present, availability toggle only |
| **Create Order** | ❌ | 0% | No function to create orders |
| **View Available Orders** | ❌ | 0% | No order search/list for drivers |
| **Accept Order** | ❌ | 0% | No order acceptance workflow |
| **Update Order Status** | ❌ | 0% | No lifecycle management (picked→delivered) |
| **Notifications** | ⚠️ | 10% | Sound file exists, no real push/event system |
| **Chat** | ❌ | 0% | No messaging between roles |
| **Rating System** | ❌ | 0% | No rating submission or display |
| **Payment** | ❌ | 0% | No payment method selection or processing |
| **Admin Controls** | ✅ | 90% | User mgmt complete; order mgmt missing |

**MVP Completion: ~18%**

---

## Part 5: Priority Fix List

### **TIER 1 - CRITICAL (Do First)**

1. **Create Order Function** (Frontend + Backend)
   - Frontend: Add order creation form to Agent dashboard
   - Backend: `createOrder.js` to store in Google Sheets
   - Fields: goods_type, weight, price, pickup_location, drop_location, merchant_id, status (pending)

2. **Get Orders by Role** (Backend)
   - `getOrdersByAgent.js` - fetch orders created by this agent
   - `getOrdersForDriver.js` - fetch nearby/available orders
   - `getOrdersForMerchant.js` - fetch orders delivered to them

3. **Real-time System**
   - Implement polling or WebSocket to auto-load new orders every 5 seconds
   - Trigger `handleSystemOrder()` when new order arrives
   - Play `notification.mp3`

4. **Order Acceptance Workflow**
   - Driver accepts order → updates status to "accepted"
   - Agent/Merchant notified
   - Backend: `acceptOrder.js`

---

### **TIER 2 - HIGH (Next)**

5. **Order Lifecycle** (pickup → delivered)
   - Add buttons: "Start Pickup", "Item Picked", "Delivered"
   - Update order status at each step
   - Persist to Google Sheets

6. **Chat System**
   - Simple chat between Agent ↔ Driver and Driver ↔ Merchant
   - Store in Google Sheets or separate sheet
   - Load chat on order detail view

7. **Rating System**
   - After order delivered: show 5-star rating form
   - Calculate average rating
   - Display on driver/agent/merchant profile

---

### **TIER 3 - HIGH (After MVP)**

8. **Payment**
   - Select payment method (cash/transfer/in-app)
   - Mock payment processing
   - Record in database

9. **Admin Notifications**
   - Real sendBulkNotification with API call
   - Fix hardcoded admin password → use env var

10. **GPS & Nearby Search**
    - Location permission
    - Store driver location
    - Search nearby drivers

---

## Part 6: Code Fixes (Immediate)

### **Fix 1: Secure Admin Credentials**

**File:** `index.html` (lines 2036-2070)

**Current Code:**
```javascript
const adminUsername = defaultConfig.admin_username;  // '712345678'
const adminPassword = defaultConfig.admin_password;  // 'password'
```

**Issues:** Hardcoded in HTML; visible in browser  

**Fix:**
```javascript
// Remove hardcoded credentials
// Instead, call a serverless function:
async function validateAdmin(username, password) {
  const resp = await fetch('/.netlify/functions/validateAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return await resp.json();
}
```

**New Backend File:** `netlify/functions/validateAdmin.js`
```javascript
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  const { username, password } = JSON.parse(event.body);
  // Validate against env vars
  if (username === process.env.ADMIN_USERNAME && 
      password === process.env.ADMIN_PASSWORD) {
    return { statusCode: 200, body: JSON.stringify({ isOk: true }) };
  }
  return { statusCode: 401, body: JSON.stringify({ isOk: false }) };
};
```

---

### **Fix 2: Implement Order Creation**

**File:** `index.html` - Add to Agent Dashboard (around line 1350)

**Add Form:**
```html
<div class="dashboard-section">
  <h3>📦 إنشاء طلب نقل جديد</h3>
  <form onsubmit="handleCreateOrder(event)">
    <div class="form-group">
      <label>نوع البضاعة</label>
      <input type="text" id="goodsType" placeholder="مثال: أدوات، ملابس، إلكترونيات..." required>
    </div>
    <div class="form-group">
      <label>الوزن (كيلوجرام)</label>
      <input type="number" id="orderWeight" placeholder="50" required>
    </div>
    <div class="form-group">
      <label>السعر المقترح (ريال)</label>
      <input type="number" id="orderPrice" placeholder="1000" required>
    </div>
    <div class="form-group">
      <label>موقع الاستلام</label>
      <input type="text" id="pickupLocation" placeholder="صنعاء" required>
    </div>
    <div class="form-group">
      <label>موقع التسليم</label>
      <input type="text" id="dropLocation" placeholder="عدن" required>
    </div>
    <button type="submit" class="btn btn-primary">إنشاء الطلب</button>
  </form>
</div>
```

**Add Handler:**
```javascript
async function handleCreateOrder(event) {
  event.preventDefault();
  const order = {
    agent_id: currentUser.user_id,
    goods_type: document.getElementById('goodsType').value,
    weight: parseFloat(document.getElementById('orderWeight').value),
    price: parseFloat(document.getElementById('orderPrice').value),
    pickup_location: document.getElementById('pickupLocation').value,
    drop_location: document.getElementById('dropLocation').value,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  try {
    const resp = await fetch('/.netlify/functions/createOrder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (resp.ok) {
      showMessage('orderMessage', '✅ تم إنشاء الطلب بنجاح!');
      event.target.reset();
    } else {
      showMessage('orderMessage', '❌ فشل إنشاء الطلب', true);
    }
  } catch (e) {
    showMessage('orderMessage', '❌ خطأ في الاتصال', true);
  }
}
```

**Create Backend:** `netlify/functions/createOrder.js`
```javascript
const { google } = require('googleapis');

async function getSheetsClient() {
  let credsJson = process.env.GOOGLE_SHEETS_CREDENTIALS_B64 
    ? Buffer.from(process.env.GOOGLE_SHEETS_CREDENTIALS_B64, 'base64').toString('utf8')
    : process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  if (!credsJson) throw new Error('missing_credentials');
  
  let creds = JSON.parse(credsJson);
  if (creds.private_key.indexOf('\\n') !== -1) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  
  const jwtClient = new google.auth.JWT(
    creds.client_email, null, creds.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await jwtClient.authorize();
  return google.sheets({ version: 'v4', auth: jwtClient });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 };
  
  try {
    const payload = JSON.parse(event.body);
    const sheets = await getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Create Orders sheet if doesn't exist (optional)
    const orderId = 'ord_' + Date.now();
    const row = [
      orderId, payload.agent_id, payload.goods_type, payload.weight, 
      payload.price, payload.pickup_location, payload.drop_location, 
      'pending', payload.created_at
    ];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Orders!A:I',
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });
    
    return { statusCode: 200, body: JSON.stringify({ isOk: true, order_id: orderId }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ isOk: false, error: e.message }) };
  }
};
```

---

### **Fix 3: Implement Polling for New Orders**

**File:** `index.html` - Add to `initializeApp()`

```javascript
async function initializeApp() {
  // ... existing code ...
  
  // Poll for new orders every 5 seconds
  if (currentUser && (currentUser.role === 'driver' || currentUser.role === 'merchant')) {
    setInterval(pollNewOrders, 5000);
  }
}

async function pollNewOrders() {
  if (!currentUser) return;
  
  try {
    const endpoint = currentUser.role === 'driver' 
      ? '/.netlify/functions/getOrdersForDriver'
      : '/.netlify/functions/getOrdersForMerchant';
    
    const resp = await fetch(endpoint + '?userId=' + currentUser.user_id);
    const orders = await resp.json();
    
    if (Array.isArray(orders) && orders.length > 0) {
      // Render first order or new ones
      window.renderOrders(
        currentUser.role === 'driver' ? 'driverOrders' : 'merchantOrders',
        orders
      );
    }
  } catch (e) {
    console.log('Poll error (expected if no server):', e);
  }
}
```

---

## Part 7: Testing Checklist

- [ ] Register 3 users (1 agent, 1 merchant, 1 driver)
- [ ] Agent logs in, creates an order
- [ ] Driver logs in, sees available orders
- [ ] Driver accepts order → notification plays
- [ ] Driver marks order as picked
- [ ] Driver marks order as delivered
- [ ] Merchant receives order, confirms receipt
- [ ] After delivery, rating form appears
- [ ] Driver rating averages and updates on profile
- [ ] Admin can block/unblock users
- [ ] Admin can export user data (CSV/JSON/Print)

---

## Part 8: Recommendations

1. **Data Persistence:** Switch from Google Sheets to MongoDB or Firebase for better performance and real-time capabilities
2. **Real-time:** Implement Socket.io or Firebase Realtime Database for instant order updates
3. **Authentication:** Use JWT tokens with HTTP-only cookies instead of localStorage
4. **API Documentation:** Create OpenAPI/Swagger docs for all Netlify functions
5. **Testing:** Add unit tests for order creation, acceptance, and rating
6. **Mobile-First:** Current design is good; add PWA support for offline capability

---

## Summary

**What Works:** User authentication and admin user management  
**What's Broken:** Everything related to orders, chat, ratings, and notifications  
**Time to MVP:** 3-4 weeks (with the fix list above)

**Next Action:** Implement TIER 1 fixes starting with order creation function.

