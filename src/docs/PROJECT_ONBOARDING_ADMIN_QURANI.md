# Dokumentasi Onboarding Project `admin-qurani-org`

## 1. Gambaran Umum
Project ini adalah aplikasi web admin/internal Qurani berbasis **Next.js App Router** (`src/app`) yang saat ini berada pada fase **transisi arsitektur data**:

- Fitur baru banyak memakai **MyQurani API** (`https://api.myqurani.com`) lewat `src/lib/api.ts`.
- Sebagian fitur lama masih memakai **Supabase** (query langsung tabel, realtime, storage, notif, friends, group legacy).
- Ada juga halaman simulasi/dummy data (terutama billing dashboard/orders) memakai JSON lokal di `src/data`.

Secara praktis: ini bukan project “100% API eksternal” dan bukan juga “100% Supabase”, tetapi **hybrid**.

---

## 2. Stack Teknologi

## 2.1 Framework & Runtime
- Next.js `15.5.x` + React `19`
- TypeScript (strict)
- App Router (`src/app`)

## 2.2 UI & Styling
- Tailwind CSS v4
- Radix UI + komponen custom (`src/components/ui`)
- Ikon: Lucide, Tabler, React Icons
- Animasi: Framer Motion / Motion

## 2.3 Data & State
- SWR untuk cache/fetch client
- Zustand (`src/stores`)
- Local storage + cookie untuk auth token MyQurani

## 2.4 Backend Integrasi
- MyQurani REST API (utama di banyak modul)
- Supabase (auth legacy, DB legacy, realtime, storage)
- Redis (`src/lib/redis.ts`) untuk cache tertentu

---

## 3. Struktur Folder Penting

## 3.1 Root
- `package.json`: scripts, dependencies.
- `next.config.ts`: PWA, image remote patterns, skip lint/type saat build.
- `.env.local`: konfigurasi env project.
- `supabase/migrations`: patch schema SQL.

## 3.2 `src/`
- `src/app`: routing halaman + API route Next.js.
- `src/components`: UI/fitur per domain.
- `src/lib`: API client utama MyQurani (`lib/api.ts`), i18n helper, redis, util global.
- `src/utils`: helper legacy (Supabase auth, API wrapper per modul, cache, db util).
- `src/hooks`: custom hooks (auth, realtime, group/member, i18n, dsb).
- `src/dictionaries`: i18n (`id`, `en`, `ar`) per namespace.
- `src/data`: data dummy/statik.
- `src/types`: tipe domain.
- `src/docs`: dokumentasi internal.

Ringkasan jumlah file utama:
- `src/app`: 103 file
- `src/components`: 157 file
- `src/utils`: 76 file
- `src/hooks`: 36 file

---

## 4. Routing & Modul UI

## 4.1 Auth & Landing
- Landing: `src/app/(landing)/page.tsx`
- Login/Register/Forgot/Reset: `src/app/(auth)/*`
- OAuth callback MyQurani: `src/app/(auth)/oauth/callback/page.tsx`
- OAuth callback Supabase: `src/app/(auth)/auth/callback/route.ts`

## 4.2 Dashboard & Sidebar
- Layout utama area login: `src/components/layouts/dashboard-layout.tsx`
- Sidebar menu: `src/components/ui/sidebar/app-sidebar.tsx`
- Menu utama:
  - Dashboard
  - Support
  - Billing
  - Administrator
  - Master Data
  - Notifications
  - Settings

## 4.3 Modul per domain
- Support tickets: `src/app/support/tickets/*`
- Group management: `src/app/groups/*`
- Admin users: `src/app/users/manage/page.tsx`
- Admin dashboard: `src/app/admin/dashboard/page.tsx`
- Master data: `src/app/master/*`
- Profile: `src/app/profile/*`
- Notification: `src/app/notification/page.tsx`

---

## 5. Arsitektur Auth (Paling Penting)

Auth sekarang memakai **dua jalur**:

## 5.1 Jalur utama: MyQurani API
File kunci:
- `src/lib/api.ts` (`authApi.login/register/logout`)
- `src/utils/Auth/login.ts` (`loginMyQurani`)
- `src/components/providers/auth-provider.tsx`

Flow ringkas:
1. User login di `LoginForm`.
2. Coba `authApi.login` (client-side, simpan token ke localStorage + cookie non-httpOnly).
3. Jika gagal, fallback ke server action `loginMyQurani` yang set cookie.
4. Middleware membaca cookie `myqurani_access_token` + `myqurani_user` untuk akses route protected.

Cookie kunci:
- `myqurani_access_token`
- `myqurani_refresh_token`
- `myqurani_user`

## 5.2 Jalur legacy: Supabase Auth
Masih ada untuk:
- callback OAuth Supabase (`/auth/callback`)
- beberapa fallback `supabase.auth.getUser()`
- fungsi lama register/reset password tertentu.

Catatan penting:
- Validasi role admin di login **sementara dinonaktifkan** di beberapa titik (komentar/testing).
- Karena hybrid, bug auth paling sering terjadi di sinkronisasi `localStorage <-> cookies`.

---

## 6. Middleware & Proteksi Route

File: `src/middleware.ts` + `src/utils/supabase/middleware.ts`

Urutan cek:
1. Cek auth cookie MyQurani dulu.
2. Jika tidak ada, fallback cek session Supabase.
3. Redirect:
  - Belum login + route protected -> `/login`
  - Sudah login + buka `/login`/`/register`/`/` -> `/dashboard`
4. Cek user blocked (dari `user_profiles`) -> redirect `/blocked`.

Route protected yang dicakup:
- `/dashboard`, `/profile`, `/support`, `/billing`, `/notification`, `/settings`, dll.

---

## 7. Pengambilan Data API: Peta Besar

## 7.1 Layer 1 (utama): `src/lib/api.ts`
Ini client API pusat MyQurani:
- `authApi`
- `usersApi` / `userApi`
- `ticketsApi`
- `setoranApi`
- `groupsApi`
- `rolesApi`
- `masterdataApi`

Fungsi penting:
- inject Bearer token dari localStorage
- auto refresh token saat 401
- retry request setelah refresh

## 7.2 Layer 2 (legacy): `src/utils/api/*`
Masih dipakai luas, terutama:
- notifikasi
- friends
- group action tertentu
- ticket bridge (Supabase + MyQurani)
- statistik

`src/utils/api/index.ts` sendiri sudah menandai status data source per modul: `MYQURANI`, `SUPABASE`, `MIXED`.

## 7.3 Layer 3: Next API Routes (`src/app/api/*`)
Dipakai sebagai:
- proxy auth/token/profile
- agregator master data
- endpoint action internal group/friends/notif
- util admin (analyze/cleanup notification)

---

## 8. Endpoint Internal (Next API) yang Kritis

Daftar route penting:
- `/api/auth/store-tokens` -> simpan token OAuth MyQurani ke cookie
- `/api/auth/refresh` -> refresh token dari refresh cookie
- `/api/auth/logout` dan `/api/auth/force-logout` -> bersihkan cookie auth
- `/api/me` dan `/api/profile` -> profile wrapper + fallback cookie + merge Supabase
- `/api/grup` -> action multipurpose untuk group (GET/POST banyak action)
- `/api/friends` -> action friends
- `/api/notifications` -> ambil notifikasi user dari Supabase
- `/api/masterdata/countries` -> agregasi detail negara + cache in-memory 24 jam
- `/api/masterdata/cities` -> bundle multiple page cities + cache in-memory 1 jam
- `/api/tickets/supabase/list` dan `/api/tickets/supabase/[id]` -> fallback ticket dari Supabase

---

## 9. Modul UI -> Fungsi -> Sumber Data

## 9.1 Login/Register
- UI:
  - `src/components/ui/auth-form/login-form.tsx`
  - `src/components/ui/auth-form/register-form.tsx`
- Fungsi:
  - login: `authApi.login` + fallback `loginMyQurani`
  - register: `authApi.register` + sinkron profile ke Supabase via `updateUserProfile`
- Sumber data:
  - utama MyQurani API
  - beberapa fallback Supabase

## 9.2 Dashboard Utama
- Halaman: `src/app/dashboard/page.tsx`
- Komponen: statistik/user recitation
- Data: kombinasi util statistik (legacy).

## 9.3 Admin Dashboard
- Halaman: `src/app/admin/dashboard/page.tsx`
- Fetch: `src/utils/api/admin/dashboard/fetch.ts`
- Sumber: Supabase table `user_profiles` (count + agregasi lokasi/gender)

## 9.4 User Management
- Halaman: `src/app/users/manage/page.tsx`
- Komponen: `src/components/admin/user.tsx`
- Data utama: `usersApi.search` (MyQurani)
- Catatan: beberapa field detail user bisa kosong tergantung shape API summary.

## 9.5 Group Management
- Halaman: `src/app/groups/*`
- Komponen inti: `grup-saya.tsx`, `kelola-member.tsx`, hooks `use-grup-data`, `use-group-members`
- Data:
  - MyQurani API (search/create/verify/delete, dll)
  - Supabase lewat `/api/grup` untuk action legacy tertentu (member promotion, join request, dll)

## 9.6 Support Tickets
- Halaman: `src/app/support/tickets/*`
- Komponen besar: `SupportTicketsPage`, `TicketDetailClient`
- Data:
  - utama `ticketsApi` (MyQurani)
  - fallback merge data Supabase (`/api/tickets/supabase/*`)
- Ticket create/reply masih menulis ke Supabase dulu, lalu push ke API sebagai secondary.

## 9.7 Master Data
- Halaman: `src/app/master/*`
- Komponen: `countries-manager`, `states-manager`, `cities-manager`, dll
- Data utama: `masterdataApi` (MyQurani)
- Optimisasi tambahan:
  - countries by currency via `/api/masterdata/countries` aggregator
  - cities bundle via `/api/masterdata/cities`

## 9.8 Profile
- Halaman:
  - `src/app/profile/page.tsx` (my profile)
  - `src/app/profile/[id]/page.tsx` (public profile)
- Data:
  - hook `useUserProfile` -> `/api/me` atau `/api/profile`
  - fallback cookie jika API gagal
  - ada operasi friends/report/recaps yang masih banyak ke Supabase util legacy

## 9.9 Notifications & Presence
- Notifikasi list: `/api/notifications` (Supabase query)
- Toast realtime: `UnifiedNotificationToast` (Supabase realtime channel)
- Presence online: `usePresence` + `PresenceProvider` (Supabase realtime presence)

---

## 10. i18n (Multibahasa)

- Locale: `id`, `en`, `ar` (`i18n.config.ts`)
- Provider: `I18nProvider`
- Hook: `useTranslation`, `useI18n`
- Dictionary: `src/dictionaries/<namespace>/<locale>.json`
- Mekanisme:
  - namespace-based lazy import
  - cache dictionary di memory
  - locale disimpan di localStorage (`preferred-locale`)

---

## 11. Data Non-API

- `public/json/*`, `public/praquran/*`, `public/fonts/*`: aset Quran statis.
- `src/data/billing-dummy.json`: dipakai beberapa halaman billing simulasi.
- video landing: `public/videos/V-utama.mp4` dsb.

---

## 12. Environment Variables yang Dipakai

Kunci env yang terdeteksi:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_MYQURANI_API_URL`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPID_PRIVATE_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_PASSWORD`, `REDIS_DB`

Catatan:
- Beberapa file masih memakai `NEXT_PUBLIC_MY_API_URL` (nama lama), jadi perlu konsolidasi.

---

## 13. Status Teknis Saat Ini (Penting untuk penerus)

## 13.1 Hal yang sudah bagus
- Struktur modul cukup jelas per domain.
- Ada wrapper API terpusat (`lib/api.ts`).
- Ada cache/dedup SWR di beberapa modul berat.

## 13.2 Hal yang perlu diwaspadai
- Hybrid auth/data source -> rawan inkonsistensi session.
- Role validation admin masih ada bagian yang di-comment (testing mode).
- Notifikasi punya beberapa implementasi paralel (`server.ts`, `insert.ts`, hook lama).
- Beberapa route/path masih campur istilah (`notification` vs `notifikasi`).
- Ada halaman billing yang masih dummy/simulasi.

## 13.3 Area prioritas refactor
1. Standarisasi auth hanya satu jalur (MyQurani + policy role final).
2. Kurangi query Supabase langsung di client untuk fitur yang sudah ada endpoint MyQurani.
3. Rapikan modul notifikasi (single source of truth).
4. Konsolidasi naming env & endpoint base URL.

---

## 14. Checklist Onboarding Praktis

1. Jalankan app dan uji login email + Google.
2. Verifikasi cookie/token (`myqurani_*`) setelah login.
3. Cek menu utama satu per satu:
   - Users
   - Support Tickets
   - Groups
   - Master Data
4. Mapping fitur yang masih dummy (khusus billing).
5. Review `src/utils/api/index.ts` untuk tahu modul mana yang masih legacy.
6. Saat debug error data, selalu cek:
   - apakah request lewat `lib/api.ts` atau `utils/api/*`
   - apakah sumbernya MyQurani API atau Supabase

---

## 15. File Referensi Kunci untuk Dipelajari Duluan

- `src/components/providers/auth-provider.tsx`
- `src/utils/supabase/middleware.ts`
- `src/lib/api.ts`
- `src/app/api/grup/route.ts`
- `src/components/layouts/dashboard-layout.tsx`
- `src/components/ui/sidebar/app-sidebar.tsx`
- `src/components/Support/SupportTicketsPage.tsx`
- `src/components/dashboard/grup/grup-saya.tsx`
- `src/components/admin/user.tsx`
- `src/components/masterdata/countries-manager.tsx`

---

Dokumen ini dibuat untuk onboarding penerus project. Jika kamu mau, langkah berikutnya saya bisa buat **diagram arsitektur visual (flow auth + flow data API)** dalam file markdown tambahan supaya lebih cepat dipresentasikan ke tim.
