# 🔄 Push Notification Migration - Qurani

## 📋 Perubahan yang Dilakukan

### ❌ **Yang Dihapus:**

- Folder `src/app/api/push/` beserta semua isinya
- Endpoint `/api/push/send-to-user`
- Endpoint `/api/push/send-to-multiple`
- Endpoint `/api/push/process-pending`
- Endpoint `/api/push/send-template`

### ✅ **Yang Ditambahkan:**

#### **1. `src/utils/api/notifikasi/insert.ts`**

File utama untuk menangani push notification dengan fungsi:

- ✅ `sendPushToUser()` - Kirim push ke user tunggal
- ✅ `createNotificationWithPush()` - Buat notifikasi + push sekaligus
- ✅ `sendNotificationWithTemplate()` - Kirim dengan template
- ✅ `sendNotificationToMultipleUsers()` - Kirim ke multiple users
- ✅ `checkUserHasSubscription()` - Cek subscription user

#### **2. Templates Notifikasi:**

- ✅ `newRecap` - Setoran hafalan baru
- ✅ `friendRequest` - Permintaan pertemanan
- ✅ `friendRequestAccepted` - Pertemanan diterima
- ✅ `groupInvite` - Undangan grup
- ✅ `memorationReminder` - Reminder setoran
- ✅ `test` - Test notification
- ✅ `custom` - Notifikasi custom

#### **3. `src/app/api/test-push/route.ts`**

Endpoint sederhana untuk testing:

- `POST /api/test-push` - Test kirim notifikasi
- `GET /api/test-push?userId=xxx` - Cek subscription user

#### **4. Integration dengan Existing System:**

- ✅ Update `create-recap-notification.ts` untuk auto-kirim push
- ✅ Integrasi dengan tabel `notifications` dan `user_push_subscriptions`

## 🚀 Cara Penggunaan Baru

### **1. Test Notification:**

```javascript
const response = await fetch("/api/test-push", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5",
  }),
});
```

### **2. Custom Notification:**

```javascript
const response = await fetch("/api/test-push", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5",
    template: "custom",
    title: "🕌 Reminder Setoran",
    message: "Jangan lupa setoran hafalan hari ini ya!",
    url: "/setoran",
  }),
});
```

### **3. Dari Server-Side (Recommended):**

```typescript
import { sendNotificationWithTemplate } from "@/utils/api/notifikasi/insert";

// Test notification
await sendNotificationWithTemplate("test", userId);

// Custom notification
await sendNotificationWithTemplate("custom", userId, title, message, icon, url);

// Setoran hafalan baru (otomatis dipanggil di create-recap-notification.ts)
await sendNotificationWithTemplate(
  "newRecap",
  reciterId,
  examinerId,
  recapId,
  reciterName
);
```

### **4. Cek User Subscription:**

```javascript
const response = await fetch(`/api/test-push?userId=${userId}`);
const data = await response.json();

console.log("Has subscription:", data.hasSubscription);
console.log("Subscription count:", data.subscriptionCount);
```

## 🎯 **Keuntungan Struktur Baru:**

### **✅ Lebih Terintegrasi:**

- Push notification otomatis terintegrasi dengan sistem notifikasi existing
- Tidak perlu endpoint terpisah untuk setiap fungsi
- Semua logic terpusat di `utils/api/notifikasi/`

### **✅ Lebih Mudah Maintenance:**

- Satu file untuk semua template notifikasi
- Consistent dengan struktur folder Qurani existing
- Server-side functions untuk keamanan

### **✅ Auto-Integration:**

- Ketika ada setoran hafalan baru → otomatis kirim push
- Ketika ada friend request → bisa mudah ditambah push
- Template system yang flexible

### **✅ Better Error Handling:**

- Comprehensive logging
- Automatic cleanup invalid subscriptions
- Graceful fallback jika push gagal

## 🔧 **Setup Environment:**

Pastikan environment variables sudah ada:

```env
# Public (Client-side)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key

# Private (Server-side only)
VAPID_PRIVATE_KEY=your_vapid_private_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📱 **Testing:**

### **1. Cek User Subscription:**

```bash
curl "http://localhost:3000/api/test-push?userId=25b360bf-7ee4-4ad9-8b82-bca85d26fdb5"
```

### **2. Test Push Notification:**

```bash
curl -X POST http://localhost:3000/api/test-push \
  -H "Content-Type: application/json" \
  -d '{"userId": "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5"}'
```

### **3. Custom Notification:**

```bash
curl -X POST http://localhost:3000/api/test-push \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5",
    "template": "custom",
    "title": "🕌 Test Custom",
    "message": "Ini adalah test notifikasi custom"
  }'
```

## 🎨 **Admin Interface:**

Admin interface di `/admin/push-notifications` masih bisa digunakan, tapi sekarang menggunakan endpoint `/api/test-push` yang lebih sederhana.

## 🔄 **Migration Complete:**

- ❌ Folder `/api/push/` dihapus
- ✅ Logic dipindah ke `utils/api/notifikasi/insert.ts`
- ✅ Integrasi dengan sistem existing di `create-recap-notification.ts`
- ✅ Endpoint testing di `/api/test-push`
- ✅ Template system yang flexible
- ✅ Auto-push untuk setoran hafalan baru

**Sistem push notification sekarang lebih terintegrasi dan mudah di-maintain!** 🎉
