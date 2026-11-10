# 🔔 Web Push Notification System - Qurani

## 📋 Overview

Sistem push notification yang terintegrasi dengan Supabase untuk mengirim notifikasi real-time ke pengguna Qurani. Mendukung berbagai skenario notifikasi seperti friend request, group invite, recap notification, dan lainnya.

## 🗂️ File Structure

```
src/
├── lib/
│   ├── registerPush.js          # Client-side registration
│   ├── webPush.js              # Server-side push utilities
│   └── notificationIntegration.js # Integration dengan sistem existing
├── app/api/push/
│   ├── send-to-user/route.js    # Kirim ke user tunggal
│   ├── send-to-multiple/route.js # Kirim ke multiple users
│   ├── process-pending/route.js  # Process pending notifications
│   └── send-template/route.js    # Kirim dengan template
├── components/
│   ├── admin/PushNotificationSender.jsx # Admin interface
│   ├── AutoNotificationPrompt.jsx       # Auto-prompt modal
│   └── SimpleAutoNotificationPrompt.jsx # Toast prompt
└── app/admin/push-notifications/page.tsx # Admin page
```

## 🔧 Setup & Environment Variables

### Required Environment Variables

```env
# Public (Client-side)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Private (Server-side only)
VAPID_PRIVATE_KEY=your_vapid_private_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

### Install Dependencies

```bash
npm install web-push
```

## 📊 Database Schema

Tabel yang sudah ada:

- `user_push_subscriptions` - Menyimpan subscription data user
- `notifications` - Sistem notifikasi existing

## 🚀 Cara Penggunaan

### 1. **Kirim Notifikasi ke User Tunggal**

```javascript
// Via API
const response = await fetch("/api/push/send-to-user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5",
    title: "🕌 Reminder Setoran",
    message: "Jangan lupa setoran hafalan hari ini ya!",
    icon: "/icons/qurani-192.png",
    url: "/setoran",
  }),
});

// Via Function
import { sendPushToUser } from "@/lib/webPush";

const result = await sendPushToUser(userId, {
  title: "🕌 Reminder Setoran",
  body: "Jangan lupa setoran hafalan hari ini ya!",
  icon: "/icons/qurani-192.png",
  url: "/setoran",
});
```

### 2. **Kirim ke Multiple Users**

```javascript
const response = await fetch("/api/push/send-to-multiple", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userIds: ["user-id-1", "user-id-2", "user-id-3"],
    title: "📢 Pengumuman",
    message: "Ada fitur baru di Qurani!",
    icon: "/icons/qurani-192.png",
    url: "/setoran",
  }),
});
```

### 3. **Broadcast ke Semua User**

```javascript
const response = await fetch("/api/push/send-to-multiple", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sendToAll: true,
    title: "🎉 Update Besar!",
    message: "Qurani telah diperbarui dengan fitur-fitur baru!",
    icon: "/icons/qurani-192.png",
    url: "/setoran",
  }),
});
```

### 4. **Menggunakan Template Notifikasi**

```javascript
// Kirim notifikasi setoran hafalan baru
const response = await fetch("/api/push/send-template", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    template: "newRecap",
    reciterId: "user-id-1",
    examinerId: "user-id-2",
    recapId: "recap-123",
  }),
});

// Kirim friend request accepted
const response = await fetch("/api/push/send-template", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    template: "friendRequestAccepted",
    requesterId: "user-id-1",
    recipientId: "user-id-2",
  }),
});
```

### 5. **Integrasi dengan Sistem Existing**

```javascript
import { createAndSendNotification } from "@/lib/notificationIntegration";

// Ketika ada setoran hafalan baru
const result = await createAndSendNotification(
  examinerId, // Target user
  reciterId, // From user
  "recap_notification",
  {
    title: "📋 Setoran Hafalan Baru",
    body: "Ada setoran hafalan yang perlu Anda periksa",
    icon: "/icons/qurani-192.png",
    url: `/recaps/${recapId}`,
    data: { type: "new_recap", recapId },
  },
  { recap_id: recapId } // Additional data untuk DB
);
```

## 🎯 Template Notifikasi

### Available Templates:

1. **`newRecap`** - Setoran hafalan baru

   ```javascript
   {
     template: "newRecap", reciterId, examinerId, recapId;
   }
   ```

2. **`friendRequestAccepted`** - Permintaan pertemanan diterima

   ```javascript
   {
     template: "friendRequestAccepted", requesterId, recipientId;
   }
   ```

3. **`memorationReminder`** - Reminder setoran hafalan
   ```javascript
   {
     template: "memorationReminder", userId;
   }
   ```

## 🔄 Auto-Processing Notifications

### Process Pending Notifications

```javascript
// Manual trigger
const response = await fetch("/api/push/process-pending", {
  method: "POST",
});

// Atau setup cron job untuk auto-process
```

### Setup Cron Job (Optional)

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/push/process-pending",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

## 🖥️ Admin Interface

Akses admin interface di: `/admin/push-notifications`

Features:

- ✅ Kirim ke user tunggal
- ✅ Kirim ke multiple users
- ✅ Broadcast ke semua user
- ✅ Test notifications
- ✅ Real-time status feedback

## 📱 Client-Side Integration

### Auto-Prompt Setup

```javascript
// Di layout atau dashboard
import SimpleAutoNotificationPrompt from "@/components/SimpleAutoNotificationPrompt";

export default function Layout({ children }) {
  const { user } = useAuth();

  return (
    <div>
      {children}

      {/* Auto-prompt setelah 5 detik */}
      <SimpleAutoNotificationPrompt userId={user?.id} />
    </div>
  );
}
```

## 🔧 Service Worker

File `public/sw.js` sudah di-setup untuk:

- ✅ Handle push events
- ✅ Show notifications
- ✅ Handle notification clicks
- ✅ Navigate to URLs

## 📊 Monitoring & Analytics

### Check User Subscriptions

```javascript
const response = await fetch(`/api/push/send-to-user?userId=${userId}`);
const data = await response.json();

console.log("Has subscription:", data.hasSubscription);
console.log("Subscription count:", data.subscriptionCount);
```

### Push Notification Results

Setiap push notification mengembalikan:

```javascript
{
  success: true,
  results: [...],
  successCount: 5,
  failCount: 1,
  totalSent: 6
}
```

## 🚨 Error Handling

### Automatic Cleanup

- ✅ Invalid subscriptions (410 Gone) otomatis dihapus
- ✅ Retry logic untuk failed notifications
- ✅ Comprehensive error logging

### Common Issues

1. **No Subscriptions Found**

   - User belum subscribe
   - Check browser compatibility

2. **VAPID Key Mismatch**

   - Pastikan VAPID keys konsisten
   - Regenerate jika perlu

3. **Permission Denied**
   - User belum grant permission
   - Trigger auto-prompt

## 🎨 Customization

### Custom Notification Templates

```javascript
// Tambah di notificationTemplates
customTemplate: (param1, param2) => ({
  userId: param1,
  fromUserId: param2,
  type: "custom_type",
  pushPayload: {
    title: "Custom Title",
    body: "Custom message",
    icon: "/icons/custom.png",
    url: "/custom-page",
    data: { type: "custom" },
  },
});
```

### Custom Payload Structure

```javascript
const payload = {
  title: "Notification Title",
  body: "Notification message",
  icon: "/icons/icon.png",
  badge: "/icons/badge.png",
  image: "/images/large-image.jpg",
  url: "/target-page",
  data: {
    type: "custom",
    id: "123",
    timestamp: Date.now(),
  },
  tag: "unique-tag",
  requireInteraction: true,
  silent: false,
};
```

## 🔐 Security

- ✅ VAPID keys untuk authentication
- ✅ Service role key untuk server-side operations
- ✅ Input validation di semua endpoints
- ✅ Rate limiting (recommended)

## 📈 Performance

- ✅ Batch processing untuk multiple users
- ✅ Async operations
- ✅ Database cleanup untuk invalid subscriptions
- ✅ Efficient payload compression

## 🧪 Testing

### Test Single User

```bash
curl -X POST http://localhost:3000/api/push/send-to-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5",
    "isTest": true
  }'
```

### Test Template

```bash
curl -X POST http://localhost:3000/api/push/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "template": "memorationReminder",
    "userId": "25b360bf-7ee4-4ad9-8b82-bca85d26fdb5"
  }'
```

## 📞 API Endpoints Summary

| Endpoint                     | Method | Description                   |
| ---------------------------- | ------ | ----------------------------- |
| `/api/push/send-to-user`     | POST   | Kirim ke user tunggal         |
| `/api/push/send-to-multiple` | POST   | Kirim ke multiple users       |
| `/api/push/process-pending`  | POST   | Process pending notifications |
| `/api/push/send-template`    | POST   | Kirim dengan template         |

## 🎯 Next Steps

1. **Setup VAPID keys** di environment variables
2. **Test basic functionality** dengan admin interface
3. **Integrate dengan existing features** (setoran, friend requests, etc.)
4. **Setup auto-prompt** di dashboard
5. **Monitor performance** dan user engagement

---

**🚀 Sistem push notification sudah siap digunakan! Semoga bermanfaat untuk meningkatkan engagement user Qurani.** 🤲
