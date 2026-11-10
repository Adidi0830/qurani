// src/data/kyc-personal-requests.js
// Mock data for KYC Personal verification page (Admin Panel)

const REJECTION_TEMPLATES = [
    "Foto identitas buram atau tidak terbaca.",
    "Foto selfie tidak sesuai dengan kartu identitas.",
    "Dokumen identitas sudah kedaluwarsa.",
    "Nama di profil tidak sesuai dengan dokumen identitas.",
    "Dokumen yang diunggah bukan KTP/Kartu Pelajar yang valid.",
    "Nomor identitas tidak terdaftar atau format salah."
];

// Helper to format date consistently
const formatKycDate = (date) => date.toLocaleDateString("id-ID", {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const kycPersonalRequests = [
    // 1. TEST CASE: Good Quality (Mindo) - NIK: 1208184604850001
    {
        id: 9999,
        user: { name: "Mindo Sitinjak", username: "mindositinjak", email: "mindo.sitinjak@example.com", avatar: "https://i.pravatar.cc/150?u=mindo" },
        documentType: "KTP",
        documentNumber: "1208184604850001",
        submittedAt: formatKycDate(new Date(2026, 0, 28, 10, 15)),
        rawSubmittedAt: new Date(2026, 0, 28, 10, 15),
        processedAt: null,
        rawProcessedAt: null,
        status: "Pending",
        fullName: "MINDO SITINJAK",
        rejectionReason: null, rejectionHistory: [], rejectionCount: 0, notes: "",
        ktpImage: "/images/verifikasiktp/mindo-ktp.jpg",
        selfieImage: "/images/verifikasiperson/mindo.jpg",
        whatsapp: "081234567890", placeOfBirth: "SIPANGAN BOLON", dateOfBirth: "06-04-1985", address: "KAV. KBI 3 NO. B1 RANCAKASIAT"
    },
    // 2. TEST CASE: Clear High Quality KTP (Neneng) - NIK: 1272035805790003
    {
        id: 9901,
        user: { name: "Neneng Yulia Meilin", username: "nenengreog", email: "neneng.yulia@example.com", avatar: "/images/verifikasiperson/neneng.png" },
        documentType: "KTP",
        documentNumber: "1272035805790003",
        submittedAt: formatKycDate(new Date(2026, 0, 27, 14, 30)),
        rawSubmittedAt: new Date(2026, 0, 27, 14, 30),
        processedAt: null,
        rawProcessedAt: null,
        status: "Pending",
        fullName: "NENENG YULIA MEILIN",
        rejectionReason: null, rejectionHistory: [], rejectionCount: 0, notes: "",
        ktpImage: "/images/verifikasiktp/ktp-neneng-real.jpg",
        selfieImage: "/images/verifikasiperson/neneng.png",
        whatsapp: "081122334455", placeOfBirth: "BANDUNG", dateOfBirth: "18-05-1979", address: "JL. STASION TIMUR NO. 50"
    },
    // 3. TEST CASE: Blue KTP Clear (Willy) - NIK: 3204122606930001
    {
        id: 9902,
        user: { name: "Willy Bramandika", username: "willybram", email: "willy.b@example.com", avatar: "/images/verifikasiperson/willy.png" },
        documentType: "KTP",
        documentNumber: "3204122606930001",
        submittedAt: formatKycDate(new Date(2026, 0, 26, 9, 45)),
        rawSubmittedAt: new Date(2026, 0, 26, 9, 45),
        processedAt: null,
        rawProcessedAt: null,
        status: "Pending",
        fullName: "WILLY BRAMANDIKA",
        rejectionReason: null,
        rejectionHistory: [
            { id: 1, date: "20 Januari 2026", reason: "Foto identitas buram atau tidak terbaca.", ktpImage: "/images/dummy-ktp.jpg", selfieImage: "/images/dummy-selfie.jpg" },
            { id: 2, date: "22 Januari 2026", reason: "Dokumen identitas sudah kedaluwarsa.", ktpImage: "/images/verifikasiktp/ktp-willy.jpg", selfieImage: "/images/verifikasiperson/willy.png" },
            { id: 3, date: "24 Januari 2026", reason: "Nama di profil tidak sesuai dengan dokumen identitas.", ktpImage: "/images/verifikasiktp/ktp-willy.jpg", selfieImage: "/images/verifikasiperson/willy.png" }
        ],
        rejectionCount: 3, notes: "",
        ktpImage: "/images/verifikasiktp/ktp-willy.jpg",
        selfieImage: "/images/verifikasiperson/willy.png",
        whatsapp: "085677889900", placeOfBirth: "BANDUNG", dateOfBirth: "26-06-1993", address: "DAYEUHKOLOT"
    },
    // 4. TEST CASE: Laminating Glare (Muhamad) - NIK: 3204161705890011
    {
        id: 9903,
        user: { name: "Muhamad Tajudin", username: "tajudin99", email: "tajudin@example.com", avatar: "/images/verifikasiperson/tajudin.png" },
        documentType: "KTP",
        documentNumber: "3204161705890011",
        submittedAt: formatKycDate(new Date(2026, 0, 25, 11, 20)),
        rawSubmittedAt: new Date(2026, 0, 25, 11, 20),
        processedAt: null,
        rawProcessedAt: null,
        status: "Pending",
        fullName: "MUHAMAD TAJUDIN .N",
        rejectionReason: null,
        rejectionHistory: [
            { id: 1, date: "23 Januari 2026", reason: "Foto selfie tidak sesuai dengan kartu identitas.", ktpImage: "/images/verifikasiktp/ktp-tajudin-real.jpg", selfieImage: "/images/verifikasiperson/tajudin.png" }
        ],
        rejectionCount: 1, notes: "",
        ktpImage: "/images/verifikasiktp/ktp-tajudin-real.jpg",
        selfieImage: "/images/verifikasiperson/tajudin.png",
        whatsapp: "081900887766", placeOfBirth: "BANDUNG", dateOfBirth: "17-05-1989", address: "SEKE MULYA"
    },
    // 5. TEST CASE: Rotated Image (Laela) - NIK: 3204174905810009
    {
        id: 9904,
        user: { name: "Laela Nuraeni", username: "laela123", email: "laela@example.com", avatar: "/images/verifikasiperson/laela.png" },
        documentType: "KTP",
        documentNumber: "3204174905810009",
        submittedAt: formatKycDate(new Date(2026, 0, 24, 16, 0)),
        rawSubmittedAt: new Date(2026, 0, 24, 16, 0),
        processedAt: null,
        rawProcessedAt: null,
        status: "Pending",
        fullName: "LAELA NURAENI",
        rejectionReason: null, rejectionHistory: [], rejectionCount: 0, notes: "Gambar mungkin terbalik - gunakan fitur Rotate untuk memperbaiki orientasi",
        ktpImage: "/images/verifikasiktp/ktp-laela-real.jpg",
        selfieImage: "/images/verifikasiperson/laela.png",
        whatsapp: "081344556677", placeOfBirth: "BANDUNG", dateOfBirth: "09-05-1981", address: "KP. BABAKAN DESA"
    },
    // 6. TEST CASE: Clear Scan (Yunita) - NIK: 3204096906950007
    {
        id: 9905,
        user: { name: "Yunita Wulandari", username: "yunita_w", email: "yunita@example.com", avatar: "/images/verifikasiperson/Yunita.png" },
        documentType: "KTP",
        documentNumber: "3204096906950007",
        submittedAt: formatKycDate(new Date(2026, 0, 23, 8, 30)),
        rawSubmittedAt: new Date(2026, 0, 23, 8, 30),
        processedAt: null,
        rawProcessedAt: null,
        status: "Pending",
        fullName: "YUNITA WULANDARI",
        rejectionReason: null, rejectionHistory: [], rejectionCount: 0, notes: "",
        ktpImage: "/images/verifikasiktp/ktp-yunita-real.jpg",
        selfieImage: "/images/verifikasiperson/Yunita.png",
        whatsapp: "082233445566", placeOfBirth: "BANDUNG", dateOfBirth: "29-06-1995", address: "JL. SAYATI HILIR"
    },
    // 7. DUMMY USER FOR CORPORATE LINK
    {
        id: 9991,
        user: { name: "Budi Dummy", username: "budidummy", email: "budi.dummy@example.com", avatar: "https://i.pravatar.cc/150?u=budi" },
        documentType: "KTP",
        documentNumber: "3201234567890001",
        submittedAt: formatKycDate(new Date(2026, 1, 15, 10, 0)),
        rawSubmittedAt: new Date(2026, 1, 15, 10, 0),
        processedAt: formatKycDate(new Date(2026, 1, 16, 10, 0)),
        rawProcessedAt: new Date(2026, 1, 16, 10, 0),
        status: "Approved",
        fullName: "BUDI DUMMY SANTOSO",
        rejectionReason: null, rejectionHistory: [], rejectionCount: 0, notes: "",
        ktpImage: "/images/verifikasiktp/dummy-ktp.jpg",
        selfieImage: "/images/verifikasiperson/dummy-selfie.jpg",
        whatsapp: "081299998888", placeOfBirth: "JAKARTA", dateOfBirth: "01-01-1990", address: "JL. DUMMY NO. 1"
    }
];

export { kycPersonalRequests, REJECTION_TEMPLATES };
