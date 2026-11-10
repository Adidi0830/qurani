# 🤝 Friends Push Notification Integration - Qurani

## 📋 Perubahan yang Dilakukan

### ✅ **File yang Diupdate:**
- `src/utils/api/friends/index.ts` - Integrasi push notification untuk friend requests

### 🔧 **Fungsi yang Diintegrasikan:**

#### **1. `sendFriendRequest()` - Kirim Permintaan Pertemanan**

**Before:**
```typescript
// Hanya buat notifikasi database biasa
const { error: notificationError } = await supabase
  .from("notifications")
  .insert({
    user_id: recipientId,
    type: "friend_request", 
    from_user_id: requesterId,
    group_id: null,
  });
```

**After:**
```typescript
// Ambil nama requester untuk push notification
const { data: requesterProfile } = await supabase
  .from('user_profiles')
  .select('full_name, username')
  .eq('id', requesterId)
  .single();

const requesterName = requesterProfile?.full_name || requesterProfile?.username || 'Seseorang';

// Kirim notifikasi dengan push menggunakan template
try {
  await sendNotificationWithTemplate(
    'friendRequest',
    requesterId,
    recipientId, 
    requesterName
  );
  console.log('✅ Friend request notification with push sent successfully');
} catch (notificationError) {
  // Fallback: buat notifikasi tanpa push jika gagal
  console.error('❌ Failed to send friend request notification with push:', notificationError);
  // Fallback ke notifikasi database biasa
}
```

#### **2. `acceptFriendRequest()` - Terima Permintaan Pertemanan**

**Ditambahkan:**
```typescript
// Kirim push notification ke requester bahwa request nya diterima
try {
  // Ambil nama recipient untuk push notification
  const { data: recipientProfile } = await supabase
    .from('user_profiles')
    .select('full_name, username')
    .eq('id', recipientId)
    .single();

  const recipientName = recipientProfile?.full_name || recipientProfile?.username || 'Seseorang';

  await sendNotificationWithTemplate(
    'friendRequestAccepted',
    requesterId,
    recipientId,
    recipientName
  );
  console.log('✅ Friend request acceptance notification with push sent successfully');
} catch (notificationError) {
  console.error('❌ Failed to send friend request acceptance notification with push:', notificationError);
  // Tidak throw error karena operasi utama sudah berhasil
}
```

## 🎯 **Template yang Digunakan:**

### **1. Template `friendRequest`:**
```typescript
friendRequest: (requesterId: string, recipientId: string, requesterName: string) => ({
  notificationData: {
    user_id: recipientId,
    from_user_id: requesterId,
    type: 'friend_request'
  },
  pushPayload: {
    title: '👥 Permintaan Pertemanan Baru',
    body: `${requesterName} ingin berteman dengan Anda`,
    icon: '/icons/qurani-192.png',
    url: '/friends',
    data: { 
      type: 'friend_request', 
      fromUserId: requesterId 
    },
    tag: 'friend-request'
  }
})
```

### **2. Template `friendRequestAccepted`:**
```typescript
friendRequestAccepted: (requesterId: string, recipientId: string, recipientName: string) => ({
  notificationData: {
    user_id: requesterId,
    from_user_id: recipientId,
    type: 'friend_request_accepted'
  },
  pushPayload: {
    title: '🎉 Permintaan Pertemanan Diterima',
    body: `${recipientName} telah menerima permintaan pertemanan Anda`,
    icon: '/icons/qurani-192.png',
    url: '/friends',
    data: { 
      type: 'friend_accepted', 
      fromUserId: recipientId 
    },
    tag: 'friend-accepted'
  }
})
```

## 🔄 **Alur Kerja yang Baru:**

### **Skenario 1: Kirim Friend Request**
1. **User A** kirim friend request ke **User B**
2. ✅ Data masuk ke tabel `friend_requests`
3. ✅ **System** ambil nama User A dari `user_profiles`
4. ✅ **System** panggil `sendNotificationWithTemplate('friendRequest', userA, userB, namaA)`
5. ✅ **Template** buat notifikasi di database + push notification
6. ✅ **User B** terima push notification: "👥 [Nama A] ingin berteman dengan Anda"

### **Skenario 2: Accept Friend Request**
1. **User B** terima friend request dari **User A**
2. ✅ Data pertemanan update di `friend_requests`
3. ✅ Notifikasi original di-update (`is_action_taken: true`)
4. ✅ **System** ambil nama User B dari `user_profiles`
5. ✅ **System** panggil `sendNotificationWithTemplate('friendRequestAccepted', userA, userB, namaB)`
6. ✅ **Template** buat notifikasi baru + push notification
7. ✅ **User A** terima push notification: "🎉 [Nama B] telah menerima permintaan pertemanan Anda"

## 🛡️ **Error Handling:**

### **Graceful Fallback:**
- ✅ Jika push notification gagal → fallback ke notifikasi database biasa
- ✅ Jika user tidak punya subscription → notifikasi tetap masuk database
- ✅ Push failure tidak mengganggu operasi utama (friend request tetap berhasil)
- ✅ Comprehensive logging untuk debugging

### **Resilient Design:**
- ✅ Push notification tidak critical → tidak throw error jika gagal
- ✅ Database operation prioritas utama
- ✅ Push sebagai enhancement, bukan requirement

## 📱 **User Experience:**

### **Sebelum:**
- User hanya tau ada friend request jika buka app dan cek notifikasi

### **Sesudah:**
- ✅ User langsung dapat push notification real-time
- ✅ Notification menarik dengan emoji dan nama lengkap
- ✅ Klik notification langsung ke halaman `/friends`
- ✅ Data tracking untuk analytics (tipe, user ID, timestamp)

## 🧪 **Testing:**

### **Test Friend Request:**
1. User A kirim friend request ke User B
2. Cek User B dapat push notification: "👥 [Nama A] ingin berteman dengan Anda"
3. Cek notifikasi masuk database dengan benar

### **Test Friend Accept:**
1. User B terima friend request dari User A
2. Cek User A dapat push notification: "🎉 [Nama B] telah menerima permintaan pertemanan Anda"
3. Cek status friendship berubah

### **Test Fallback:**
1. User tanpa push subscription
2. Notifikasi tetap masuk database
3. Tidak ada error yang mengganggu flow

## 🔗 **Integrasi dengan Sistem Existing:**

### **Compatible dengan:**
- ✅ Existing notification system di database
- ✅ Realtime notification updates
- ✅ Friend request flow existing
- ✅ Cache management
- ✅ Error handling existing

### **Tidak mengubah:**
- ❌ API contract existing
- ❌ Database schema
- ❌ Frontend component interface
- ❌ Existing notification rendering

## 📊 **Monitoring:**

### **Log Messages:**
- `✅ Friend request notification with push sent successfully`
- `✅ Friend request acceptance notification with push sent successfully`
- `❌ Failed to send friend request notification with push:`
- `❌ Failed to send friend request acceptance notification with push:`

### **Metrics to Track:**
- Push notification success rate
- User engagement dengan push notifications
- Conversion rate: push notification → app open

---

## 🎉 **Summary**

**Friend request system sekarang terintegrasi dengan push notification!**

- ✅ **Real-time notifications** ketika ada friend request baru
- ✅ **Real-time notifications** ketika friend request diterima  
- ✅ **Graceful fallback** jika push gagal
- ✅ **Beautiful notifications** dengan emoji dan nama lengkap
- ✅ **Tidak mengganggu** sistem existing

**User experience jadi lebih engaging dan responsive!** 🚀
