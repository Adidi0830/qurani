// --- sim-setoran.ts ---------------------------------------------------------
// Data dummy hasil setoran untuk sim user (SIM_USERS 889977665544101-112).
// Disimpan terpisah agar tab Setoran di halaman user dan tabel recitation
// admin tetap terisi meski API recaps hanya berisi data testing.

import { IRecap } from "@/types/recap"
import { UserProfile } from "@/types/database.types"
import { SIM_USERS, SIM_TRAINERS } from "@/data/sim-dummy-users"

const MEMBER_IDS = [
    889977665544101,
    889977665544102,
    889977665544103,
    889977665544104,
    889977665544105,
    889977665544106,
    889977665544107,
    889977665544108,
    889977665544109,
    889977665544110,
    889977665544111,
    889977665544112,
]

function toUserProfile(input: {
    id: string
    name: string
    username: string
    avatar?: string
    email: string
    isVerify: boolean
}): UserProfile {
    return {
        id: input.id,
        name: input.name,
        username: input.username,
        nickname: null,
        gender: null,
        dob: null,
        job: null,
        bio: null,
        email: input.email,
        hp: null,
        avatar: input.avatar || null,
        countryName: null,
        stateName: null,
        cityName: null,
        countryId: null,
        stateId: null,
        cityId: null,
        role: null,
        isBlocked: null,
        isVerify: input.isVerify,
        timezone: null,
        created: null,
        auth: "",
    }
}

function reciterProfile(userId: number): UserProfile | null {
    const u = SIM_USERS[userId]
    if (!u) return null
    return toUserProfile({
        id: String(userId),
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        email: u.email,
        isVerify: u.isVerify,
    })
}

function examinerProfile(trainerId: number): UserProfile | null {
    const t = SIM_TRAINERS[trainerId]
    if (!t) return null
    return toUserProfile({
        id: String(t.userId || t.id),
        name: t.name,
        username: t.username,
        avatar: t.avatar,
        email: t.email,
        isVerify: true,
    })
}

interface SimSetoranSeed {
    reciterId: number
    trainerId: number
    id: string
    type: "group" | "friend"
    recitation_type: string
    memorization_type: "surah" | "juz" | "page" | "praquran"
    memorization: string
    conclusion: string
    mistakesCount: number
    created_at: string
    paraf: boolean
    groupName?: string
}

const SEEDS: SimSetoranSeed[] = [
    // Siti Rahmawati
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-01", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Fatihah:1 - Al-Fatihah:7", conclusion: "excellent", mistakesCount: 0, created_at: "2026-07-14T08:30:00.000Z", paraf: true, groupName: "Tahsin Ummi Pagi" },
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-02", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "An-Nas:1 - An-Nas:6", conclusion: "very_good", mistakesCount: 1, created_at: "2026-07-21T08:30:00.000Z", paraf: true },
    { reciterId: 889977665544101, trainerId: 301, id: "sim-setoran-101-03", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 1", conclusion: "good", mistakesCount: 3, created_at: "2026-08-02T07:00:00.000Z", paraf: false },
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-04", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "pass", mistakesCount: 5, created_at: "2026-08-18T09:00:00.000Z", paraf: false, groupName: "Murojaah Juz 30" },
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-05", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Baqarah:1 - Al-Baqarah:5", conclusion: "good", mistakesCount: 2, created_at: "2026-08-20T08:30:00.000Z", paraf: true, groupName: "Tahsin Ummi Pagi" },
    { reciterId: 889977665544101, trainerId: 301, id: "sim-setoran-101-06", type: "friend", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 2", conclusion: "very_good", mistakesCount: 1, created_at: "2026-08-22T08:30:00.000Z", paraf: true },
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-07", type: "group", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 29", conclusion: "excellent", mistakesCount: 0, created_at: "2026-08-25T07:00:00.000Z", paraf: true, groupName: "Murojaah Juz 29" },
    { reciterId: 889977665544101, trainerId: 301, id: "sim-setoran-101-08", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Mulk:1 - Al-Mulk:5", conclusion: "good", mistakesCount: 3, created_at: "2026-08-28T09:00:00.000Z", paraf: false },
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-09", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 3", conclusion: "pass", mistakesCount: 4, created_at: "2026-09-02T08:30:00.000Z", paraf: false, groupName: "Tahfidz Ummi Pagi" },
    { reciterId: 889977665544101, trainerId: 301, id: "sim-setoran-101-10", type: "friend", recitation_type: "Murojaah", memorization_type: "surah", memorization: "Yasin:1 - Yasin:10", conclusion: "very_good", mistakesCount: 1, created_at: "2026-09-05T08:30:00.000Z", paraf: true },
    { reciterId: 889977665544101, trainerId: 302, id: "sim-setoran-101-11", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Ar-Rahman:1 - Ar-Rahman:5", conclusion: "excellent", mistakesCount: 0, created_at: "2026-09-10T07:00:00.000Z", paraf: true, groupName: "Tahsin Ummi Pagi" },

    // Ahmad Fauzan
    { reciterId: 889977665544102, trainerId: 303, id: "sim-setoran-102-01", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Baqarah:1 - Al-Baqarah:5", conclusion: "good", mistakesCount: 3, created_at: "2026-06-03T19:00:00.000Z", paraf: true, groupName: "Tahsin Malam" },
    { reciterId: 889977665544102, trainerId: 303, id: "sim-setoran-102-02", type: "friend", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 18", conclusion: "very_good", mistakesCount: 1, created_at: "2026-06-10T19:00:00.000Z", paraf: true },
    { reciterId: 889977665544102, trainerId: 305, id: "sim-setoran-102-03", type: "group", recitation_type: "Tahfidz", memorization_type: "surah", memorization: "Al-Mulk:1 - Al-Mulk:10", conclusion: "excellent", mistakesCount: 0, created_at: "2026-07-05T20:00:00.000Z", paraf: true, groupName: "Halaqah Tahfidz" },
    { reciterId: 889977665544102, trainerId: 303, id: "sim-setoran-102-04", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Yasin:1 - Yasin:5", conclusion: "weak", mistakesCount: 7, created_at: "2026-08-12T19:30:00.000Z", paraf: false },

    // Siti Aminah
    { reciterId: 889977665544103, trainerId: 302, id: "sim-setoran-103-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Ikhlas:1 - Al-Ikhlas:4", conclusion: "excellent", mistakesCount: 0, created_at: "2026-05-11T06:00:00.000Z", paraf: true },
    { reciterId: 889977665544103, trainerId: 302, id: "sim-setoran-103-02", type: "group", recitation_type: "Tahfidz", memorization_type: "juz", memorization: "Juz 30", conclusion: "pass", mistakesCount: 5, created_at: "2026-06-01T06:00:00.000Z", paraf: true, groupName: "Kajian Subuh" },
    { reciterId: 889977665544103, trainerId: 304, id: "sim-setoran-103-03", type: "friend", recitation_type: "Murojaah", memorization_type: "page", memorization: "Page 45", conclusion: "good", mistakesCount: 3, created_at: "2026-07-08T06:30:00.000Z", paraf: false },
    { reciterId: 889977665544103, trainerId: 302, id: "sim-setoran-103-04", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Falaq:1 - Al-Falaq:5", conclusion: "very_good", mistakesCount: 1, created_at: "2026-08-20T06:00:00.000Z", paraf: false, groupName: "Tahsin Subuh" },

    // Budi Santoso
    { reciterId: 889977665544104, trainerId: 303, id: "sim-setoran-104-01", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Fatihah:1 - Al-Fatihah:7", conclusion: "good", mistakesCount: 3, created_at: "2026-06-15T05:30:00.000Z", paraf: true, groupName: "Tahsin Pagi" },
    { reciterId: 889977665544104, trainerId: 303, id: "sim-setoran-104-02", type: "friend", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 9", conclusion: "very_good", mistakesCount: 2, created_at: "2026-06-22T05:30:00.000Z", paraf: true },
    { reciterId: 889977665544104, trainerId: 301, id: "sim-setoran-104-03", type: "group", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 1", conclusion: "pass", mistakesCount: 4, created_at: "2026-07-17T05:30:00.000Z", paraf: false, groupName: "Murojaah Rutin" },
    { reciterId: 889977665544104, trainerId: 303, id: "sim-setoran-104-04", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "An-Naba:1 - An-Naba:10", conclusion: "not_pass", mistakesCount: 9, created_at: "2026-08-25T05:30:00.000Z", paraf: false },

    // Dewi Rahayu
    { reciterId: 889977665544105, trainerId: 304, id: "sim-setoran-105-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Kautsar:1 - Al-Kautsar:3", conclusion: "excellent", mistakesCount: 0, created_at: "2026-06-20T08:00:00.000Z", paraf: true },
    { reciterId: 889977665544105, trainerId: 304, id: "sim-setoran-105-02", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 32", conclusion: "good", mistakesCount: 3, created_at: "2026-07-04T08:00:00.000Z", paraf: true, groupName: "Madrasah Diniyah" },
    { reciterId: 889977665544105, trainerId: 302, id: "sim-setoran-105-03", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "very_good", mistakesCount: 1, created_at: "2026-07-25T08:30:00.000Z", paraf: true },
    { reciterId: 889977665544105, trainerId: 304, id: "sim-setoran-105-04", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Ad-Dhuha:1 - Ad-Dhuha:11", conclusion: "pass", mistakesCount: 5, created_at: "2026-08-15T08:00:00.000Z", paraf: false, groupName: "Tahsin Ibu-Ibu" },

    // Nur Hidayah
    { reciterId: 889977665544106, trainerId: 302, id: "sim-setoran-106-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Asr:1 - Al-Asr:3", conclusion: "excellent", mistakesCount: 0, created_at: "2026-05-30T13:00:00.000Z", paraf: true },
    { reciterId: 889977665544106, trainerId: 301, id: "sim-setoran-106-02", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 12", conclusion: "very_good", mistakesCount: 1, created_at: "2026-06-13T13:00:00.000Z", paraf: true, groupName: "Setoran Online" },
    { reciterId: 889977665544106, trainerId: 302, id: "sim-setoran-106-03", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 29", conclusion: "weak", mistakesCount: 6, created_at: "2026-07-11T13:30:00.000Z", paraf: false },
    { reciterId: 889977665544106, trainerId: 305, id: "sim-setoran-106-04", type: "group", recitation_type: "Tahfidz", memorization_type: "surah", memorization: "Ar-Rahman:1 - Ar-Rahman:5", conclusion: "good", mistakesCount: 3, created_at: "2026-08-22T13:00:00.000Z", paraf: false, groupName: "Halaqah Online" },

    // Nia Hidayati
    { reciterId: 889977665544107, trainerId: 304, id: "sim-setoran-107-01", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Fatihah:1 - Al-Fatihah:7", conclusion: "good", mistakesCount: 2, created_at: "2026-06-08T07:00:00.000Z", paraf: true, groupName: "Tahsin Guru Ngaji" },
    { reciterId: 889977665544107, trainerId: 304, id: "sim-setoran-107-02", type: "friend", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 26", conclusion: "very_good", mistakesCount: 2, created_at: "2026-06-29T07:00:00.000Z", paraf: true },
    { reciterId: 889977665544107, trainerId: 302, id: "sim-setoran-107-03", type: "group", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "pass", mistakesCount: 5, created_at: "2026-07-27T07:00:00.000Z", paraf: true, groupName: "Murojaah Sabtu" },
    { reciterId: 889977665544107, trainerId: 304, id: "sim-setoran-107-04", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Lail:1 - Al-Lail:10", conclusion: "good", mistakesCount: 4, created_at: "2026-08-24T07:00:00.000Z", paraf: false },

    // Farid Al-Amin
    { reciterId: 889977665544108, trainerId: 301, id: "sim-setoran-108-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Baqarah:1 - Al-Baqarah:5", conclusion: "very_good", mistakesCount: 2, created_at: "2026-06-17T21:00:00.000Z", paraf: true },
    { reciterId: 889977665544108, trainerId: 301, id: "sim-setoran-108-02", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 40", conclusion: "excellent", mistakesCount: 0, created_at: "2026-07-01T21:00:00.000Z", paraf: true, groupName: "Tahfidz Sore" },
    { reciterId: 889977665544108, trainerId: 305, id: "sim-setoran-108-03", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 3", conclusion: "pass", mistakesCount: 5, created_at: "2026-07-21T21:00:00.000Z", paraf: false },
    { reciterId: 889977665544108, trainerId: 301, id: "sim-setoran-108-04", type: "group", recitation_type: "Tahfidz", memorization_type: "surah", memorization: "Al-Waqi'ah:1 - Al-Waqi'ah:10", conclusion: "good", mistakesCount: 3, created_at: "2026-08-19T21:00:00.000Z", paraf: false, groupName: "Tahfidz Malam" },

    // Halimah Tussa'diyah
    { reciterId: 889977665544109, trainerId: 302, id: "sim-setoran-109-01", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "At-Tin:1 - At-Tin:8", conclusion: "good", mistakesCount: 3, created_at: "2026-05-25T09:00:00.000Z", paraf: true, groupName: "Tahsin Muslimah" },
    { reciterId: 889977665544109, trainerId: 302, id: "sim-setoran-109-02", type: "friend", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 55", conclusion: "very_good", mistakesCount: 1, created_at: "2026-06-16T09:00:00.000Z", paraf: true },
    { reciterId: 889977665544109, trainerId: 304, id: "sim-setoran-109-03", type: "group", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "pass", mistakesCount: 6, created_at: "2026-07-14T09:00:00.000Z", paraf: false, groupName: "Murojaah Pekanan" },
    { reciterId: 889977665544109, trainerId: 302, id: "sim-setoran-109-04", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Qadr:1 - Al-Qadr:5", conclusion: "excellent", mistakesCount: 0, created_at: "2026-08-26T09:00:00.000Z", paraf: false },

    // Muhammad Yusuf
    { reciterId: 889977665544110, trainerId: 301, id: "sim-setoran-110-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Ma'un:1 - Al-Ma'un:7", conclusion: "excellent", mistakesCount: 0, created_at: "2026-06-05T20:00:00.000Z", paraf: true },
    { reciterId: 889977665544110, trainerId: 301, id: "sim-setoran-110-02", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 22", conclusion: "very_good", mistakesCount: 1, created_at: "2026-06-19T20:00:00.000Z", paraf: true, groupName: "Setoran Tahfidz" },
    { reciterId: 889977665544110, trainerId: 305, id: "sim-setoran-110-03", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "good", mistakesCount: 3, created_at: "2026-07-10T20:00:00.000Z", paraf: true },
    { reciterId: 889977665544110, trainerId: 301, id: "sim-setoran-110-04", type: "group", recitation_type: "Tahfidz", memorization_type: "surah", memorization: "Ad-Dukhan:1 - Ad-Dukhan:5", conclusion: "pass", mistakesCount: 4, created_at: "2026-08-21T20:00:00.000Z", paraf: false, groupName: "Tahfidz Intensif" },

    // Fauzia Nurrohma
    { reciterId: 889977665544111, trainerId: 302, id: "sim-setoran-111-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Humazah:1 - Al-Humazah:9", conclusion: "very_good", mistakesCount: 1, created_at: "2026-06-09T10:00:00.000Z", paraf: true },
    { reciterId: 889977665544111, trainerId: 304, id: "sim-setoran-111-02", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 60", conclusion: "good", mistakesCount: 3, created_at: "2026-06-30T10:00:00.000Z", paraf: true, groupName: "Tahfidz Remaja" },
    { reciterId: 889977665544111, trainerId: 302, id: "sim-setoran-111-03", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "weak", mistakesCount: 7, created_at: "2026-07-23T10:00:00.000Z", paraf: false },
    { reciterId: 889977665544111, trainerId: 304, id: "sim-setoran-111-04", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Kafirun:1 - Al-Kafirun:6", conclusion: "excellent", mistakesCount: 0, created_at: "2026-08-28T10:00:00.000Z", paraf: false, groupName: "Tahsin Akhwat" },

    // Rahma Aulia
    { reciterId: 889977665544112, trainerId: 302, id: "sim-setoran-112-01", type: "friend", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Fatihah:1 - Al-Fatihah:7", conclusion: "good", mistakesCount: 3, created_at: "2026-06-02T15:00:00.000Z", paraf: true },
    { reciterId: 889977665544112, trainerId: 303, id: "sim-setoran-112-02", type: "group", recitation_type: "Tahfidz", memorization_type: "page", memorization: "Page 7", conclusion: "excellent", mistakesCount: 0, created_at: "2026-06-23T15:00:00.000Z", paraf: true, groupName: "Tahfidz Malam" },
    { reciterId: 889977665544112, trainerId: 302, id: "sim-setoran-112-03", type: "friend", recitation_type: "Murojaah", memorization_type: "juz", memorization: "Juz 30", conclusion: "pass", mistakesCount: 5, created_at: "2026-07-18T15:00:00.000Z", paraf: false },
    { reciterId: 889977665544112, trainerId: 303, id: "sim-setoran-112-04", type: "group", recitation_type: "Tahsin", memorization_type: "surah", memorization: "Al-Bayyinah:1 - Al-Bayyinah:8", conclusion: "very_good", mistakesCount: 2, created_at: "2026-08-23T15:00:00.000Z", paraf: false, groupName: "Tahsin Akhwat" },
]

function buildRecap(seed: SimSetoranSeed): IRecap {
    const mistakes = seed.mistakesCount > 0
        ? Array.from({ length: seed.mistakesCount }, (_, i) => ({
            color: "red" as const,
            text_uthman: `${seed.memorization.split(":")[0]} ${i + 1}`,
            type: "word" as const,
            word: `salah-${i + 1}`,
        }))
        : []

    return {
        id: seed.id,
        type: seed.type,
        reciter_id: String(seed.reciterId),
        recitation_type: seed.recitation_type,
        memorization_type: seed.memorization_type,
        memorization: seed.memorization,
        conclusion: seed.conclusion,
        notes: "",
        mistakes,
        group_id: seed.type === "group" ? `sim-group-${seed.reciterId}` : null,
        examiner_id: String(SIM_TRAINERS[seed.trainerId].userId),
        created_at: seed.created_at,
        paraf: seed.paraf,
        is_praquran: false,
        sketch_img_url: null,
        signed_by: seed.paraf ? examinerProfile(seed.trainerId) : null,
        signed_at: seed.paraf ? new Date(new Date(seed.created_at).getTime() + 15 * 60000).toISOString() : null,
        group: seed.type === "group"
            ? {
                id: `sim-group-${seed.reciterId}`,
                name: seed.groupName || "Kelompok Tahsin",
                description: null,
                is_private: true,
                created_at: seed.created_at,
                grup_members: [{ count: 1 }],
            }
            : undefined,
        examiner: examinerProfile(seed.trainerId) || undefined,
        reciter: reciterProfile(seed.reciterId) || undefined,
    }
}

export const SIM_SETORANS: IRecap[] = SEEDS.map(buildRecap)

export function getSimSetoransByUser(userId: string | number): IRecap[] {
    const key = String(userId)
    return SIM_SETORANS.filter((r) => r.reciter_id === key)
}

export const SIM_SETORAN_USER_IDS = MEMBER_IDS