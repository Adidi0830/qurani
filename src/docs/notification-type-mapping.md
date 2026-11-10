# 🔄 Notification Type Mapping - Qurani Push System

## 📋 Strategy: Gunakan Tipe Existing Supabase

Untuk menjaga konsistensi dengan constraint database yang sudah ada, sistem push notification menggunakan **mapping** ke 3 tipe yang sudah didukung Supabase:

- ✅ `friend_request`
- ✅ `group_invite`
- ✅ `recap_notification`

## 🗺️ **Mapping Template ke Database Type**

### **Friend-Related Notifications:**

```typescript
// Template: friendRequest
friendRequest → 'friend_request' ✅
// Ketika ada permintaan pertemanan baru

// Template: friendRequestAccepted
friendRequestAccepted → 'friend_request' ✅
// Ketika permintaan pertemanan diterima (same type, different context)
```

### **Group-Related Notifications:**

```typescript
// Template: groupInvite
groupInvite → 'group_invite' ✅
// Ketika diundang ke grup
```

### **Recap & System Notifications:**

```typescript
// Template: newRecap
newRecap → 'recap_notification' ✅
// Setoran hafalan baru

// Template: memorationReminder
memorationReminder → 'recap_notification' ✅
// Reminder setoran (system notification)

// Template: test
test → 'recap_notification' ✅
// Test notification (system notification)

// Template: custom
custom → 'recap_notification' ✅
// Custom notification (system notification)
```

## 🎯 **Context Differentiation**

Walaupun menggunakan tipe database yang sama, setiap notification tetap memiliki **context yang berbeda** melalui:

### **1. Push Payload Data:**

```javascript
// Friend Request
data: { type: 'friend_request', fromUserId: '...' }

// Friend Request Accepted
data: { type: 'friend_accepted', fromUserId: '...' }

// Group Invite
data: { type: 'group_invite', fromUserId: '...', groupId: '...' }

// Recap Notification
data: { type: 'new_recap', recapId: ..., reciterId: '...' }

// Test Notification
data: { type: 'test', timestamp: ... }
```

### **2. Push Notification Title & Body:**

```javascript
// Friend Request
title: "👥 Permintaan Pertemanan Baru";
body: "[Nama] ingin berteman dengan Anda";

// Friend Request Accepted
title: "🎉 Permintaan Pertemanan Diterima";
body: "[Nama] telah menerima permintaan pertemanan Anda";

// Group Invite
title: "🏠 Undangan Grup Baru";
body: '[Nama] mengundang Anda ke grup "[Grup]"';
```

### **3. URL Routing:**

```javascript
// Friend-related: /friends
// Group-related: /groups
// Recap-related: /setoran atau /recaps
```

## ✅ **Benefits of This Approach**

### **1. Database Compatibility:**

- ✅ Tidak perlu mengubah constraint database
- ✅ Tidak ada breaking changes pada sistem existing
- ✅ Backward compatible dengan notifikasi lama

### **2. Semantic Clarity:**

- ✅ Context tetap jelas melalui push payload
- ✅ Frontend bisa membedakan jenis notifikasi
- ✅ Analytics dan tracking tetap akurat

### **3. Performance:**

- ✅ Menggunakan index yang sudah ada
- ✅ Query performance optimal
- ✅ No additional database overhead

### **4. Maintenance:**

- ✅ Consistent dengan sistem yang sudah ada
- ✅ Mudah di-maintain dan debug
- ✅ Clear separation of concerns

## 🔍 **Implementation Example**

### **Database Record:**

```sql
-- Semua ini disimpan dengan tipe yang sama di database
INSERT INTO notifications (user_id, from_user_id, type) VALUES
('user1', 'user2', 'friend_request'),     -- Friend request
('user2', 'user1', 'friend_request'),     -- Friend accepted
('user3', 'user1', 'group_invite'),       -- Group invitation
('user1', 'user2', 'recap_notification'), -- Recap notification
('user1', NULL,    'recap_notification'); -- System reminder
```

### **Push Notification Differentiation:**

```javascript
// Frontend dapat membedakan berdasarkan push payload:
if (data.type === "friend_request") {
  // Handle friend request
} else if (data.type === "friend_accepted") {
  // Handle friend acceptance
} else if (data.type === "group_invite") {
  // Handle group invitation
} else if (data.type === "new_recap") {
  // Handle recap notification
}
```

## 📊 **Type Distribution**

### **Current Database (After Mapping):**

- `friend_request`: Friend requests + Friend acceptances
- `group_invite`: Group invitations only
- `recap_notification`: Recaps + Reminders + System notifications

### **Push Context Distribution:**

- `friend_request`: Pure friend requests
- `friend_accepted`: Friend request acceptances
- `group_invite`: Group invitations
- `new_recap`: Setoran hafalan notifications
- `memorization_reminder`: System reminders
- `test`: Test notifications
- `custom`: Custom notifications

## 🎨 **Frontend Handling**

### **Notification List Rendering:**

```typescript
const renderNotification = (notification, pushData) => {
  // Database type for filtering/grouping
  const dbType = notification.type; // 'friend_request', 'group_invite', etc.

  // Push context for specific handling
  const pushType = pushData?.type; // 'friend_request', 'friend_accepted', etc.

  if (dbType === "friend_request") {
    if (pushType === "friend_accepted") {
      return <FriendAcceptedNotification />;
    } else {
      return <FriendRequestNotification />;
    }
  }
  // ... other types
};
```

## 🔧 **Migration Impact**

### **✅ No Breaking Changes:**

- Database constraint unchanged
- Existing notifications still work
- Frontend compatibility maintained

### **✅ Enhanced Functionality:**

- Push notifications now work with existing types
- Rich context through push payload
- Better user experience with real-time notifications

## 📈 **Success Metrics**

**After Implementation:**

- ✅ All push notifications use valid database types
- ✅ No constraint violations in logs
- ✅ Context differentiation working properly
- ✅ User experience enhanced with real-time push
- ✅ System stability maintained

---

## 🎯 **Summary**

**Mapping Strategy**: ✅ **Optimal Solution**

- Uses existing database types
- Maintains semantic clarity through push payload
- No breaking changes
- Enhanced user experience

**Implementation Status**: ✅ **Ready to Deploy**

- Code updated to use mapped types
- Documentation complete
- Migration simplified (indexes only)
- Testing ready

**This approach gives us the best of both worlds: database compatibility and rich push notification functionality!** 🚀
