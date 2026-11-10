# 🏠 Group Invitation Push Notification Integration - Qurani

## 📋 Perubahan yang Dilakukan

### ✅ **File yang Diupdate:**
- `src/utils/api/notifikasi/insert.ts` - Tambah fungsi `sendGroupInviteNotification`
- `src/utils/api/grup/members.ts` - Update fungsi `inviteMember` untuk integrasi push

### 🔧 **Fungsi Baru yang Dibuat:**

#### **1. `sendGroupInviteNotification()` - Kirim Undangan Grup dengan Push**

**Lokasi:** `src/utils/api/notifikasi/insert.ts`

**Signature:**
```typescript
export async function sendGroupInviteNotification(
  username: string,
  groupId: string,
  inviterId?: string
)
```

**Fungsi:**
```typescript
// 1. Cari user berdasarkan username
const { data: inviteeUser } = await supabase
  .from('user_profiles')
  .select('id, full_name, username')
  .eq('username', username)
  .single()

// 2. Ambil data grup
const { data: groupData } = await supabase
  .from('grup')
  .select('id, name, owner_id')
  .eq('id', groupId)
  .single()

// 3. Tentukan inviter (default: owner grup)
const actualInviterId = inviterId || groupData.owner_id

// 4. Ambil nama inviter untuk push notification
const { data: inviterData } = await supabase
  .from('user_profiles')
  .select('full_name, username')
  .eq('id', actualInviterId)
  .single()

// 5. Cek apakah user sudah menjadi anggota
const { data: existingMember } = await supabase
  .from('grup_members')
  .select('id')
  .eq('grup_id', groupId)
  .eq('user_id', inviteeUser.id)
  .single()

// 6. Kirim notifikasi dengan push menggunakan template
const result = await sendNotificationWithTemplate(
  'groupInvite',
  actualInviterId,
  inviteeUser.id,
  groupId,
  inviterName,
  groupData.name
)
```

#### **2. `inviteMember()` - Update dengan Push Integration**

**Lokasi:** `src/utils/api/grup/members.ts`

**Before:**
```typescript
export async function inviteMember(username: string, groupId: string) {
  const notificationResult = await sendGroupInviteNotification(username, groupId);
  
  if (notificationResult.error) {
    return { status: "error", message: "Failed to send invitation" };
  }
  
  return { status: "success", message: "Invitation sent" };
}
```

**After:**
```typescript
export async function inviteMember(username: string, groupId: string, inviterId?: string) {
  const notificationResult = await sendGroupInviteNotification(
    username,
    groupId,
    inviterId  // Parameter baru untuk flexibility
  );

  if (!notificationResult.success) {
    return {
      status: "error",
      message: notificationResult.error || "Failed to send invitation",
    };
  }

  return {
    status: "success",
    message: notificationResult.message || "Invitation sent successfully",
    data: notificationResult.result  // Tambahan data result
  };
}
```

## 🎯 **Template yang Digunakan:**

### **Template `groupInvite`:**
```typescript
groupInvite: (inviterId: string, inviteeId: string, groupId: string, inviterName: string, groupName: string) => ({
  notificationData: {
    user_id: inviteeId,
    from_user_id: inviterId,
    type: 'group_invite',
    group_id: groupId
  },
  pushPayload: {
    title: '🏠 Undangan Grup Baru',
    body: `${inviterName} mengundang Anda ke grup "${groupName}"`,
    icon: '/icons/qurani-192.png',
    url: '/groups',
    data: { 
      type: 'group_invite', 
      fromUserId: inviterId,
      groupId 
    },
    tag: 'group-invite'
  }
})
```

## 🔄 **Alur Kerja yang Baru:**

### **Skenario: Admin Undang Member Baru**
1. **Admin A** input username untuk diundang ke **Grup Hafalan**
2. ✅ **System** validasi username exists di database
3. ✅ **System** validasi grup exists dan get nama grup
4. ✅ **System** cek user belum jadi member grup
5. ✅ **System** ambil nama Admin A untuk push notification
6. ✅ **System** panggil `sendNotificationWithTemplate('groupInvite', ...)`
7. ✅ **Template** buat notifikasi di database + push notification
8. ✅ **User** terima push notification: "🏠 [Admin A] mengundang Anda ke grup '[Nama Grup]'"
9. ✅ **User** klik notification → redirect ke `/groups`

## 🛡️ **Validasi & Error Handling:**

### **Validasi yang Dilakukan:**
- ✅ **Username exists** - cek di tabel `user_profiles`
- ✅ **Group exists** - cek di tabel `grup`
- ✅ **User belum member** - cek di tabel `grup_members`
- ✅ **Inviter valid** - cek di tabel `user_profiles`

### **Error Handling:**
```typescript
// Error responses yang mungkin:
{
  success: false,
  error: "User dengan username @johndoe tidak ditemukan"
}

{
  success: false,
  error: "Grup tidak ditemukan"
}

{
  success: false,
  error: "@johndoe sudah menjadi anggota grup Hafalan Al-Quran"
}

{
  success: false,
  error: "Data undangan tidak valid"
}
```

### **Success Response:**
```typescript
{
  success: true,
  message: "Undangan grup berhasil dikirim ke @johndoe",
  result: {
    notification: { id: "...", ... },
    pushResult: { success: true, ... }
  }
}
```

## 🔧 **Flexibility & Parameters:**

### **Parameter `inviterId` (Optional):**
- **Jika disediakan** → gunakan sebagai pengirim undangan
- **Jika kosong** → gunakan owner grup sebagai default
- **Use case:** Admin non-owner juga bisa invite dengan nama mereka

### **Usage Examples:**
```typescript
// Owner grup invite (default)
await inviteMember("johndoe", "grup-123")

// Admin non-owner invite (dengan nama admin)
await inviteMember("johndoe", "grup-123", "admin-456")
```

## 📱 **User Experience:**

### **Sebelum:**
- User hanya tau ada undangan grup jika buka app dan cek notifikasi
- Notifikasi polos tanpa nama inviter dan nama grup

### **Sesudah:**
- ✅ **Real-time push notification** langsung ke device
- ✅ **Rich notification** dengan nama inviter dan nama grup
- ✅ **Emoji visual** (🏠) untuk menarik perhatian
- ✅ **Deep linking** ke halaman groups ketika diklik
- ✅ **Context data** untuk tracking dan analytics

## 🧪 **Testing:**

### **Test Normal Flow:**
```typescript
// 1. Test dengan username valid
const result = await inviteMember("johndoe", "grup-123", "admin-456")
// Expected: success, push notification terkirim

// 2. Test dengan username invalid
const result = await inviteMember("usernotfound", "grup-123")  
// Expected: error "User tidak ditemukan"

// 3. Test dengan user sudah member
const result = await inviteMember("existingmember", "grup-123")
// Expected: error "sudah menjadi anggota grup"
```

### **Test Push Notification:**
1. Admin invite user yang punya push subscription
2. Cek user dapat push notification dengan format: "🏠 [Admin Name] mengundang Anda ke grup '[Group Name]'"
3. Klik notification → redirect ke `/groups`
4. Cek notifikasi masuk database dengan data yang benar

### **Test Error Cases:**
1. Username tidak exist → error message yang jelas
2. Grup tidak exist → error handling proper
3. User sudah member → informasi yang informatif
4. Network/database error → graceful error handling

## 🔗 **Integrasi dengan Sistem Existing:**

### **Compatible dengan:**
- ✅ Existing group management system
- ✅ Notification system di database
- ✅ Group member management
- ✅ User profile system
- ✅ Realtime notification updates

### **Tidak mengubah:**
- ❌ Database schema existing
- ❌ Frontend component interface
- ❌ Existing group invitation flow
- ❌ Permission & role system

## 📊 **Data Tracking:**

### **Notification Data:**
```sql
-- Tabel notifications
user_id: "invited-user-id"
from_user_id: "inviter-id" 
type: "group_invite"
group_id: "grup-123"
is_read: false
is_action_taken: false
```

### **Push Payload Data:**
```javascript
{
  type: 'group_invite',
  fromUserId: 'inviter-id',
  groupId: 'grup-123',
  timestamp: 1640995200000
}
```

## 📈 **Monitoring & Logs:**

### **Success Logs:**
- `✅ Group invite notification with push sent to @username`

### **Error Logs:**
- `❌ Error in sendGroupInviteNotification: [error details]`

### **Metrics to Track:**
- Group invitation success rate
- Push notification delivery rate
- User acceptance rate dari push notifications
- Time from invitation to group join

---

## 🎉 **Summary**

**Group invitation system sekarang terintegrasi dengan push notification!**

- ✅ **Real-time notifications** ketika diundang ke grup
- ✅ **Rich notifications** dengan nama inviter dan grup
- ✅ **Comprehensive validation** dan error handling
- ✅ **Flexible inviter** (owner atau admin)
- ✅ **Deep linking** ke halaman groups
- ✅ **Backward compatible** dengan sistem existing

**User engagement dan group management jadi lebih efektif!** 🚀
