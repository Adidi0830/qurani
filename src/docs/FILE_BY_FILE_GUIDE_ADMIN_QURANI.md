# File-by-File Guide `admin-qurani-org`

Dokumen ini fokus ke penjelasan **per file inti** agar kamu cepat paham kode yang sering dipakai dan sering bikin bingung.

## A. File yang sedang kamu buka

## 1) `src/app/api/cleanup-expired-links/route.ts`
Fungsi file:
- Menyediakan endpoint `POST /api/cleanup-expired-links` untuk membersihkan invitation link grup yang sudah kadaluarsa.

Alur:
1. Memanggil `cleanupExpiredLinks()` dari `@/utils/api/grup/invitation-links`.
2. Jika sukses (`result.status === "success"`), return JSON `success: true`.
3. Jika gagal, return JSON `success: false` + status 500.
4. Jika terjadi exception, return `Internal server error`.

Catatan penting:
- Di file ini auth check masih di-comment (opsional) sehingga endpoint bisa dipanggil tanpa secret.
- Aman dipakai internal, tapi untuk production sebaiknya aktifkan guard auth/secret.

---

## 2) `src/app/api/admin/analyze-notifications/route.ts`
Fungsi file:
- Endpoint admin-only untuk audit struktur data notifikasi.
- Method: `GET /api/admin/analyze-notifications`.

Alur:
1. Buat client Supabase server.
2. Validasi user login lewat `supabase.auth.getUser()`.
3. Validasi role user harus `admin` dari tabel `user_profiles`.
4. Jalankan analisis:
   - `analyzeNotificationsStructure()`
   - `getCurrentAdminUsers()`
5. Return ringkasan + rekomendasi.

Kenapa file ini penting:
- Ini alat diagnosis ketika notifikasi duplikat / user_id null / pola notif berantakan.
- Cocok dipakai sebelum cleanup agar tahu skala masalah.

---

## 3) `tsconfig.json`
Fungsi file:
- Konfigurasi TypeScript global project.

Poin penting:
- `"strict": true` -> type checking ketat.
- `"noEmit": true` -> TS hanya check, tidak generate JS (Next yang handle build).
- `"paths": { "@/*": ["./src/*"] }` -> bisa import alias `@/`.
- `"moduleResolution": "bundler"` -> sesuai mode modern Next.js.
- `include` mencakup `.next/types/**/*.ts` agar type route Next terbaca.

---

## 4) `src/docs/ADMIN_LOGIN_VALIDATION.md`
Fungsi file:
- Dokumen historis tentang validasi role admin saat login.

Catatan realita kode saat ini:
- Dokumen ini menjelaskan konsep validasi admin.
- Tetapi implementasi login terbaru sekarang dominan ke MyQurani API, dan beberapa validasi role di code masih sempat di-disable untuk testing.
- Jadi ini berguna sebagai referensi kebijakan, tapi kondisi runtime sekarang perlu cek kode aktual login.

---

## B. File paling penting untuk paham arsitektur

## 5) `src/components/providers/auth-provider.tsx`
Peran:
- Sumber state auth global (`useAuth()`).
- Menjembatani localStorage + cookie + Supabase fallback.

Kenapa penting:
- Hampir semua halaman bergantung pada `isAuthenticated`, `userId`, `profile`.
- Jika ada bug redirect/login loop, file ini hampir pasti ikut terlibat.

---

## 6) `src/utils/supabase/middleware.ts`
Peran:
- Logic proteksi route di middleware Next.
- Prioritas cek auth: cookie MyQurani dulu, lalu Supabase fallback.

Dampak:
- Menentukan kapan user diarahkan ke `/dashboard`, `/login`, `/blocked`.

---

## 7) `src/lib/api.ts`
Peran:
- Client utama ke MyQurani API.

Isi penting:
- `authApi`, `usersApi`, `ticketsApi`, `groupsApi`, `masterdataApi`, dll.
- Auto refresh token saat 401.
- Simpan auth di localStorage + cookie fallback.

Kenapa wajib dipahami:
- Ini “jalan utama” data untuk fitur modern.

---

## 8) `src/app/api/grup/route.ts`
Peran:
- Endpoint multipurpose grup (GET/POST dengan banyak `action`).

Masalah umum:
- Karena besar dan campur legacy-modern, debugging grup sering berakhir di file ini.
- Action contoh: `getGroups`, `searchGroups`, `inviteMember`, `acceptJoinRequest`, dll.

---

## 9) `src/components/layouts/dashboard-layout.tsx`
Peran:
- Layout inti setelah login.
- Menangani sidebar, header mobile, unread badge notif, guard auth.

Catatan:
- Jika UI setelah login terasa “aneh” (redirect/loading spinner lama), cek file ini.

---

## 10) `src/components/ui/sidebar/app-sidebar.tsx`
Peran:
- Definisi menu utama aplikasi.
- Menentukan peta navigasi (support, billing, admin, master, dll).

---

## C. Auth files (praktis untuk dipahami dulu)

## 11) `src/components/ui/auth-form/login-form.tsx`
- UI login + validasi input.
- Coba login via `authApi.login`, fallback ke server action login lama.
- Support Google OAuth via endpoint MyQurani OAuth URL.

## 12) `src/utils/Auth/login.ts`
- Server action login MyQurani.
- Set cookie auth (`myqurani_access_token`, `myqurani_refresh_token`, `myqurani_user`).

## 13) `src/app/(auth)/oauth/callback/page.tsx`
- Proses callback OAuth dari Google (alur MyQurani).
- Simpan token ke cookie via `/api/auth/store-tokens`.

## 14) `src/app/api/auth/store-tokens/route.ts`
- Menulis token OAuth ke cookie server-side.

## 15) `src/app/api/auth/refresh/route.ts`
- Refresh access token dari refresh token cookie.

## 16) `src/app/api/auth/force-logout/route.ts`
- Hapus semua cookie auth (termasuk stale cookie) lalu redirect login.

---

## D. Ticket/Support files

## 17) `src/components/Support/SupportTicketsPage.tsx`
- Halaman daftar tiket yang kompleks.
- Data utama MyQurani API, fallback merge Supabase list.
- Ada filter, search, pagination, bulk action, export UI.

## 18) `src/app/support/tickets/[id]/TicketDetailClient.tsx`
- Detail 1 tiket + reply + update status/priority.
- Menggabungkan berbagai util API.

## 19) `src/utils/api/tickets/fetch.ts`
- Fetch ticket list/detail dengan pola hybrid (API + fallback Supabase).

## 20) `src/utils/api/tickets/insert.ts`
- Create ticket/reply: saat ini prioritas simpan ke Supabase lalu push API (secondary).

## 21) `src/app/api/tickets/supabase/list/route.ts`
- Endpoint fallback list tiket dari Supabase langsung.

---

## E. Group files

## 22) `src/components/dashboard/grup/grup-saya.tsx`
- Halaman grup saya: list/create/filter/report/restore/verify/delete.
- Campuran `groupsApi` (MyQurani) dan util legacy.

## 23) `src/components/dashboard/grup/kelola-member.tsx`
- Kelola member: promote/demote/remove/invite/join request.
- Banyak action menembak `/api/grup`.

## 24) `src/hooks/use-grup-data.ts`
- SWR hook data grup dari MyQurani API (search + cache).

## 25) `src/hooks/use-group-members.ts`
- SWR hook member grup via `/api/grup?action=getGroupMembers`.

---

## F. Master data files

## 26) `src/components/masterdata/countries-manager.tsx`
- CRUD/search/filter countries.
- Sumber utama `masterdataApi.countries`.

## 27) `src/app/api/masterdata/countries/route.ts`
- Aggregator server-side: fetch semua detail country dan cache 24 jam.
- Dipakai untuk kebutuhan yang endpoint standar belum cukup.

## 28) `src/app/api/masterdata/cities/route.ts`
- Bundling banyak halaman city sekaligus + cache 1 jam.

---

## G. Profile/Notification files

## 29) `src/app/profile/page.tsx`
- Halaman profile sendiri (edit data, avatar, location, recipients, dst).
- Masih banyak integrasi legacy Supabase.

## 30) `src/hooks/use-user-profile.ts`
- Hook profil yang memilih endpoint:
  - `/api/me` (jika own profile)
  - `/api/profile?userId=...` (jika explicit ID)

## 31) `src/app/api/me/route.ts`
- Ambil profil user saat ini dari MyQurani API + fallback cookie + merge data lokasi Supabase.

## 32) `src/app/api/notifications/route.ts`
- Ambil list notifikasi user (Supabase).
- Mapping manual user/group/recap/ticket metadata.

## 33) `src/components/UnifiedNotificationToast.tsx`
- Toast realtime notifikasi dari Supabase channel.

---

## H. Cara cepat paham file yang belum kamu mengerti

Gunakan pola baca ini:
1. Cari “entry point” file (export default / export function utama).
2. Lihat source data:
   - `import { ... } from "@/lib/api"` -> biasanya MyQurani API.
   - `createClient()` / `from("...")` -> biasanya Supabase.
3. Lihat apakah ada fallback:
   - `try ... catch` lalu request lain.
4. Lihat side-effect:
   - set cookie, localStorage, router.push/replace.
5. Lihat state loading/error dan kapan di-trigger.

---

## I. Urutan belajar yang paling aman (rekomendasi)

1. `auth-provider.tsx`
2. `middleware.ts` + `supabase/middleware.ts`
3. `lib/api.ts`
4. `dashboard-layout.tsx` + `app-sidebar.tsx`
5. modul yang paling sering kamu sentuh (misalnya Support atau Groups)

---

Kalau kamu mau, langkah berikut saya buat **diagram arsitektur mermaid** (auth flow + data flow + modul flow) di file docs terpisah agar nyambung dengan guide ini.
