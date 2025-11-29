# Wassel Project - Quick Reference Guide

**For:** Developers implementing remaining features  
**Last Updated:** November 29, 2025

---

## 🎯 What's Implemented

### ✅ User System (100%)
- Registration with 3 roles (Agent, Merchant, Driver)
- Login/Logout
- Admin authentication
- User blocking/unblocking
- User editing
- User export (CSV, JSON, Print)

### ✅ Order Creation (100%)
- Agent creates orders via form
- Backend stores in Google Sheets
- Unique order ID assignment
- Status tracking starts at "pending"

### ✅ Order Retrieval (100%)
- `getOrdersByAgent.js` - Get orders by agent
- `getAvailableOrders.js` - Get pending orders for drivers
- `updateOrderStatus.js` - Change order status

### ⚠️ Order Notifications (50%)
- `notification.mp3` file exists
- `handleSystemOrder()` function ready
- Polling mechanism needs to be added

---

## ❌ What's NOT Implemented Yet

| Feature | Frontend | Backend | Priority |
|---------|----------|---------|----------|
| Driver accepts orders | ❌ | ✅ | CRITICAL |
| View accepted orders | ❌ | ✅ | CRITICAL |
| Mark order picked | ❌ | ✅ | HIGH |
| Mark order delivered | ❌ | ✅ | HIGH |
| Chat system | ❌ | ❌ | HIGH |
| Rating system | ❌ | ❌ | HIGH |
| Payment | ❌ | ❌ | MEDIUM |
| GPS tracking | ❌ | ❌ | MEDIUM |

---

## 📡 API Reference

### Order APIs

#### 1. Create Order
```javascript
POST /.netlify/functions/createOrder
Body: {
  "agent_id": "user_123",
  "goods_type": "أدوات كهربائية",
  "weight": 50,
  "price": 1500,
  "pickup_location": "صنعاء",
  "drop_location": "عدن",
  "created_at": "2025-11-29T12:00:00Z"
}
Response: { isOk: true, order: { order_id: "ORD-...", ... } }
```

#### 2. Get Orders by Agent
```javascript
GET /.netlify/functions/getOrdersByAgent?agent_id=user_123
Response: [
  {
    "order_id": "ORD-...",
    "agent_id": "user_123",
    "status": "pending",
    ...
  },
  ...
]
```

#### 3. Get Available Orders (for Drivers)
```javascript
GET /.netlify/functions/getAvailableOrders
Response: [
  {
    "order_id": "ORD-...",
    "status": "pending",
    "goods_type": "ملابس",
    "pickup_location": "صنعاء",
    "drop_location": "عدن",
    "price": 1500,
    ...
  },
  ...
]
```

#### 4. Update Order Status
```javascript
POST /.netlify/functions/updateOrderStatus
Body: {
  "order_id": "ORD-...",
  "new_status": "accepted",
  "driver_id": "user_driver_123"
}
Response: { isOk: true, message: "Order updated..." }
```

---

## 🎨 Frontend Components

### Order Card (Already Implemented)
```javascript
window.renderOrders(containerId, ordersArray);
window.handleSystemOrder(orderObject, roleName);
```

**Example:**
```javascript
const order = {
  order_id: 'ORD-123-ABC',
  status: 'طلب جديد',
  customer: 'أحمد محمد',
  items: '5 قطع',
  total: '1500 ريال',
  date: 'اليوم'
};
window.renderOrders('driverOrders', [order]);
```

### Dashboard Elements
- `#agentOrders` - Agent's orders container
- `#merchantOrders` - Merchant's orders container
- `#driverOrders` - Driver's orders container

---

## 🔧 How to Implement Driver Order Acceptance

### Step 1: Add Polling to Driver Dashboard

**File:** `index.html`  
**Function:** `initializeApp()` (around line 1579)

```javascript
async function initializeApp() {
  // ... existing code ...
  
  // Add polling for drivers
  if (currentUser && currentUser.role === 'driver') {
    // Load available orders immediately
    await loadAvailableOrders();
    // Poll every 5 seconds
    setInterval(loadAvailableOrders, 5000);
  }
}

async function loadAvailableOrders() {
  try {
    const resp = await fetch('/.netlify/functions/getAvailableOrders');
    const orders = await resp.json();
    
    if (Array.isArray(orders)) {
      // Convert to display format
      const displayOrders = orders.map(o => ({
        order_id: o.order_id,
        status: 'طلب جديد',
        from: o.pickup_location,
        to: o.drop_location,
        total: o.price + ' ريال',
        date: new Date(o.created_at).toLocaleDateString('ar-YE'),
        actions: [
          {
            label: 'قبول الطلب',
            onClick: () => handleAcceptOrder(o.order_id)
          }
        ]
      }));
      
      window.renderOrders('driverOrders', displayOrders);
      
      // Check if there are new orders and play notification
      if (orders.length > 0) {
        const audio = new Audio('notification.mp3');
        audio.play().catch(() => {}); // Ignore autoplay errors
      }
    }
  } catch (e) {
    console.log('Order load failed (expected if no server):', e);
  }
}
```

### Step 2: Add Accept Order Handler

**File:** `index.html`  
**Add After:** `handleCreateOrder()` function

```javascript
async function handleAcceptOrder(orderId) {
  if (!currentUser || currentUser.role !== 'driver') {
    alert('فقط السائقين يمكنهم قبول الطلبات');
    return;
  }

  // Show confirmation
  const confirmed = confirm('هل تأكد من قبول هذا الطلب؟');
  if (!confirmed) return;

  try {
    const resp = await fetch('/.netlify/functions/updateOrderStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: orderId,
        new_status: 'accepted',
        driver_id: currentUser.user_id
      })
    });

    const result = await resp.json();

    if (result.isOk) {
      alert('✅ تم قبول الطلب! يمكنك الآن بدء الرحلة.');
      // Reload available orders
      await loadAvailableOrders();
      // Load accepted orders
      await loadAcceptedOrders();
    } else {
      alert('❌ فشل قبول الطلب: ' + (result.error?.message || 'خطأ غير معروف'));
    }
  } catch (error) {
    console.error('Accept order error:', error);
    alert('❌ خطأ في الاتصال. حاول مرة أخرى');
  }
}
```

### Step 3: Show Accepted Orders

**Create new function:**
```javascript
async function loadAcceptedOrders() {
  try {
    // Get orders accepted by this driver (status='accepted' and driver_id=current user)
    const resp = await fetch('/.netlify/functions/getOrdersByAgent?agent_id=' + currentUser.user_id);
    // ^ This will need a new function: getOrdersByDriver that filters by driver_id and status='accepted'
    
    const orders = await resp.json();
    // Display in separate section
  } catch (e) {
    console.log('Load accepted orders failed:', e);
  }
}
```

---

## 📊 Database Structure

### Orders Sheet (Google Sheets)
| Col | Field | Type | Example |
|-----|-------|------|---------|
| A | order_id | String | ORD-1732901234567-ABC12 |
| B | agent_id | String | user_1732900000000_abc123 |
| C | merchant_id | String | user_1732900000000_def456 |
| D | goods_type | String | أدوات كهربائية |
| E | weight | Number | 50 |
| F | price | Number | 1500 |
| G | pickup_location | String | صنعاء |
| H | drop_location | String | عدن |
| I | status | String | pending / accepted / picked / delivered |
| J | created_at | String | 2025-11-29T12:00:00Z |
| K | driver_id | String | user_1732900000000_xyz789 |

---

## 🔄 Order Status Flow

```
pending (created by agent)
   ↓
accepted (driver accepts)
   ↓
picked (driver picks up goods)
   ↓
delivered (driver delivers)
   ↓
confirmed (merchant confirms receipt)
   ↓ (optional)
rated (driver rated by merchant/agent)
```

---

## 🧪 Quick Testing

### Test 1: Create Order as Agent
```
1. Register with phone 777123456, password test123, role وكيل
2. Login
3. Fill order form:
   - Goods: ملابس
   - Weight: 100
   - Price: 2000
   - From: صنعاء
   - To: عدن
4. Click إنشاء الطلب
5. ✅ Should show order ID
6. Check Google Sheets
```

### Test 2: View Available Orders as Driver
```
1. Register with phone 777654321, password test123, role سائق
2. Login
3. Go to Driver Dashboard
4. Available orders should appear (or implement Step 1-2 above)
5. Click قبول الطلب
6. ✅ Should move to accepted orders
7. Check Google Sheets - status changed to 'accepted'
```

---

## 🐛 Common Issues

### Issue: Orders not appearing in Driver Dashboard
**Solution:** Make sure polling is implemented (Step 1 above)

### Issue: Order doesn't save to Google Sheets
**Solution:** Check environment variables are set in Netlify

### Issue: Accept button doesn't work
**Solution:** Verify updateOrderStatus.js is deployed; check browser console for errors

### Issue: Notification.mp3 doesn't play
**Solution:** Autoplay policy requires user interaction first; click anywhere on page after login

---

## 📚 Files to Modify for TIER 2

| File | Change | Lines |
|------|--------|-------|
| index.html | Add polling to initializeApp | ~1620 |
| index.html | Add loadAvailableOrders function | New |
| index.html | Add handleAcceptOrder function | New |
| index.html | Update Driver Dashboard HTML | ~1480 |

---

## 🚀 Deployment Steps

1. **Create new backend functions** in `netlify/functions/`
2. **Update `index.html`** with new frontend code
3. **Test locally** (if using netlify dev)
4. **Commit and push** to GitHub
5. **Netlify auto-deploys** from main branch
6. **Check Netlify logs** for function errors
7. **Test in production** on wassel.netlify.app

---

## 💬 Need Help?

- **API not working?** Check Netlify function logs
- **Frontend not updating?** Clear browser cache, check console
- **Google Sheets not updating?** Verify credentials and ADMIN_PERMISSION
- **Questions?** See AUDIT_REPORT.md and IMPLEMENTATION_STATUS.md

