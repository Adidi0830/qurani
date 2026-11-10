# Penjelasan Proyek Admin Qurani (admin-qurani-org)

Dokumen ini berisi penjelasan komprehensif mengenai struktur, antarmuka (UI), fungsionalitas, serta metode pengambilan data dari API untuk proyek **Admin Qurani**, yang dibangun menggunakan framework **Next.js**.

---

## 1. Struktur Folder (Folder Structure)

Proyek ini menggunakan struktur standar **Next.js (App Router)**. Berikut adalah penjelasan direktori utama:

- `src/` : Direktori utama yang menyimpan semua kode sumber (source code) aplikasi.
  - `app/` : Menggunakan sistem **App Router** dari Next.js. Semua rute halaman dan layout diatur di sini (seperti `/admin`, `/dashboard`, `/support`, dll).
  - `components/` : Berisi komponen-komponen React yang dapat digunakan ulang (reusable components). Biasanya dibagi lagi per fitur (misal: `Support`, `Master`, `Users`).
  - `lib/` : Berisi file konfigurasi dan helper/utilitas (seperti `api.ts` untuk memanggil API eksternal, konfigurasi notifikasi, integrasi web push, Redis, dll).
  - `hooks/` : Berisi *custom hooks* React untuk mengelola state dan efek samping, biasanya berinteraksi dengan API, *Context*, atau SWR.
  - `stores/` : Konfigurasi *State Management* global (menggunakan **Zustand** seperti yang ada di `package.json`).
  - `data/` : File berisi data statis (konfigurasi data awal).
  - `services/` : Layer layanan tambahan untuk pemisahan logika bisnis (misal pemanggilan eksternal khusus).
  - `dictionaries/` & `types/` : `dictionaries/` memuat data bahasa untuk fitur multi-bahasa, dan `types/` memuat definisi tipe data TypeScript (Interfaces/Types).
  - `utils/` : Berisi fungsi utilitas pembantu untuk format tanggal, teks, dll.
- `public/` : Berisi aset statis yang bisa diakses langsung (gambar, ikon, dan manifest PWA).
- `supabase/` : Berisi migrasi database dan konfigurasi pendukung jika ada interaksi langsung dengan ekosistem Supabase (biasanya digunakan bersama dengan *backend* utama).

---

## 2. Struktur File Penting

- `package.json` : Mengatur dependencies proyek (seperti Next.js 15, React 19, TailwindCSS 4, Radix UI, Zustand, SWR, dll) serta perintah *scripts* terminal.
- `next.config.ts` : Konfigurasi spesifik *bundler* Next.js, aturan routing tingkat lanjut, dsb.
- `src/lib/api.ts` : **File paling krusial** untuk komunikasi data. Mengatur semua interaksi antara *Frontend* dan *Backend* (.NET API), mengatur pengiriman token (Bearer), dan mekanisme *auto-refresh token*.
- `middleware.ts` : Berfungsi mengecek autentikasi di sisi server (Server-Side) untuk melindungi *routes*. Jika pengguna yang belum login mencoba akses halaman dasbor, middleware ini yang akan membelokkannya (redirect) ke halaman login.
- `i18n.config.ts` & `src/lib/i18n.ts`: Berperan untuk konfigurasi sistem translasi/lokalisasi multi-bahasa (Inggris, Indonesia, Arab).

---

## 3. Tampilan (UI / User Interface)

Aplikasi dibangun menggunakan *stack* antarmuka **Modern & Responsif**:
- **Tailwind CSS v4**: Sebagai utilitas CSS untuk *styling* secara cepat tanpa menulis file CSS terpisah secara masif.
- **Radix UI**: Digunakan untuk elemen UI kompleks yang membutuhkan interaksi dan standar aksesibilitas tinggi (seperti Modal/Dialog, Dropdown, Accordion, Tab, Switch). Karena *headless* (tanpa gaya bawaan), Radix dikustomisasi tampilannya menggunakan Tailwind CSS (arsitektur mirip dengan **shadcn/ui**).
- **Framer Motion**: Menangani animasi dan transisi yang halus (*smooth*) pada antarmuka.
- **Ikon**: Mengombinasikan `lucide-react`, `@tabler/icons-react`, dan `react-icons`.

Pendekatan di atas memastikan Admin Dashboard terlihat profesional, cepat diload, dan nyaman digunakan (UX yang baik).

---

## 4. Fungsi Utama (Features & Functionalities)

Aplikasi ini ditujukan sebagai panel kendali (*Admin Dashboard*) untuk ekosistem Qurani dengan modul-modul berikut:
- **Autentikasi & Sesi**: Login admin dengan token JWT, Pendaftaran, serta perlindungan sesi otomatis.
- **Manajemen Tiket Dukungan (Support Tickets)**: Mengelola keluhan atau masukan dari *user*. Fitur di dalamnya mencakup pemberian balasan (*replies*), pengubahan status, departemen, menetapkan prioritas, dan penugasan (assignees) kepada admin tertentu.
- **Manajemen Pengguna (Users & KYC)**: Melihat basis pengguna, memblokir akun yang melanggar, melihat lokasi (Negara, Provinsi, Kota), dan *approval* untuk KYC.
- **Manajemen Grup (Groups)**: Pengelolaan komunitas/grup aplikasi, persetujuan (*approval*), aturan grup, serta pencarian grup (*offset & cursor pagination*).
- **Sistem Setoran Hafalan (Setoran)**: Fitur pengecekan sesi membaca/hafalan, validasi (*verify*), dan statistik aktivitas pengguna.
- **Multibahasa (i18n)**: UI dapat beralih antara Bahasa Inggris, Indonesia, dan Arab tanpa me-reload aplikasi secara kasar.
- **Notifikasi Push**: Menggunakan service worker (`web-push`) agar browser pengguna dapat menampilkan pesan *real-time*.

---

## 5. Pengambilan Data dari API (Data Fetching)

Pengambilan data terpusat menggunakan *client HTTP* bawaan web (`fetch`) yang dibungkus dengan baik di `src/lib/api.ts`:

1. **Endpoint Utama**: URL dasar memanggil `https://api.myqurani.com` (diatur dari *environment variables*). Backend ini dibangun dengan arsitektur berstandar .NET Core (berdasarkan *ProblemDetails* error handling yang ada di kode).
2. **Autentikasi (Bearer Token)**:
   - Data *auth* (Akses Token, Refresh Token, User Profil) disimpan di `localStorage` dan *Cookies* (agar bisa dibaca Middleware).
   - Setiap memanggil fungsi API (contoh: `ticketsApi.getTickets`), sistem otomatis menyuntikkan `Authorization: Bearer <Token>`.
3. **Mekanisme Refresh Token (Sangat Penting)**:
   - **Proaktif**: Jika token tersisa kurang dari 5 menit sebelum kadaluarsa, aplikasi akan otomatis memanggil *endpoint* `/refresh-token` secara diam-diam (di balik layar).
   - **Reaktif**: Jika tiba-tiba mendapat respon *401 Unauthorized*, aplikasi akan mempause *request*, melakukan *refresh token*, lalu mencoba ulang *request* awal yang gagal tadi.
4. **Pembagian Objek API**: Kode API dipilah secara modular:
   - `authApi` (Login, Register, Logout)
   - `usersApi` (Profil, Search Users, Upload Gambar)
   - `ticketsApi` (List Tiket, Get Tiket, Reply, Close)
   - `setoranApi` (List Setoran, Stats, Approval)
   - `groupsApi` (Search Grup, Create/Update/Delete Grup, Join)

### Contoh Pemakaian di Komponen UI:
Umumnya pemanggilan API diletakkan di dalam `useEffect` pada React, atau dibungkus menggunakan pustaka *fetching* seperti SWR (karena di `package.json` ada `swr`).

```typescript
import { ticketsApi } from '@/lib/api';
import useSWR from 'swr';

// Menggunakan SWR untuk caching dan auto-revalidation
const fetcher = (params) => ticketsApi.getTickets(params);

export default function TicketList() {
   const { data, error, isLoading } = useSWR({ page: 1, pageSize: 10 }, fetcher);

   if (isLoading) return <div>Loading tickets...</div>;
   return <div>Total Tickets: {data?.totalRows}</div>;
}
```

---

*Dokumen ini dibuat untuk memandu developer/penerus proyek (*maintainer*) agar cepat memahami lanskap aplikasi ini. Saat ada pengembangan fitur baru, pastikan untuk mengikuti standar UI yang sudah ada (menggunakan Radix + Tailwind) dan menaruh request API yang baru ke dalam `src/lib/api.ts`.*
