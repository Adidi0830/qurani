const fs = require('fs');
const path = 'src/data/billing-dummy.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const existingIds = new Set(data.bookingDetails?.map(bd => bd.bookingId) || []);

const locations = ["Jakarta Selatan", "Bandung, Jawa Barat", "Surabaya, Jawa Timur", "Yogyakarta", "Medan, Sumatera Utara", "Depok", "Bekasi", "Tangerang Selatan"];
const specializations = ["Tahsin & Talaqqi", "Hafalan Juz 30", "Qiroati Dasar", "Irama & Tajwid Lanjut", "Tilawati untuk Anak"];
const feedbackPool = [
    "Sesi berjalan lancar, makhraj sudah mulai tepat.",
    "Perlu banyak latihan untuk huruf Ain dan Ghain.",
    "Murid sangat antusias, tilawah semakin lancar.",
    "Sinyal agak putus-putus di awal, namun materi tersampaikan dengan baik.",
    "Tidak ada catatan khusus, bacaan sudah sangat baik.",
    "Sesi menyenangkan, interaktif, murid semangat.",
    "Bagus sekali, bacaan tajwid sudah mulai rapi.",
    "Mulai lancar membaca huruf bersambung.",
    "Tolong berlatih lagi surat pendek yang diajarkan."
];

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
    return arr[getRandomInt(0, arr.length - 1)];
}

function getRandomPhone() {
    return `+62 8${getRandomInt(11, 99)}-${getRandomInt(1000, 9999)}-${getRandomInt(1000, 9999)}`;
}

if (!data.bookingDetails) data.bookingDetails = [];

for (const booking of data.bookings) {
    if (!existingIds.has(booking.id)) {
        // Diverse Member Data
        const joinYear = getRandomInt(2023, 2025);
        const joinMonth = String(getRandomInt(1, 12)).padStart(2, '0');
        const joinDate = `${joinYear}-${joinMonth}-15T10:00:00Z`;

        // Diverse Trainer Data
        const tRating = (4 + Math.random()).toFixed(1);
        const tStudents = getRandomInt(10, 250);
        
        // Build Sessions
        const sessions = [];
        for (let i = 0; i < booking.totalSessions; i++) {
            const isCompleted = i < booking.completedSessions;
            const sessionDate = new Date(booking.bookingDate);
            sessionDate.setDate(sessionDate.getDate() + (i * 7)); // 1 session per week
            const hh = String(getRandomInt(8, 20)).padStart(2, '0');
            
            sessions.push({
                no: i + 1,
                date: sessionDate.toISOString().split('T')[0],
                time: `${hh}:00 - ${String(Number(hh)+1).padStart(2, '0')}:00`,
                status: isCompleted ? "completed" : "scheduled",
                notes: isCompleted ? getRandomItem(feedbackPool) : null
            });
        }
        
        // Diverse Payment Data
        const isPaid = booking.status === "completed" || booking.status === "active";
        
        const newDetail = {
            bookingId: booking.id,
            bookingCode: booking.bookingCode || `#${booking.id}`,
            member: {
                id: booking.userId,
                name: booking.userName,
                email: booking.userEmail,
                phone: getRandomPhone(),
                joinDate: joinDate,
                location: getRandomItem(locations)
            },
            trainer: {
                id: booking.trainerId,
                name: booking.trainerName,
                email: `guru.${booking.trainerId}@qurani.id`,
                avatar: `https://i.pravatar.cc/150?img=${getRandomInt(1, 70)}`,
                rating: Number(tRating > 5 ? 5.0 : tRating),
                totalStudents: tStudents,
                specialization: getRandomItem(specializations),
                location: getRandomItem(locations),
                yearsExperience: getRandomInt(1, 10),
                subjects: [getRandomItem(specializations)]
            },
            sessions: sessions,
            payment: {
                invoiceNo: `INV-2026-${booking.id}-${getRandomInt(100, 999)}`,
                receiptRef: isPaid ? `GOPAY-REF-${getRandomInt(100000, 999999)}` : "-",
                method: booking.paymentMethod || "GoPay",
                status: isPaid ? "paid" : "pending",
                paidAt: isPaid ? booking.bookingDate : null,
                pricePackage: booking.pricePackage,
                serviceFee: booking.serviceFee,
                tax: Math.round(booking.pricePackage * 0.11), // simulate tax
                total: booking.totalPayment
            }
        };
        
        data.bookingDetails.push(newDetail);
    }
}

fs.writeFileSync(path, JSON.stringify(data, null, 4));
console.log('Successfully added diverse mock data to billing-dummy.json');
