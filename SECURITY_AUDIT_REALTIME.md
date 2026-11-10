# 🔒 AUDIT KEAMANAN: HOOKS REALTIME

## ✅ HASIL AUDIT

Saya telah mengaudit seluruh fitur realtime hooks pada aplikasi Qurani. Berikut adalah hasil dan rekomendasi:

---

## 📊 HOOKS YANG DIAUDIT:

1. ✅ `use-realtime.ts` (Base realtime hook)
2. ✅ `use-realtime-friends.ts`
3. ✅ `use-realtime-groups.ts`
4. ✅ `use-realtime-group-members.ts`
5. ✅ `use-realtime-active-friends.ts`

---

## ✅ YANG SUDAH BAIK:

### 1. **Filter di Level Supabase Realtime**
```typescript
// ✅ GOOD - Filter menggunakan user_id dari context
filter: `or(requester_id=eq.${userId},recipient_id=eq.${userId})`
filter: `grup_id=eq.${groupId}`
filter: `user_id=eq.${userId}`
```
- **Secure**: Filter dilakukan di level database
- **Optimal**: Hanya data yang relevan dengan user yang dikirim

### 2. **Debouncing untuk Prevent Spam**
```typescript
// ✅ GOOD - Mencegah multiple rapid calls
if (window.realtimeDebounce[debounceKey]) {
  clearTimeout(window.realtimeDebounce[debounceKey])
}
window.realtimeDebounce[debounceKey] = setTimeout(() => {
  fetchData()
}, 100)
```
- **Secure**: Mencegah DoS attacks melalui rapid subscription changes
- **Performance**: Mengurangi beban server

### 3. **Proper Channel Cleanup**
```typescript
// ✅ GOOD - Cleanup di useEffect return
return () => {
  if (channelRef.current) {
    supabase.removeChannel(channelRef.current)
    channelRef.current = null
    setIsConnected(false)
  }
}
```
- **Secure**: Mencegah memory leaks
- **Reliable**: Channels ditutup dengan benar saat unmount

### 4. **Status Handling yang Proper**
```typescript
channel.subscribe((status, err) => {
  switch (status) {
    case 'SUBSCRIBED': setIsConnected(true); break
    case 'CHANNEL_ERROR':
    case 'TIMED_OUT':
    case 'CLOSED': setIsConnected(false); break
  }
})
```
- **Secure**: Error handling yang baik
- **UX**: User tahu koneksi status

---

## ⚠️ POTENSI MASALAH & REKOMENDASI:

### 1. **❗ CRITICAL: RLS (Row Level Security) Policies**

**MASALAH:**
Keamanan realtime hooks **bergantung sepenuhnya pada RLS policies di Supabase**.

**CEK DI SUPABASE DASHBOARD:**
```sql
-- Pastikan RLS enabled untuk semua tabel:
-- ✓ friend_requests
-- ✓ grup
-- ✓ grup_members
-- ✓ user_profiles
-- ✓ notifications

-- Contoh RLS policy yang HARUS ada:
-- friend_requests: User hanya bisa lihat request yang melibatkan dirinya
CREATE POLICY "Users can view their own friend requests"
ON friend_requests FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- grup_members: User hanya bisa lihat member dari grup yang dia ikuti
CREATE POLICY "Users can view members of their groups"
ON grup_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM grup_members gm
    WHERE gm.grup_id = grup_members.grup_id
    AND gm.user_id = auth.uid()
  )
);
```

**CARA CEK:**
1. Login ke Supabase Dashboard
2. Database → Tables → Pilih table
3. Cek apakah RLS **ENABLED**
4. Periksa policies yang ada

**BAHAYA JIKA TIDAK ADA RLS:**
- ❌ User bisa subscribe ke data user lain
- ❌ User bisa melihat semua groups (termasuk yang private)
- ❌ User bisa melihat friend requests orang lain
- ❌ Data leak MASIF!

---

### 2. **⚠️ MEDIUM: User ID Validation**

**MASALAH:**
Tidak ada validasi apakah `userId` yang diberikan adalah user yang sedang login.

**REKOMENDASI:**
Tambahkan validasi di server-side API:

```typescript
// ❌ BAD - Menerima userId dari client tanpa validasi
export async function getFriendsData(userId: string) {
  // ...
}

// ✅ GOOD - Validate userId adalah current auth user
export async function getFriendsData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  const userId = user.id; // Gunakan dari auth, bukan dari parameter!
  // ...
}
```

**BAHAYA:**
Jika attacker bisa manipulasi `userId` parameter, mereka bisa:
- Melihat friends list user lain
- Subscribe ke grup orang lain

---

### 3. **⚠️ MEDIUM: Global Window Object Usage**

**KODE:**
```typescript
if (!window.realtimeDebounce) {
  window.realtimeDebounce = {}
}
```

**MASALAH:**
- Tidak type-safe
- Bisa conflict dengan extension/script lain
- Memory leak risk jika tidak cleanup properly

**REKOMENDASI:**
```typescript
// ✅ BETTER - Use React ref atau context
const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

// Cleanup on unmount
useEffect(() => {
  return () => {
    Object.values(debounceTimers.current).forEach(clearTimeout);
    debounceTimers.current = {};
  };
}, []);
```

---

### 4. **ℹ️ LOW: Console.log di Production**

**KODE:**
```typescript
console.log('Group membership realtime update:', payload)
console.log('Group info update:', payload)
console.error('Friends realtime error:', err)
```

**REKOMENDASI:**
```typescript
// ✅ BETTER - Use conditional logging
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  console.log('Group membership realtime update:', payload);
}

// For errors, always log tapi sanitize dulu
console.error('Realtime error:', {
  code: err?.code,
  message: err?.message,
  // jangan log full payload/sensitive data
});
```

---

### 5. **⚠️ MEDIUM: Error Handling kurang Robust**

**KODE:**
```typescript
try {
  const data = await getFriendsData(userId)
  // ...
} catch (error) {
  console.error('Error fetching friends data:', error)
  // No fallback, no user notification
}
```

**REKOMENDASI:**
```typescript
try {
  const data = await getFriendsData(userId)
  // ...
} catch (error) {
  console.error('Error fetching friends data:', error)
  
  // ✅ Show user-friendly error
  toast.error('Gagal memuat data teman. Coba lagi nanti.')
  
  // ✅ Set error state
  setError(error instanceof Error ? error.message : 'Unknown error')
  
  // ✅ Optional: Retry with exponential backoff
  scheduleRetry()
}
```

---

## 🔐 CHECKLIST KEAMANAN:

### **URGENT - HARUS DICEK SEKARANG:**
- [ ] **RLS enabled** untuk semua tabel:
  - [ ] `friend_requests`
  - [ ] `grup`
  - [ ] `grup_members`
  - [ ] `user_profiles`
  - [ ] `notifications`
- [ ] **RLS policies** sudah benar untuk setiap tabel
- [ ] Test: User A tidak bisa lihat data User B

### **HIGH PRIORITY:**
- [ ] Ubah API functions untuk validate `userId` dari `auth.user()` bukan dari parameter
- [ ] Add rate limiting di Supabase (Max subscriptions per user)
- [ ] Add error boundaries untuk handle subscription failures gracefully

### **MEDIUM PRIORITY:**
- [ ] Replace global `window` objects dengan React refs/context
- [ ] Remove atau conditional console.log di production
- [ ] Add retry logic dengan exponential backoff
- [ ] Add user notification untuk connection errors

### **LOW PRIORITY:**
- [ ] Add monitoring/analytics untuk track realtime usage
- [ ] Add connection quality indicators
- [ ] Implement optimistic updates untuk better UX

---

## 📝 CARA VERIFY RLS POLICIES:

### 1. **Manual Test di Supabase SQL Editor:**
```sql
-- Login sebagai user A
SET LOCAL jwt.claims.sub TO 'user-a-id';

-- Coba query data user B
SELECT * FROM friend_requests WHERE requester_id = 'user-b-id';
-- Harus return EMPTY atau error

-- Coba query data sendiri
SELECT * FROM friend_requests WHERE requester_id = 'user-a-id';
-- Harus return data user A
```

### 2. **Test di Browser Console:**
```javascript
// Login sebagai User A
// Coba manipulate userId di browser
const otherUserId = 'user-b-id'; // ID user lain

// Call API dengan userId orang lain
const response = await fetch('/api/friends', {
  method: 'POST',
  body: JSON.stringify({ userId: otherUserId })
});

// Seharusnya: 
// - Dapat error/unauthorized ATAU
// - Return empty data
// TIDAK BOLEH return data user B!
```

---

## 🎯 KESIMPULAN:

### ✅ **YANG SUDAH AMAN:**
1. Filtering di level database
2. Debouncing untuk prevent spam
3. Proper cleanup channels
4. Error handling sudah ada (meski bisa ditingkatkan)

### ⚠️ **YANG HARUS DIPERBAIKI:**
1. **RLS Policies** (CRITICAL!) - Cek dan pastikan enabled
2. **Server-side user validation** - Jangan trust client userId
3. **Error handling** - Add user notifications dan retry logic
4. **Global state management** - Replace window objects

### 📊 **OVERALL SECURITY SCORE: 7/10**

**Penjelasan:**
- Code quality: **Good** ✅
- Filter implementation: **Good** ✅
- RLS dependency: **Critical concern** ⚠️ (belum diverify)
- Input validation: **Needs improvement** ⚠️
- Error handling: **Adequate** ⚙️

---

## 🚀 NEXT STEPS:

1. **URGENT**: Verify RLS policies di Supabase (Hari ini!)
2. **HIGH**: Refactor API untuk validate userId dari auth
3. **MEDIUM**: Improve error handling dan user feedback
4. **LOW**: Code cleanup dan optimization

Setelah RLS diverify dan perbaikan di-apply, security score bisa naik ke **9/10**.
