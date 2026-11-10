"use server"

import { createClient } from "@/utils/supabase/server";

// Interface for statistik data processing
interface StatistikRecap {
    id: string;
    created_at: string;
    memorization_type: string;
    reciter_id: string;
    group_id: string | null;
    group?: {
        name: string;
    } | {
        name: string;
    }[] | null;
}

// Function to generate time series data for charts based on period type
async function generateChartTimeSeriesData(
    supabase: Awaited<ReturnType<typeof createClient>>,
    startDate?: string,
    endDate?: string
) {
    // Determine period type based on date range
    const isPeriodSpecified = startDate && endDate;
    let periodType = 'monthly'; // default
    
    if (isPeriodSpecified) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
        
        // If period is <= 35 days (about a month), show daily data
        // If period is >= 300 days (about a year), show monthly data
        if (diffInDays <= 35) {
            periodType = 'daily';
        } else if (diffInDays >= 300) {
            periodType = 'monthly';
        } else {
            periodType = 'weekly'; // intermediate period
        }
    }
    
    if (periodType === 'daily') {
        return await generateDailyData(supabase, startDate!, endDate!);
    } else if (periodType === 'monthly') {
        return await generateMonthlyData(supabase, startDate, endDate);
    } else {
        return await generateWeeklyData(supabase, startDate!, endDate!);
    }
}

// Generate daily data for monthly periods
async function generateDailyData(
    supabase: Awaited<ReturnType<typeof createClient>>,
    startDate: string,
    endDate: string
) {
    // Get daily user registrations
    const { data: dailyUsers } = await supabase
        .from('user_profiles')
        .select('created')
        .gte('created', startDate)
        .lte('created', endDate)
        .order('created', { ascending: true });

    // Get daily group creations
    const { data: dailyGroups } = await supabase
        .from('grup')
        .select('created_at')
        .is('deleted_at', null)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

    // Get daily recitations
    const { data: dailyRecitations } = await supabase
        .from('recaps')
        .select('created_at, memorization_type')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

    // Process data into daily stats
    const dailyStats: { [key: string]: { users: number; groups: number; recitations: number } } = {};
    
    // Initialize all days in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayKey = d.toISOString().slice(0, 10); // YYYY-MM-DD format
        dailyStats[dayKey] = { users: 0, groups: 0, recitations: 0 };
    }
    
    // Process users by day
    (dailyUsers || []).forEach((user: { created: string }) => {
        const day = new Date(user.created).toISOString().slice(0, 10);
        if (dailyStats[day]) {
            dailyStats[day].users++;
        }
    });

    // Process groups by day
    (dailyGroups || []).forEach((group: { created_at: string }) => {
        const day = new Date(group.created_at).toISOString().slice(0, 10);
        if (dailyStats[day]) {
            dailyStats[day].groups++;
        }
    });

    // Process recitations by day
    (dailyRecitations || []).forEach((recap: { created_at: string }) => {
        const day = new Date(recap.created_at).toISOString().slice(0, 10);
        if (dailyStats[day]) {
            dailyStats[day].recitations++;
        }
    });

    return {
        type: 'daily' as const,
        data: dailyStats
    };
}

// Generate monthly data for yearly periods
async function generateMonthlyData(
    supabase: Awaited<ReturnType<typeof createClient>>,
    startDate?: string,
    endDate?: string
) {
    // Default to last 12 months if no dates provided
    const now = new Date();
    const defaultStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const queryStart = startDate || defaultStart.toISOString();
    const queryEnd = endDate || defaultEnd.toISOString();

    // Get monthly user registrations
    const { data: monthlyUsers } = await supabase
        .from('user_profiles')
        .select('created')
        .gte('created', queryStart)
        .lte('created', queryEnd)
        .order('created', { ascending: true });

    // Get monthly group creations
    const { data: monthlyGroups } = await supabase
        .from('grup')
        .select('created_at')
        .is('deleted_at', null)
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)
        .order('created_at', { ascending: true });

    // Get monthly recitations
    const { data: monthlyRecitations } = await supabase
        .from('recaps')
        .select('created_at, memorization_type')
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)
        .order('created_at', { ascending: true });

    // Process data into monthly stats
    const monthlyStats: { [key: string]: { users: number; groups: number; recitations: number } } = {};
    
    // Process users by month
    (monthlyUsers || []).forEach((user: { created: string }) => {
        const month = new Date(user.created).toISOString().slice(0, 7); // YYYY-MM format
        if (!monthlyStats[month]) {
            monthlyStats[month] = { users: 0, groups: 0, recitations: 0 };
        }
        monthlyStats[month].users++;
    });

    // Process groups by month
    (monthlyGroups || []).forEach((group: { created_at: string }) => {
        const month = new Date(group.created_at).toISOString().slice(0, 7);
        if (!monthlyStats[month]) {
            monthlyStats[month] = { users: 0, groups: 0, recitations: 0 };
        }
        monthlyStats[month].groups++;
    });

    // Process recitations by month
    (monthlyRecitations || []).forEach((recap: { created_at: string }) => {
        const month = new Date(recap.created_at).toISOString().slice(0, 7);
        if (!monthlyStats[month]) {
            monthlyStats[month] = { users: 0, groups: 0, recitations: 0 };
        }
        monthlyStats[month].recitations++;
    });

    return {
        type: 'monthly' as const,
        data: monthlyStats
    };
}

// Generate weekly data for intermediate periods
async function generateWeeklyData(
    supabase: Awaited<ReturnType<typeof createClient>>,
    startDate: string,
    endDate: string
) {
    // Get weekly user registrations
    const { data: weeklyUsers } = await supabase
        .from('user_profiles')
        .select('created')
        .gte('created', startDate)
        .lte('created', endDate)
        .order('created', { ascending: true });

    // Get weekly group creations
    const { data: weeklyGroups } = await supabase
        .from('grup')
        .select('created_at')
        .is('deleted_at', null)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

    // Get weekly recitations
    const { data: weeklyRecitations } = await supabase
        .from('recaps')
        .select('created_at, memorization_type')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

    // Process data into weekly stats
    const weeklyStats: { [key: string]: { users: number; groups: number; recitations: number } } = {};
    
    // Helper function to get week key (year-week format)
    const getWeekKey = (date: Date) => {
        const year = date.getFullYear();
        const firstDay = new Date(year, 0, 1);
        const days = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    };
    
    // Process users by week
    (weeklyUsers || []).forEach((user: { created: string }) => {
        const week = getWeekKey(new Date(user.created));
        if (!weeklyStats[week]) {
            weeklyStats[week] = { users: 0, groups: 0, recitations: 0 };
        }
        weeklyStats[week].users++;
    });

    // Process groups by week
    (weeklyGroups || []).forEach((group: { created_at: string }) => {
        const week = getWeekKey(new Date(group.created_at));
        if (!weeklyStats[week]) {
            weeklyStats[week] = { users: 0, groups: 0, recitations: 0 };
        }
        weeklyStats[week].groups++;
    });

    // Process recitations by week
    (weeklyRecitations || []).forEach((recap: { created_at: string }) => {
        const week = getWeekKey(new Date(recap.created_at));
        if (!weeklyStats[week]) {
            weeklyStats[week] = { users: 0, groups: 0, recitations: 0 };
        }
        weeklyStats[week].recitations++;
    });

    return {
        type: 'weekly' as const,
        data: weeklyStats
    };
}


// Optimized single query function to get all statistik data at once (Global Dashboard)
export async function fetchAllStatistikData(
    startDate?: string,
    endDate?: string
) {
    const supabase = await createClient();
    
    // Calculate date ranges
    let startOfThisMonth: Date;
    let endOfThisMonth: Date;
    let startOfLastMonth: Date;
    let endOfLastMonth: Date;
    
    if (startDate && endDate) {
        startOfThisMonth = new Date(startDate);
        endOfThisMonth = new Date(endDate);
        
        const prevMonth = new Date(startOfThisMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        startOfLastMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        endOfLastMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
        const now = new Date();
        startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    
    // Today and yesterday for daily stats
    const now2 = new Date();
    const startOfToday = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
    const endOfToday = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate(), 23, 59, 59, 999);
    const startOfYesterday = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() - 1);
    const endOfYesterday = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() - 1, 23, 59, 59, 999);

    try {
        // Global query - get all recaps data for statistics
        const { data: allRecaps, error } = await supabase
            .from('recaps')
            .select(`
                id,
                created_at,
                memorization_type,
                reciter_id,
                group_id,
                group:group_id(name)
            `)
            .gte('created_at', startOfLastMonth.toISOString())
            .lte('created_at', endOfThisMonth.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, message: error.message };
        }

        // Get total users data
        const { data: thisMonthUsers, error: thisMonthUsersError } = await supabase
            .from('user_profiles')
            .select('id')
            .gte('created', startOfThisMonth.toISOString())
            .lte('created', endOfThisMonth.toISOString());

        if (thisMonthUsersError) {
            return { success: false, message: thisMonthUsersError.message };
        }

        const { data: lastMonthUsers, error: lastMonthUsersError } = await supabase
            .from('user_profiles')
            .select('id')
            .gte('created', startOfLastMonth.toISOString())
            .lte('created', endOfLastMonth.toISOString());

        if (lastMonthUsersError) {
            return { success: false, message: lastMonthUsersError.message };
        }

        // Get total groups data
        const { data: thisMonthGroups, error: thisMonthGroupsError } = await supabase
            .from('grup')
            .select('id')
            .is('deleted_at', null)
            .gte('created_at', startOfThisMonth.toISOString())
            .lte('created_at', endOfThisMonth.toISOString());

        if (thisMonthGroupsError) {
            return { success: false, message: thisMonthGroupsError.message };
        }

        const { data: lastMonthGroups, error: lastMonthGroupsError } = await supabase
            .from('grup')
            .select('id')
            .is('deleted_at', null)
            .gte('created_at', startOfLastMonth.toISOString())
            .lte('created_at', endOfLastMonth.toISOString());

        if (lastMonthGroupsError) {
            return { success: false, message: lastMonthGroupsError.message };
        }

        // Process all data in parallel
        const processedData = processStatistikData(
            allRecaps || [], 
            startOfThisMonth,
            endOfThisMonth,
            startOfLastMonth,
            endOfLastMonth,
            startOfToday,
            endOfToday,
            startOfYesterday,
            endOfYesterday,
            thisMonthUsers || [],
            lastMonthUsers || [],
            thisMonthGroups || [],
            lastMonthGroups || []
        );

        // Generate chart time series data
        const chartTimeSeriesData = await generateChartTimeSeriesData(supabase, startDate, endDate);
        
        return {
            success: true,
            message: "All statistik data fetched successfully",
            data: { ...processedData, chartTimeSeriesData, rawRecaps: allRecaps || [] }
        };
    } catch (error) {
        return { 
            success: false, 
            message: error instanceof Error ? error.message : "Unknown error" 
        };
    }
}

// Helper function to process all data efficiently (Global Dashboard)
function processStatistikData(
    allRecaps: StatistikRecap[],
    startOfThisMonth: Date,
    endOfThisMonth: Date,
    startOfLastMonth: Date,
    endOfLastMonth: Date,
    startOfToday: Date,
    endOfToday: Date,
    startOfYesterday: Date,
    endOfYesterday: Date,
    thisMonthUsers: { id: string }[],
    lastMonthUsers: { id: string }[],
    thisMonthGroups: { id: string }[],
    lastMonthGroups: { id: string }[]
) {
    // Filter data by time periods
    const thisMonthRecaps = allRecaps.filter(r => {
        if (!r.created_at) return false;
        const date = new Date(r.created_at);
        return date >= startOfThisMonth && date <= endOfThisMonth;
    });
    
    const lastMonthRecaps = allRecaps.filter(r => {
        if (!r.created_at) return false;
        const date = new Date(r.created_at);
        return date >= startOfLastMonth && date <= endOfLastMonth;
    });
    
    const todayRecaps = allRecaps.filter(r => {
        if (!r.created_at) return false;
        const date = new Date(r.created_at);
        return date >= startOfToday && date <= endOfToday;
    });
    
    const yesterdayRecaps = allRecaps.filter(r => {
        if (!r.created_at) return false;
        const date = new Date(r.created_at);
        return date >= startOfYesterday && date <= endOfYesterday;
    });

    // Calculate statistics
    const totalSetoranBulanIni = thisMonthRecaps.length;
    const totalSetoranBulanLalu = lastMonthRecaps.length;
    const totalSetoranHariIni = todayRecaps.length;
    const totalSetoranHariLalu = yesterdayRecaps.length;

    // Global users data - total registered users
    const totalUsersBulanIni = thisMonthUsers.length;
    const totalUsersBulanLalu = lastMonthUsers.length;
    
    // Surah popularity - optimized with Map
    const surahCountMap = new Map();
    
    // Process all data in single loop for better performance
    thisMonthRecaps.forEach((recap) => {
        // Count surah popularity
        if (recap.memorization_type?.includes('surah:')) {
            const surahMatch = recap.memorization_type.match(/surah:(\d+)/);
            if (surahMatch) {
                const surahNumber = surahMatch[1];
                const current = surahCountMap.get(surahNumber) || {
                    count: 0,
                    surahNumber: surahNumber,
                    surahName: getSurahName(parseInt(surahNumber))
                };
                current.count++;
                surahCountMap.set(surahNumber, current);
            }
        }
    });

    // Group statistics and memorization type statistics - combined loop
    const groupCountsMap = new Map();
    const typeCounts = {
        Surat: 0,
        Juz: 0,
        Halaman: 0
    };

    // Process group and type statistics in single loop
    thisMonthRecaps.forEach((recap) => {
        // Group statistics
        if (recap.group_id && recap.group) {
            const groupData = Array.isArray(recap.group) ? recap.group[0] : recap.group;
            const groupName = groupData?.name || 'Unknown Group';
            const groupId = recap.group_id;
            
            const current = groupCountsMap.get(groupId) || {
                group_name: groupName,
                total: 0
            };
            current.total++;
            groupCountsMap.set(groupId, current);
        }
        
        // Memorization type statistics
        const memorizationType = recap.memorization_type;
        if (memorizationType?.includes('surah:')) {
            typeCounts.Surat++;
        } else if (memorizationType?.includes('juz:')) {
            typeCounts.Juz++;
        } else if (memorizationType?.includes('page:')) {
            typeCounts.Halaman++;
        }
    });

    // Calculate percentages
    const setoranPercentage = lastMonthRecaps.length > 0 
        ? Math.min(((totalSetoranBulanIni - totalSetoranBulanLalu) / totalSetoranBulanLalu) * 100, 999)
        : totalSetoranBulanIni > 0 ? 100 : 0;

    const usersPercentage = totalUsersBulanLalu > 0
        ? Math.min(((totalUsersBulanIni - totalUsersBulanLalu) / totalUsersBulanLalu) * 100, 999)
        : totalUsersBulanIni > 0 ? 100 : 0;

    const hariIniPercentage = yesterdayRecaps.length > 0
        ? Math.min(((totalSetoranHariIni - totalSetoranHariLalu) / totalSetoranHariLalu) * 100, 999)
        : totalSetoranHariIni > 0 ? 100 : 0;

    // Calculate group data
    const totalGroupsBulanIni = thisMonthGroups.length;
    const totalGroupsBulanLalu = lastMonthGroups.length;
    
    const groupsPercentage = totalGroupsBulanLalu > 0
        ? Math.min(((totalGroupsBulanIni - totalGroupsBulanLalu) / totalGroupsBulanLalu) * 100, 999)
        : totalGroupsBulanIni > 0 ? 100 : 0;

    // Format month name for chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = `${monthNames[startOfThisMonth.getMonth()]} ${startOfThisMonth.getFullYear()}`;

    return {
        totalSetoran: {
            totalSetoranBulanIni,
            totalSetoranBulanLalu,
            persentase: Math.round(setoranPercentage * 10) / 10
        },
        totalPengguna: {
            totalPenggunaBulanIni: totalUsersBulanIni,
            totalPenggunaBulanLalu: totalUsersBulanLalu,
            persentase: Math.round(usersPercentage * 10) / 10
        },
        totalGroups: {
            totalGroupsBulanIni: totalGroupsBulanIni,
            totalGroupsBulanLalu: totalGroupsBulanLalu,
            persentase: Math.round(groupsPercentage * 10) / 10
        },
        totalSetoranHariIni: {
            totalSetoranHariIni,
            totalSetoranHariLalu,
            persentase: Math.round(hariIniPercentage * 10) / 10
        },
        surahPopular: Array.from(surahCountMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        groupSetoranTerbanyak: Array.from(groupCountsMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 10),
        depositTypeData: [{
            month: monthName,
            Surat: typeCounts.Surat,
            Juz: typeCounts.Juz,
            Halaman: typeCounts.Halaman
        }],
        historicalMonthlyData: {}
    };
}


export async function fetchSurahPopular(startDate?: string, endDate?: string, examinerId?: string) {
    // Menggunakan function fetchSurahFavorit yang sudah dioptimasi
    return await fetchSurahFavorit(startDate, endDate, examinerId);
}

export async function fetchSurahFavorit(startDate?: string, endDate?: string, examinerId?: string) {
    const supabase = await createClient();
    
    // Build query with optional date filtering and examiner filtering
    let query = supabase
        .from("recaps")
        .select("memorization_type, memorization, created_at, examiner_id")
        .like("memorization_type", "%surah%");
    
    // Add examiner filtering if provided (like hasil setoran page)
    if (examinerId) {
        query = query.eq("examiner_id", examinerId);
    }
    
    // Add date filtering if provided
    if (startDate && endDate) {
        query = query
            .gte("created_at", startDate)
            .lte("created_at", endDate);
    }
    
    const { data, error } = await query;

    if (error) {
        return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
        return { success: true, message: "No surah data found", data: [] };
    }

    // Hitung frekuensi setiap surah
    const surahCount: Record<string, { count: number; surahNumber: string; surahName: string }> = {};

    data.forEach((recap) => {
        // Extract surah number from memorization_type (format: "surah:2")
        const surahMatch = recap.memorization_type?.match(/surah:(\d+)/);
        if (surahMatch) {
            const surahNumber = surahMatch[1];
            const surahKey = `surah_${surahNumber}`;

            if (!surahCount[surahKey]) {
                surahCount[surahKey] = {
                    count: 0,
                    surahNumber: surahNumber,
                    surahName: getSurahName(parseInt(surahNumber))
                };
            }
            surahCount[surahKey].count++;
        }
    });

    // Convert to array and sort by count (descending)
    const surahFavorit = Object.values(surahCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Ambil top 10 surah terfavorit

    return {
        success: true,
        message: "Surah favorit fetched successfully",
        data: surahFavorit
    };
}

// Helper function to get surah name by number
function getSurahName(surahNumber: number): string {
    const surahNames: Record<number, string> = {
        1: "Al-Fatihah",
        2: "Al-Baqarah",
        3: "Ali 'Imran",
        4: "An-Nisa",
        5: "Al-Maidah",
        6: "Al-An'am",
        7: "Al-A'raf",
        8: "Al-Anfal",
        9: "At-Taubah",
        10: "Yunus",
        11: "Hud",
        12: "Yusuf",
        13: "Ar-Ra'd",
        14: "Ibrahim",
        15: "Al-Hijr",
        16: "An-Nahl",
        17: "Al-Isra",
        18: "Al-Kahf",
        19: "Maryam",
        20: "Taha",
        21: "Al-Anbiya",
        22: "Al-Hajj",
        23: "Al-Mu'minun",
        24: "An-Nur",
        25: "Al-Furqan",
        26: "Asy-Syu'ara",
        27: "An-Naml",
        28: "Al-Qasas",
        29: "Al-Ankabut",
        30: "Ar-Rum",
        31: "Luqman",
        32: "As-Sajdah",
        33: "Al-Ahzab",
        34: "Saba",
        35: "Fatir",
        36: "Yasin",
        37: "As-Saffat",
        38: "Sad",
        39: "Az-Zumar",
        40: "Ghafir",
        41: "Fussilat",
        42: "Asy-Syura",
        43: "Az-Zukhruf",
        44: "Ad-Dukhan",
        45: "Al-Jasiyah",
        46: "Al-Ahqaf",
        47: "Muhammad",
        48: "Al-Fath",
        49: "Al-Hujurat",
        50: "Qaf",
        51: "Adz-Dzariyat",
        52: "At-Tur",
        53: "An-Najm",
        54: "Al-Qamar",
        55: "Ar-Rahman",
        56: "Al-Waqi'ah",
        57: "Al-Hadid",
        58: "Al-Mujadilah",
        59: "Al-Hasyr",
        60: "Al-Mumtahanah",
        61: "As-Saff",
        62: "Al-Jumu'ah",
        63: "Al-Munafiqun",
        64: "At-Taghabun",
        65: "At-Talaq",
        66: "At-Tahrim",
        67: "Al-Mulk",
        68: "Al-Qalam",
        69: "Al-Haqqah",
        70: "Al-Ma'arij",
        71: "Nuh",
        72: "Al-Jinn",
        73: "Al-Muzzammil",
        74: "Al-Muddaththir",
        75: "Al-Qiyamah",
        76: "Al-Insan",
        77: "Al-Mursalat",
        78: "An-Naba",
        79: "An-Nazi'at",
        80: "Abasa",
        81: "At-Takwir",
        82: "Al-Infitar",
        83: "Al-Mutaffifin",
        84: "Al-Inshiqaq",
        85: "Al-Buruj",
        86: "At-Tariq",
        87: "Al-A'la",
        88: "Al-Ghashiyah",
        89: "Al-Fajr",
        90: "Al-Balad",
        91: "Asy-Syams",
        92: "Al-Lail",
        93: "Ad-Duha",
        94: "Asy-Syarh",
        95: "At-Tin",
        96: "Al-Alaq",
        97: "Al-Qadr",
        98: "Al-Bayyinah",
        99: "Az-Zalzalah",
        100: "Al-Adiyat",
        101: "Al-Qari'ah",
        102: "At-Takathur",
        103: "Al-Asr",
        104: "Al-Humazah",
        105: "Al-Fil",
        106: "Quraysh",
        107: "Al-Ma'un",
        108: "Al-Kawthar",
        109: "Al-Kafirun",
        110: "An-Nasr",
        111: "Al-Masad",
        112: "Al-Ikhlas",
        113: "Al-Falaq",
        114: "An-Nas"
    };

    return surahNames[surahNumber] || `Surah ${surahNumber}`;
}

export async function fetchTotalSetoran(startDate?: string, endDate?: string, examinerId?: string) {
    const supabase = await createClient();
    
    // Use provided dates or default to current month
    let startOfThisMonth: Date;
    let endOfThisMonth: Date;
    let startOfLastMonth: Date;
    let endOfLastMonth: Date;
    
    if (startDate && endDate) {
        // Use provided dates
        startOfThisMonth = new Date(startDate);
        endOfThisMonth = new Date(endDate);
        
        // Calculate previous month for comparison
        const prevMonth = new Date(startOfThisMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        startOfLastMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        endOfLastMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
        // Default to current month
        const now = new Date();
        startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    // Build query for current month data with examiner filtering
    let queryBulanIni = supabase
        .from("recaps")
        .select("*")
        .gte("created_at", startOfThisMonth.toISOString())
        .lte("created_at", endOfThisMonth.toISOString());
    
    if (examinerId) {
        queryBulanIni = queryBulanIni.eq("examiner_id", examinerId);
    }
    
    const { data: dataRecapBulanIni, error: errorRecapBulanIni } = await queryBulanIni;

    if (errorRecapBulanIni) {
        return { success: false, message: errorRecapBulanIni.message }
    }

    // Build query for previous month data with examiner filtering
    let queryBulanLalu = supabase
        .from("recaps")
        .select("*")
        .gte("created_at", startOfLastMonth.toISOString())
        .lte("created_at", endOfLastMonth.toISOString());
    
    if (examinerId) {
        queryBulanLalu = queryBulanLalu.eq("examiner_id", examinerId);
    }
    
    const { data: dataRecapBulanLalu, error: errorRecapBulanLalu } = await queryBulanLalu;

    if (errorRecapBulanLalu) {
        return { success: false, message: errorRecapBulanLalu.message };
    }

    // Hitung total setoran
    const totalSetoranBulanIni = dataRecapBulanIni?.length || 0;
    const totalSetoranBulanLalu = dataRecapBulanLalu?.length || 0;

    // Hitung persentase perubahan
    let persentase = 0;
    if (totalSetoranBulanLalu > 0) {
        persentase = ((totalSetoranBulanIni - totalSetoranBulanLalu) / totalSetoranBulanLalu) * 100;
        // Batasi persentase maksimal 999% untuk menghindari angka yang terlalu besar
        if (persentase > 999) {
            persentase = 999;
        }
    } else if (totalSetoranBulanIni > 0) {
        // Jika bulan lalu 0 tapi bulan ini ada data, tampilkan sebagai "New" (100%)
        persentase = 100;
    }

    return {
        success: true,
        message: "Total setoran fetched successfully",
        data: {
            totalSetoranBulanIni,
            totalSetoranBulanLalu,
            persentase: Math.round(persentase * 10) / 10,
        }
    };
}

export async function fetchTotalSetoranHariIni(startDate?: string, endDate?: string, examinerId?: string) {
    const supabase = await createClient();
    
    let startOfToday: Date;
    let endOfToday: Date;
    let startOfYesterday: Date;
    let endOfYesterday: Date;
    
    if (startDate && endDate) {
        // Use provided dates
        startOfToday = new Date(startDate);
        endOfToday = new Date(endDate);
        
        // Calculate previous day for comparison
        const prevDay = new Date(startOfToday);
        prevDay.setDate(prevDay.getDate() - 1);
        startOfYesterday = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate());
        endOfYesterday = new Date(prevDay.getFullYear(), prevDay.getMonth(), prevDay.getDate(), 23, 59, 59, 999);
    } else {
        // Default to current day
        const now = new Date();
        startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    }

    // Build query for today's data with examiner filtering
    let queryHariIni = supabase
        .from("recaps")
        .select("*")
        .gte("created_at", startOfToday.toISOString())
        .lte("created_at", endOfToday.toISOString());
    
    if (examinerId) {
        queryHariIni = queryHariIni.eq("examiner_id", examinerId);
    }
    
    const { data: dataRecapHariIni, error: errorRecapHariIni } = await queryHariIni;

    if (errorRecapHariIni) {
        return { success: false, message: errorRecapHariIni.message }
    }

    // Build query for yesterday's data with examiner filtering
    let queryYesterday = supabase
        .from("recaps")
        .select("*")
        .gte("created_at", startOfYesterday.toISOString())
        .lte("created_at", endOfYesterday.toISOString());
    
    if (examinerId) {
        queryYesterday = queryYesterday.eq("examiner_id", examinerId);
    }
    
    const { data: dataRecapYesterday, error: errorRecapYesterday } = await queryYesterday;

    if (errorRecapYesterday) {
        return { success: false, message: errorRecapYesterday.message };
    }

    // Hitung total setoran
    const totalSetoranHariIni = dataRecapHariIni?.length || 0;
    const totalSetoranHariLalu = dataRecapYesterday?.length || 0;

    // Hitung persentase perubahan
    let persentase = 0;
    if (totalSetoranHariLalu > 0) {
        persentase = ((totalSetoranHariIni - totalSetoranHariLalu) / totalSetoranHariLalu) * 100;
        // Batasi persentase maksimal 999% untuk menghindari angka yang terlalu besar
        if (persentase > 999) {
            persentase = 999;
        }
    } else if (totalSetoranHariIni > 0) {
        // Jika hari lalu 0 tapi hari ini ada data, tampilkan sebagai "New" (100%)
        persentase = 100;
    }

    return {
        success: true,
        message: "Total setoran fetched successfully",
        data: {
            totalSetoranHariIni,
            totalSetoranHariLalu,
            persentase: Math.round(persentase * 10) / 10,
        }
    };
}

export async function fetchTotalPengguna(startDate?: string, endDate?: string, examinerId?: string) {
    const supabase = await createClient();
    
    let startOfMonth: Date;
    let endOfMonth: Date;
    let startOfLastMonth: Date;
    let endOfLastMonth: Date;
    
    if (startDate && endDate) {
        startOfMonth = new Date(startDate);
        endOfMonth = new Date(endDate);
        
        const prevMonth = new Date(startOfMonth);
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        startOfLastMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        endOfLastMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    } else {
        const now = new Date();
        startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    }
    
    // For examiner-based statistics, count unique reciters (penyetor) this month
    if (examinerId) {
        // Get unique reciters for current month
        const queryBulanIni = supabase
            .from('recaps')
            .select('reciter_id')
            .eq('examiner_id', examinerId)
            .gte('created_at', startOfMonth.toISOString())
            .lt('created_at', endOfMonth.toISOString());
            
        const { data: recitersBulanIni, error: errorRecitersBulanIni } = await queryBulanIni;
        if (errorRecitersBulanIni) {
            return { success: false, message: errorRecitersBulanIni.message };
        }
        
        // Get unique reciters for previous month
        const queryBulanLalu = supabase
            .from('recaps')
            .select('reciter_id')
            .eq('examiner_id', examinerId)
            .gte('created_at', startOfLastMonth.toISOString())
            .lt('created_at', endOfLastMonth.toISOString());
            
        const { data: recitersBulanLalu, error: errorRecitersBulanLalu } = await queryBulanLalu;
        if (errorRecitersBulanLalu) {
            return { success: false, message: errorRecitersBulanLalu.message };
        }
        
        // Count unique reciters
        const uniqueRecitersBulanIni = new Set(recitersBulanIni?.map(r => r.reciter_id) || []).size;
        const uniqueRecitersBulanLalu = new Set(recitersBulanLalu?.map(r => r.reciter_id) || []).size;
        
        let persentase = 0;
        if (uniqueRecitersBulanLalu > 0) {
            persentase = ((uniqueRecitersBulanIni - uniqueRecitersBulanLalu) / uniqueRecitersBulanLalu) * 100;
            if (persentase > 999) {
                persentase = 999;
            }
        } else if (uniqueRecitersBulanIni > 0) {
            persentase = 100;
        }
        
        return {
            success: true,
            message: "Total penyetor fetched successfully",
            data: {
                totalPenggunaBulanIni: uniqueRecitersBulanIni,
                totalPenggunaBulanLalu: uniqueRecitersBulanLalu,
                persentase: Math.round(persentase * 10) / 10
            }
        };
    }
    
    // Original global functionality
    const { data: dataPengguna, error: errorPengguna } = await supabase.from('user_profiles')
        .select('*')
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString());
    if (errorPengguna) {
        return { success: false, message: errorPengguna.message };
    }

    const { data: dataPenggunaBulanLalu, error: errorPenggunaBulanLalu } = await supabase.from('user_profiles')
        .select('*')
        .gte('created_at', startOfLastMonth.toISOString())
        .lt('created_at', endOfLastMonth.toISOString());
    if (errorPenggunaBulanLalu) {
        return { success: false, message: errorPenggunaBulanLalu.message };
    }

    const totalPenggunaBulanIni = dataPengguna?.length || 0;
    const totalPenggunaBulanLalu = dataPenggunaBulanLalu?.length || 0;

    let persentase = 0;
    if (totalPenggunaBulanLalu > 0) {
        persentase = ((totalPenggunaBulanIni - totalPenggunaBulanLalu) / totalPenggunaBulanLalu) * 100;
        // Batasi persentase maksimal 999% untuk menghindari angka yang terlalu besar
        if (persentase > 999) {
            persentase = 999;
        }
    } else if (totalPenggunaBulanIni > 0) {
        // Jika bulan lalu 0 tapi bulan ini ada data, tampilkan sebagai "New" (100%)
        persentase = 100;
    }

    return {
        success: true,
        message: "Total pengguna fetched successfully",
        data: {
            totalPenggunaBulanIni,
            totalPenggunaBulanLalu,
            persentase: Math.round(persentase * 10) / 10
        }
    };
}

export async function getGroupSetoranTerbanyak(startDate?: string, endDate?: string, examinerId?: string) {
    const supabase = await createClient();
    // If dates are provided, query recaps table directly with period filtering
    if (startDate && endDate) {
        let query = supabase
            .from('recaps')
            .select(`
                group_id,
                grup!inner(name)
            `)
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .not('group_id', 'is', null);
            
        // Add examiner filtering if provided
        if (examinerId) {
            query = query.eq('examiner_id', examinerId);
        }
        
        const { data: recapsData, error: recapsError } = await query;

        if (recapsError) {
            return { success: false, message: recapsError.message };
        }

        // Count recaps by group
        const groupCounts: Record<string, { group_name: string; total: number }> = {};
        
        recapsData?.forEach((recap: { group_id: string; grup: { name: string } | { name: string }[] }) => {
            // Handle both single object and array format from Supabase
            const grupData = Array.isArray(recap.grup) ? recap.grup[0] : recap.grup;
            const groupName = grupData?.name || 'Unknown Group';
            const groupId = recap.group_id;
            
            if (!groupCounts[groupId]) {
                groupCounts[groupId] = {
                    group_name: groupName,
                    total: 0
                };
            }
            groupCounts[groupId].total++;
        });

        // Convert to array and sort by total (descending)
        const chartData = Object.values(groupCounts)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Limit to top 10 groups
        
        return { success: true, message: "Group setoran terbanyak fetched successfully", data: chartData };
    }
    
    // Default behavior: get all data from view
    const { data, error } = await supabase
        .from('group_recap_counts')
        .select('*')
        .limit(10); // Limit to top 10 groups

    if (error) {
        return { success: false, message: error.message };
    }
    
    // Transform data to match chart requirements
    const chartData = data?.map((item: { group_name?: string; total?: number }) => ({
        group_name: item.group_name || 'Unknown Group',
        total: item.total || 0
    })) || [];
    return { success: true, message: "Group setoran terbanyak fetched successfully", data: chartData };
}

export async function fetchGroupSetoranTerbanyak(startDate?: string, endDate?: string, examinerId?: string) {
    const supabase = await createClient();
    
    // If dates are provided, query recaps table directly with period filtering
    if (startDate && endDate) {
        let query = supabase
            .from('recaps')
            .select('memorization_type, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate);
            
        // Add examiner filtering if provided
        if (examinerId) {
            query = query.eq('examiner_id', examinerId);
        }
        
        const { data: recapsData, error: recapsError } = await query;

        if (recapsError) {
            console.error('Gagal mengambil data:', recapsError.message);
            return { success: false, message: recapsError.message, data: [] };
        }

        // Count by memorization type for the selected period
        const typeCounts = {
            Surat: 0,
            Juz: 0,
            Halaman: 0
        };

        recapsData?.forEach((recap: { memorization_type: string }) => {
            const memorizationType = recap.memorization_type;
            if (memorizationType?.includes('surah:')) {
                typeCounts.Surat++;
            } else if (memorizationType?.includes('juz:')) {
                typeCounts.Juz++;
            } else if (memorizationType?.includes('page:')) {
                typeCounts.Halaman++;
            }
        });

        // Format the period as month name
        const startDateObj = new Date(startDate);
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        const monthName = `${monthNames[startDateObj.getMonth()]} ${startDateObj.getFullYear()}`;

        const chartData = [{
            month: monthName,
            Surat: typeCounts.Surat,
            Juz: typeCounts.Juz,
            Halaman: typeCounts.Halaman
        }];

        return { success: true, message: "Deposit type data fetched successfully", data: chartData };
    }
    
    // Default behavior: get all data from view
    const { data, error } = await supabase
        .from('monthly_recitation_stats_flexible')
        .select('*')
        .limit(12); // Limit to 12 months

    if (error) {
        console.error('Gagal mengambil data:', error.message);
        return { success: false, message: error.message, data: [] };
    }
    
    // Transform data to match chart requirements
    const chartData = data?.map((item: { month?: string; Surat?: number; Juz?: number; Halaman?: number }) => ({
        month: item.month || 'Unknown Month',
        Surat: item.Surat || 0,
        Juz: item.Juz || 0,
        Halaman: item.Halaman || 0
    })) || [];
    
    console.log('Data bulanan:', chartData);
    return { success: true, message: "Group setoran terbanyak fetched successfully", data: chartData };
}