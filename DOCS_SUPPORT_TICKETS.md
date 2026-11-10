# Dokumentasi Modul: Support Tickets

Dokumen ini membedah secara rinci struktur, fungsi, dan pengambilan data (API) untuk halaman **Support Tickets**, khususnya pada komponen `SupportTicketsPage.tsx` dan `NewTicketFormWrapper.tsx`.

---

## 1. Halaman Daftar Tiket (`SupportTicketsPage.tsx`)
**Lokasi File:** `src/components/Support/SupportTicketsPage.tsx`

File ini adalah halaman utama untuk menampilkan daftar tiket dukungan, beserta fitur *filter*, pencarian, dan *bulk actions* (aksi massal).

### A. Pengambilan Data dari API (Baris 111 - 346)
Pengambilan data dilakukan menggunakan `useEffect` yang memanggil fungsi `loadTickets` melalui `fetch` terpusat.
- **Baris 156-158:** Kode menggunakan `import('@/lib/api')` secara dinamis untuk mengambil `ticketsApi` dan `getStoredAuth` (untuk mendapatkan *access token* pengguna saat ini).
- **Baris 162-182:** *Mapping* (Pemetaan) data dari UI ke format API. Contohnya: status "Open" dikonversi menjadi ID `1`, prioritas "High" menjadi ID `3`.
- **Baris 205-215:** **Fungsi Utama Fetching.** Aplikasi memanggil `ticketsApi.getTickets` yang pada dasarnya menembak endpoint `/api/v1/tickets` di *backend*. Jika tidak ada tiket atau pengguna bukan admin tingkat tinggi, sistem melakukan *fallback* otomatis (baris 218) untuk memanggil `/api/v1/tickets/my` (tiket milik sendiri).
- **Baris 236-278:** **Integrasi Supabase (Fallback).** Kode juga memiliki mekanisme untuk memeriksa `/api/tickets/supabase/list` jika ada tiket dari *database* lama (Supabase) yang belum disinkronisasi dengan API utama. Jika ditemukan, data tiket dari API utama dan Supabase digabungkan (*merge*).

### B. Pengambilan & Penyusunan UI (Baris 725 - 1438)
UI halaman ini dibangun menggunakan **Tailwind CSS** dan komponen dari **Radix UI** (yang dibungkus di dalam folder `src/components/ui/`).

- **Header & Tab Status (Baris 736 - 781):**
  - Menggunakan elemen `<button>` yang di-*looping* (diulang) dari _array_ `["Open", "In Progress", "Answered", "On Hold", "Closed"]`.
  - Menggunakan Tailwind untuk efek aktif: `text-emerald-600 border-b-2 bg-emerald-50/50`.
  - **Badge (Baris 770):** Menampilkan jumlah/total tiket untuk status tersebut (misalnya 12 Open). Datanya diambil dari state `statusCounts` yang di-*fetch* melalui fungsi `loadStats()`.

- **Toolbar & Filter (Baris 793 - ...):**
  - **Dropdown Ekspor (Baris 798):** Menggunakan `DropdownMenu` dari Radix UI untuk memunculkan tombol *Export to CSV/Excel/Print*. Fungsi ekspor ditulis manual di `handleExport()` (Baris 521).
  - **Input Pencarian (Search):** Terdapat form input dengan ikon `Search` (dari `lucide-react`). Setiap kali pengguna menekan *Enter*, fungsi `loadTickets` akan memuat ulang data dengan parameter `keyword`.
  - **Filter Modal (Popover):** Digunakan untuk mem-filter berdasarkan Prioritas atau Departemen.

- **Tabel Daftar Tiket:**
  - Menggunakan tag HTML biasa (`<table>`, `<thead>`, `<tbody>`).
  - Baris tabel di-*looping* dari state `tickets`. Jika `tickets` kosong, memunculkan status *Empty State* ("No tickets found").
  - Menampilkan *Badge* prioritas memanggil fungsi `getPriorityConfig(ticket.priority)` (Baris 654) untuk menentukan warna teks/background.

### C. Fungsi-Fungsi Penting Lainnya
- **Pagination (Paginasi):** Menggunakan state `currentPage` dan `itemsPerPage` (disetel baku ke 10). Jika `currentPage` berubah, efek akan memicu `loadTickets` ulang dengan `offset` baru.
- **Bulk Actions (Aksi Massal):** Fitur mencentang (*checkbox*) beberapa tiket dan melakukan update massal. Berada di fungsi `handleBulkConfirm()` (Baris 608). Ia memanggil *service* `bulkDeleteTickets` atau `bulkUpdateTickets`.

---

## 2. Formulir Tiket Baru (`NewTicketFormWrapper.tsx`)
**Lokasi File:** `src/components/Support/NewTicketFormWrapper.tsx`

File ini menangani halaman pembuatan tiket dukungan (*Support Ticket*) baru.

### A. Pengambilan Data Pengguna (Baris 33 - 45)
- Begitu komponen dimuat (`useEffect`), ia mengambil data `auth` dari `getStoredAuth()` di `src/lib/api.ts`.
- Tujuannya adalah untuk mengisi nama kontak (`currentUser.name`) secara otomatis, sehingga admin/pengguna tidak perlu mengetik nama mereka lagi.

### B. Fungsi Submit / API Insert (Baris 64 - 97)
- **Validasi:** Mengecek apakah *Subject* dan *Body* sudah diisi (Baris 65-66).
- **API Call (Baris 73):** Memanggil fungsi `createTicket()` dari folder `utils/api/tickets/insert.ts`. Secara internal, ini akan melakukan POST *request* ke API Backend.
- Jika sukses (`result.success`), halaman otomatis mengarahkan (`router.push`) pengguna ke halaman detail tiket yang baru saja dibuat.

### C. Struktur UI (Baris 100 - 263)
- **Toast Notifikasi (Baris 101-106):** Jika sukses, UI memunculkan *banner* berwarna hijau (Tailwind: `bg-emerald-500 text-white`) di sudut kanan atas.
- **Input Text & Select (Baris 131 - 175):** Form untuk `Subject`, `Department` (Marketing, Billing, Support), dan `Priority`. Menggunakan kelas Tailwind untuk memberikan efek transisi fokus (`focus:ring-2 focus:ring-emerald-500`).
- **Lampiran (Attachments) (Baris 191 - 244):** 
  - Terdapat input tipe `file` yang *hidden* (disembunyikan), dan digantikan dengan tombol "Choose Files" menggunakan `<label htmlFor="file-upload">`.
  - Fungsi `handleFileChange()` (Baris 47) membaca file dengan `FileReader` dan menyimpannya ke state `attachments` untuk ditampilkan sebagai list di bawah tombol (walaupun di kode ini *upload* asli ke server sepertinya belum diimplementasikan di *payload* `handleSubmit`).

---

## Ringkasan Alur (Flow)
1. User masuk ke `/support/tickets`. UI membaca komponen `SupportTicketsPage`.
2. `useEffect` berjalan, mengambil *token* pengguna.
3. Fungsi `loadTickets` mengirim HTTP GET ke `https://api.myqurani.com/api/v1/tickets`.
4. State `tickets` terisi, memicu render ulang tabel. UI Radix & Tailwind menyusun warnanya.
5. Jika User menekan tombol "New Ticket", diarahkan ke komponen `NewTicketFormWrapper`.
6. User mengisi form, lalu sistem menembak fungsi `createTicket` (HTTP POST) dan mengembalikan pengguna ke halaman detail tiket.
