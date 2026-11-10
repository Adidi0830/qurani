// --- sim-dummy-users.ts ---------------------------------------------------
// Sumber kebenaran tunggal untuk semua data dummy user & trainer.
// userId  889977665544101-889977665544110 = Member/User
// trainerId 301-305 = Trainer/Guru

export interface SimUserProfile {
    id: number
    name: string
    username: string
    email: string
    hp?: string
    gender?: "m" | "f"
    dob?: string
    job?: string
    timezone?: string
    bio?: string
    cityName?: string
    stateName?: string
    countryName?: string
    role: string
    isVerify: boolean
    isBlocked: boolean
    created_at: string
    avatar?: string
}

export interface SimTrainerProfile {
    id: number
    name: string
    email: string
    username: string
    avatar?: string
    specialty?: string
    userId?: number
}

// --- USER REGISTRY (Member) ------------------------------------------------

export const SIM_USERS: Record<number, SimUserProfile> = {
    889977665544101: { id: 889977665544101, name: "Siti Rahmawati", username: "siti_rahma", email: "siti.rahma@gmail.com", hp: "081234567801", gender: "f", dob: "1995-03-12", job: "Guru SD", timezone: "Asia/Jakarta", bio: "Ibu rumah tangga yang ingin memperdalam ilmu Al-Quran.", cityName: "Jakarta Selatan", stateName: "DKI Jakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-06-15T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=47" },
    889977665544102: { id: 889977665544102, name: "Ahmad Fauzan", username: "fauzan_ahmad", email: "ahmad.fauzan@gmail.com", hp: "081234567802", gender: "m", dob: "1992-07-20", job: "Wiraswasta", timezone: "Asia/Jakarta", bio: "Pengusaha muda yang aktif mengaji setiap hari.", cityName: "Bandung", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-07-01T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=12" },
    889977665544103: { id: 889977665544103, name: "Siti Aminah", username: "siti_a", email: "siti.aminah@yahoo.com", hp: "081234567803", gender: "f", dob: "1998-11-05", job: "Mahasiswa", timezone: "Asia/Makassar", bio: "Mahasiswi Teknik yang hobi menghafal Al-Quran.", cityName: "Makassar", stateName: "Sulawesi Selatan", countryName: "Indonesia", role: "member", isVerify: false, isBlocked: false, created_at: "2025-08-10T10:30:00.000Z", avatar: "https://i.pravatar.cc/150?img=48" },
    889977665544104: { id: 889977665544104, name: "Budi Santoso", username: "budi_santoso", email: "budi.santoso@email.com", hp: "081234567804", gender: "m", dob: "1988-09-30", job: "PNS", timezone: "Asia/Jakarta", bio: "Pegawai negeri yang ingin belajar tajwid lebih dalam.", cityName: "Surabaya", stateName: "Jawa Timur", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-05-20T07:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=33" },
    889977665544105: { id: 889977665544105, name: "Dewi Rahayu", username: "dewi_rahayu", email: "dewi.rahayu@gmail.com", hp: "081234567805", gender: "f", dob: "1993-04-18", job: "Karyawan Swasta", timezone: "Asia/Jakarta", bio: "Ingin memperbaiki bacaan Quran sejak kecil dan mengajari keluarga.", cityName: "Yogyakarta", stateName: "DI Yogyakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-04-05T06:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=44" },
    889977665544106: { id: 889977665544106, name: "Nur Hidayah", username: "nur_hidayah", email: "nur.hidayah@gmail.com", hp: "081234567806", gender: "f", dob: "2000-01-25", job: "Freelancer", timezone: "Asia/Jakarta", bio: "Desainer grafis yang ingin lebih dekat dengan Al-Quran.", cityName: "Semarang", stateName: "Jawa Tengah", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-09-01T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=49" },
    889977665544107: { id: 889977665544107, name: "Nia Hidayati", username: "nia_hidayati", email: "nia.hidayati@mail.com", hp: "081234567807", gender: "f", dob: "1996-08-10", job: "Guru Ngaji", timezone: "Asia/Jakarta", bio: "Guru ngaji yang ingin meningkatkan kualitas mengajar Al-Quran.", cityName: "Bekasi", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-10-10T07:30:00.000Z", avatar: "https://i.pravatar.cc/150?img=46" },
    889977665544108: { id: 889977665544108, name: "Farid Al-Amin", username: "farid_alamin", email: "farid.alamin@edu.id", hp: "081234567808", gender: "m", dob: "1993-06-15", job: "Dokter", timezone: "Asia/Medan", bio: "Dokter yang rutin mengaji setelah jam praktik.", cityName: "Medan", stateName: "Sumatera Utara", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-03-20T06:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=15" },
    889977665544109: { id: 889977665544109, name: "Halimah Tussa'diyah", username: "halimah_ts", email: "halimah.ts@gmail.com", hp: "081234567809", gender: "f", dob: "1985-12-08", job: "Wiraswasta", timezone: "Asia/Jakarta", bio: "Ingin memperbaiki bacaan Al-Quran untuk mengajari anak-anak.", cityName: "Bogor", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2025-11-05T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=52" },
    889977665544110: { id: 889977665544110, name: "Muhammad Yusuf", username: "m_yusuf", email: "m.yusuf@qurani.id", hp: "081234567810", gender: "m", dob: "1997-02-14", job: "Software Engineer", timezone: "Asia/Jakarta", bio: "Programmer yang menyempatkan waktu untuk belajar tajwid setiap malam.", cityName: "Depok", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2026-01-12T10:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=57" },
    889977665544111: { id: 889977665544111, name: "Fauzia Nurrohma", username: "fauzianurrohma", email: "fauzia.nurrohma@gmail.com", hp: "081234567811", gender: "f", dob: "2001-05-17", job: "Mahasiswa", timezone: "Asia/Jakarta", bio: "Mahasiswi yang ingin memperdalam bacaan Al-Quran sejak dini.", cityName: "Tangerang", stateName: "Banten", countryName: "Indonesia", role: "member", isVerify: false, isBlocked: false, created_at: "2026-03-15T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=41" },
    889977665544112: { id: 889977665544112, name: "Rahma Aulia", username: "rahmaaulia", email: "rahma.aulia@gmail.com", hp: "081234567812", gender: "f", dob: "1999-09-23", job: "Karyawan Swasta", timezone: "Asia/Jakarta", bio: "Karyawati yang ingin belajar Al-Quran di sela kesibukan kerja.", cityName: "Jakarta Timur", stateName: "DKI Jakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2026-03-20T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=43" },
    
    // Users for Trainers
    889977665544201: { id: 889977665544201, name: "Hasyim Asy'ari, Lc", username: "hasyim_asyari", email: "hasyim.asyari@qurani.id", hp: "081234567821", gender: "m", dob: "1985-05-15", job: "Wiraswasta", timezone: "Asia/Jakarta", bio: "Pengajar berpengalaman.", cityName: "Jakarta", stateName: "DKI Jakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2024-01-10T08:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=57" },
    889977665544202: { id: 889977665544202, name: "Indi Fitriani", username: "indi_fitriani", email: "indi.fitriani@qurani.id", hp: "081234567822", gender: "f", dob: "1992-08-20", job: "Pengajar Quran", timezone: "Asia/Jakarta", bio: "Fokus pada makhraj dan tajwid.", cityName: "Bandung", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2024-02-15T09:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=47" },
    889977665544203: { id: 889977665544203, name: "Iwan", username: "iwansudrajat", email: "iwan.trainer@qurani.id", hp: "081234567823", gender: "m", dob: "1988-11-05", job: "Guru Agama", timezone: "Asia/Jakarta", bio: "Berpengalaman mengajar Tahsin.", cityName: "Surabaya", stateName: "Jawa Timur", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2024-03-20T10:30:00.000Z", avatar: "https://i.pravatar.cc/150?img=60" },
    889977665544204: { id: 889977665544204, name: "Aisyah", username: "siti_aisyah", email: "aisyah.trainer@qurani.id", hp: "081234567824", gender: "f", dob: "1995-09-30", job: "Guru Ngaji", timezone: "Asia/Jakarta", bio: "Spesialis mengajar anak-anak.", cityName: "Bogor", stateName: "Jawa Barat", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2024-04-10T07:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=45" },
    889977665544205: { id: 889977665544205, name: "Zain Al-Fattah", username: "zain_alfattah", email: "zain.alfattah@qurani.id", hp: "081234567825", gender: "m", dob: "1990-04-18", job: "Hafidz", timezone: "Asia/Jakarta", bio: "Pengajar Tahfidz Intensif.", cityName: "Yogyakarta", stateName: "DI Yogyakarta", countryName: "Indonesia", role: "member", isVerify: true, isBlocked: false, created_at: "2024-05-05T06:00:00.000Z", avatar: "https://i.pravatar.cc/150?img=30" }
}

// --- TRAINER REGISTRY (Guru) -----------------------------------------------

export const SIM_TRAINERS: Record<number, SimTrainerProfile> = {
    301: { id: 301, name: "Hasyim Asy'ari, Lc", email: "hasyim.asyari@qurani.id", username: "hasyim_asyari", avatar: "https://i.pravatar.cc/150?img=57", specialty: "Tahfidz & Tajwid", userId: 889977665544201 },
    302: { id: 302, name: "Indi Fitriani", email: "indi.fitriani@qurani.id", username: "indi_fitriani", avatar: "https://i.pravatar.cc/150?img=47", specialty: "Tilawah & Tartil", userId: 889977665544202 },
    303: { id: 303, name: "Iwan", email: "iwan.trainer@qurani.id", username: "iwansudrajat", avatar: "https://i.pravatar.cc/150?img=60", specialty: "Tahsin & Makhraj", userId: 889977665544203 },
    304: { id: 304, name: "Aisyah", email: "aisyah.trainer@qurani.id", username: "siti_aisyah", avatar: "https://i.pravatar.cc/150?img=45", specialty: "Quran untuk Anak", userId: 889977665544204 },
    305: { id: 305, name: "Zain Al-Fattah", email: "zain.alfattah@qurani.id", username: "zain_alfattah", avatar: "https://i.pravatar.cc/150?img=30", specialty: "Tahfidz Intensif", userId: 889977665544205 }
}

// --- Helper functions -------------------------------------------------------

/** Ambil data user berdasarkan ID, return null jika tidak ditemukan */
export function getSimUser(userId: number | string): SimUserProfile | null {
    return SIM_USERS[Number(userId)] ?? null
}

/** Ambil data trainer berdasarkan ID */
export function getSimTrainer(trainerId: number | string): SimTrainerProfile | null {
    return SIM_TRAINERS[Number(trainerId)] ?? null
}

/** Ambil data trainer berdasarkan username */
export function getSimTrainerByUsername(username: string): SimTrainerProfile | null {
    return Object.values(SIM_TRAINERS).find(t => t.username === username) ?? null
}

/** Ambil data user berdasarkan username */
export function getSimUserByUsername(username: string): SimUserProfile | null {
    return Object.values(SIM_USERS).find(u => u.username === username) ?? null
}

/**
 * Resolve URL slug (bisa berupa username string atau numeric ID string)
 * ke trainer data. Return { id, simTrainer }.
 * - Slug numerik → treat sebagai trainer ID (backward compat & real API)
 * - Slug string → lookup di SIM_TRAINERS by username
 */
export function resolveTrainerSlug(slug: string): { id: number; simTrainer: SimTrainerProfile | null } {
    if (/^\d+$/.test(slug)) {
        const id = Number(slug)
        return { id, simTrainer: SIM_TRAINERS[id] ?? null }
    }
    const simTrainer = getSimTrainerByUsername(slug)
    return { id: simTrainer?.id ?? 0, simTrainer }
}

/**
 * Resolve URL slug ke user data. Return { userId, simUser }.
 * - Slug numerik → treat sebagai userId (backward compat & real API)
 * - Slug string → lookup di SIM_USERS by username
 */
export function resolveUserSlug(slug: string): { userId: string; simUser: SimUserProfile | null } {
    if (/^\d+$/.test(slug)) {
        return { userId: slug, simUser: SIM_USERS[Number(slug)] ?? null }
    }
    const simUser = getSimUserByUsername(slug)
    return { userId: simUser ? String(simUser.id) : "", simUser }
}

/**
 * Ambil slug URL yang akan dipakai sebagai path segment untuk trainer.
 * Prioritas: username sim data > string ID.
 * Menerima undefined/null dan mengembalikan string kosong.
 */
export function getTrainerSlug(trainerId: number | string | undefined | null): string {
    if (trainerId === undefined || trainerId === null || trainerId === "") return ""
    const sim = SIM_TRAINERS[Number(trainerId)]
    return sim?.username ?? String(trainerId)
}

/**
 * Ambil slug URL yang akan dipakai sebagai path segment untuk user.
 * Prioritas: username sim data > string userId.
 * Menerima undefined/null dan mengembalikan string kosong.
 */
export function getUserSlug(userId: number | string | undefined | null): string {
    if (userId === undefined || userId === null || userId === "") return ""
    const sim = SIM_USERS[Number(userId)]
    return sim?.username ?? String(userId)
}

/** Ambil user object ringkas untuk dipakai di transaksi/entries */
export function getSimUserShort(userId: number | string) {
    const u = getSimUser(userId)
    if (!u) return { name: `User #${userId}`, username: undefined, email: undefined, avatar: undefined }
    return { name: u.name, username: u.username, email: u.email, avatar: u.avatar }
}
