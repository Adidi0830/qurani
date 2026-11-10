# Audit Integrasi Data (Qurani API vs Supabase)

Tanggal audit: 20 Mei 2026  
Repo: `admin-qurani-org`

## Ringkasan Cepat
- Halaman `Master Data > Guru` sekarang **sudah tersambung ke Qurani API** (list + detail + approve/reject + suspend/unsuspend).
- Alur **frontend daftar guru** (`POST /api/v1/Trainers/apply`) **belum ada di repo admin ini** (harus dicek di repo frontend user/member).
- Proyek ini masih **hybrid**: sebagian modul pakai Qurani API, sebagian besar modul sosial/internal masih pakai Supabase.

## Peta Integrasi Per Menu
| Menu / Fitur | Sumber Data Utama | Status Integrasi | Catatan |
|---|---|---|---|
| Billing > Guru (list) | Qurani API (`/api/v1/Trainers`, `/api/v1/Trainers/pending`) | Full Qurani | Status `Menunggu/Diterima/Ditolak/Nonaktif` dimapping dari API.
| Billing > Guru (detail + aksi) | Qurani API (`GET /api/v1/Trainers/{id}`, `POST /verify`, `POST /suspend`, `POST /unsuspend`) | Full Qurani | Approve/reject/suspend/unsuspend sudah live ke API.
| Billing > Orders | Qurani API (`/api/v1/Bookings/search`, bulk status) + sim local UI | Dominan Qurani | Data tabel utama dari API, simulasi order masih lokal untuk testing UI.
| Support > Recitation | Qurani API (`/api/v1/setoran/*` dan `/api/v1/qurani/setoran/*`) | Qurani | Table setoran sudah ambil dari API.
| Support > Tickets | Qurani API + Supabase fallback | Hybrid | Ada endpoint Qurani, namun tetap ada jalur `/api/tickets/supabase/*`.
| Support > KYC Member/Organisasi | Bukan trainer flow | Terpisah | Tidak dipakai untuk verifikasi trainer.
| Master Data (Countries/States/Cities) | Supabase tables | Supabase | `countries`, `states`, `cities` masih dari Supabase.
| Notifications | Supabase | Supabase | `notifications`, relasi `user_profiles`, dll.
| Grup/Komunitas | Supabase | Supabase | Banyak query ke `grup`, `grup_members`, `grup_join_req`, dll.
| Friends/Social | Supabase | Supabase | `friend_requests`, `user_profiles`.
| Profile/User Monitoring | Supabase + Qurani API (sebagian) | Hybrid | Banyak data profil lama masih Supabase.

## Bukti Kunci (File)
- Guru list Qurani: `src/app/billing/guru/page.tsx`
- Guru detail Qurani + aksi admin: `src/app/billing/guru/[id]/page.tsx`
- Tickets hybrid + supabase fallback: `src/components/Support/SupportTicketsPage.tsx`, `src/app/api/tickets/supabase/*`
- Recitation Qurani: `src/components/admin/tabel-setoran.tsx`, `src/utils/api/recaps/fetch.ts`
- Masterdata Supabase: `src/app/api/masterdata/*`, `src/utils/api/countries/fetch.ts`, `src/utils/api/city/fetch.ts`
- Friends/Grup/Notif Supabase: `src/utils/api/friends/index.ts`, `src/app/api/grup/route.ts`, `src/app/api/notifications/route.ts`

## Spesifikasi Penting: Apply Trainer
Dari `marketplace.json` (`/openapi/marketplace.json`), body `ApplyTrainerRequest` wajib berisi:
- `headline`
- `bio`
- `expertise` (array)
- `certifications` (array)
- `portfolioUrls` (array)
- `hourlyRate`
- `currency`
- `experienceYears`
- `isOnline`
- `isOffline`
- `location`
- `categoryIds` (array)

Tidak ada field eksplisit `ktpPhoto` di schema ini.

## Jawaban Skenario Field Tambahan (mis. Foto KTP)
Jika frontend kirim field tambahan yang **tidak ada di schema backend**:
1. Umumnya backend .NET akan **mengabaikan field ekstra** (tidak disimpan), selama field wajib valid.
2. Jika backend dikonfigurasi strict, request bisa **ditolak 400**.
3. Kalau request sukses tapi field ekstra diabaikan, data pendaftaran tetap bisa masuk pending, namun **field ekstra tidak muncul di data trainer**.

## Cara Cek Paling Aman (Praktis)
1. Kirim `POST /api/v1/Trainers/apply` dengan semua field wajib valid + 1 field ekstra (contoh `ktpPhoto`).
2. Cek status response:
- `200/201` => apply diterima.
- `400` => validasi gagal / backend strict.
3. Lalu cek `GET /api/v1/Trainers/pending`:
- Jika entry muncul, berarti pendaftaran masuk.
- Cek apakah data ekstra muncul; jika tidak, berarti field ekstra diabaikan backend.

## Rekomendasi
- Jika KTP wajib bisnis: backend API perlu update schema `ApplyTrainerRequest` (atau endpoint dokumen terpisah), baru frontend kirim field tersebut.
- Jika belum bisa ubah backend: simpan URL dokumen di field yang memang didukung (`certifications`/`portfolioUrls`) sebagai solusi sementara.
