export const kycProfileRequests = [
    {
        id: 99,
        user: {
            id: 107,
            name: "Mindo Sitinjak",
            email: "mindo.sitinjak@gmail.com",
            avatar: "/images/mindo.jpg", // Placeholder unique image
            role: "Mahasiswa",
            institution: "Universitas Sumatera Utara"
        },
        profileData: {
            headline: "Accounting Student | Finance Enthusiast",
            bio: "Mahasiswa Akuntansi yang berdedikasi dengan ketertarikan kuat pada analisis keuangan dan perpajakan. Mencari kesempatan magang untuk mengaplikasikan ilmu yang telah dipelajari.",
            location: "Medan, Sumatera Utara",
            skills: [
                "Microsoft Excel",
                "Financial Analysis",
                "Taxation",
                "MYOB",
                "Public Speaking"
            ],
            experience: [],
            education: [
                {
                    school: "Universitas Sumatera Utara",
                    degree: "S1 Akuntansi",
                    year: "2023 - 2027 (Expected)",
                    details: "IPK: 3.85. Aktif di Himpunan Mahasiswa Akuntansi."
                }
            ],
            portfolio: []
        },
        status: "Pending",
        submittedAt: "2025-12-01T08:00:00Z", // Older date to appear first in FIFO
        rejectionCount: 0,
        rejectionReason: null
    },
    {
        id: 7,
        user: {
            id: 1,
            name: "Muhammad Nur Rosyid",
            email: "rosyid@gmail.com",
            avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400",
            role: "Mahasiswa",
            institution: "Universitas Amikom Yogyakarta"
        },
        profileData: {
            headline: "Unity Game Developer | AR/VR Enthusiast | Specialized in Gameplay Programming & Optimization | Informatics Engineering Student",
            bio: "Mahasiswa Teknik Informatika tahun ke-3 dengan spesialisasi pengembangan Game Engine Unity. Berpengalaman dalam membangun mekanik gameplay yang kompleks, optimasi performa pada perangkat mobile, serta pengembangan teknologi imersif (AR/VR). Memiliki antusiasme tinggi pada Clean Code (C#), Design Patterns, dan integrasi Artificial Intelligence dalam game. Terbiasa bekerja dalam tim dengan metodologi Agile/Scrum.",
            location: "Sleman, DI Yogyakarta",
            skills: [
                "Unity 3D/2D",
                "C# Programming",
                "Game Physics",
                "AR Foundation",
                "Virtual Reality (Meta Quest)",
                "Version Control (Git/GitHub)",
                "Firebase for Games",
                "Blender 3D Modeling",
                "Shader Graph",
                "Object-Oriented Programming (OOP)",
                "Agile/Scrum Methodology",
                "Unit Testing in Unity",
                "Mobile Optimization (Android/iOS)"
            ],
            experience: [
                {
                    title: "Unity Game Programmer Intern",
                    organization: "PT Orbit Nasional Edukasi (Indibiz)",
                    period: "Februari 2025 - Juni 2025",
                    location: "Yogyakarta (Hybrid)",
                    desc: "Bertanggung jawab atas pengembangan modul edukasi interaktif berbasis VR. Mengoptimalkan aset 3D untuk performa Meta Quest 2 dan mengimplementasikan sistem interaksi SDK Oculus."
                },
                {
                    title: "Technical Game Developer Mentor",
                    organization: "Amikom Computer Club (AMCC)",
                    period: "Oktober 2024 - Sekarang",
                    location: "Sleman, Yogyakarta",
                    desc: "Menyusun silabus dan mengajar materi Unity Fundamental serta C# dasar kepada 50+ anggota komunitas."
                },
                {
                    title: "Freelance Unity Developer",
                    organization: "Upwork / Self-Employed",
                    period: "Januari 2024 - Sekarang",
                    location: "Remote",
                    desc: "Menyelesaikan lebih dari 5 proyek berskala kecil hingga menengah, termasuk game casual mobile (Android) dan simulasi arsitektur interaktif."
                },
                {
                    title: "Asisten Praktikum Pemrograman",
                    organization: "Universitas Amikom Yogyakarta",
                    period: "September 2023 - Januari 2024",
                    location: "Yogyakarta",
                    desc: "Membimbing 40+ mahasiswa dalam memahami konsep dasar logika pemrograman, struktur data, dan OOP menggunakan bahasa C++."
                }
            ],
            education: [
                {
                    school: "Universitas Amikom Yogyakarta",
                    degree: "S1 Teknik Informatika",
                    year: "2022 - 2026 (Expected)",
                    details: "IPK: 3.88 / 4.00. Fokus pada mata kuliah Game Development, Computer Graphics, dan Computer Vision."
                },
                {
                    school: "Bangkit Academy by Google, GoTo, Traveloka",
                    degree: "Mobile Development Path",
                    year: "2024 - 2024",
                    details: "Lulusan program MSIB dengan fokus pada pengembangan aplikasi mobile kelas industri."
                },
                {
                    school: "SMK Negeri 2 Depok Sleman (Stembayo)",
                    degree: "Teknik Komputer dan Jaringan",
                    year: "2019 - 2022",
                    details: "Lulus dengan fokus pada Infrastruktur Jaringan dan Administrasi Server."
                }
            ],
            portfolio: [
                {
                    title: "Neo-Amikom VR Tour",
                    desc: "Aplikasi Virtual Reality untuk tur kampus interaktif. Fitur termasuk teleportasi, UI world-space, dan narasi audio otomatis.",
                    tools: ["Unity", "C#", "Oculus SDK", "Blender"],
                    link: "https://github.com/rosyid/vr-tour"
                },
                {
                    title: "Smart City AR Simulation",
                    desc: "Simulasi tata kota menggunakan Augmented Reality yang memungkinkan user memanipulasi objek gedung di atas marker.",
                    tools: ["Unity", "ARFoundation", "C#"],
                    link: "https://github.com/rosyid/smart-city-ar"
                },
                {
                    title: "Cursed Forest: 2D Platformer",
                    desc: "Game 2D dengan mekanik pertarungan menggunakan state machine. Mencapai 500+ unduhan dalam bulan pertama.",
                    tools: ["Unity", "C#", "Aseprite"],
                    link: "https://rosyid.itch.io/cursed-forest"
                }
            ],
            bannerUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070"
        },
        status: "Pending",
        submittedAt: "2026-02-13T08:00:00Z",
        rejectionCount: 0,
        rejectionReason: null
    },
    {
        id: 1,
        user: {
            id: 101,
            name: "Budi Santoso",
            email: "budi.santoso@gmail.com",
            avatar: "https://i.pravatar.cc/150?u=101",
            role: "Mahasiswa",
            institution: "Universitas Gadjah Mada"
        },
        profileData: {
            headline: "Mahasiswa Informatika | Full Stack Developer",
            bio: "Saya adalah mahasiswa semester 6 yang memiliki ketertarikan mendalam pada pengembangan web full stack. Berpengalaman menggunakan React, Node.js, dan PostgreSQL.",
            location: "Sleman, DI Yogyakarta",
            skills: ["React.js", "Node.js", "Express.js", "PostgreSQL", "Tailwind CSS"],
            experience: [
                {
                    role: "Web Developer Intern",
                    company: "PT Solusi Teknologi Nusantara",
                    period: "Jan 2024 - Mar 2024",
                    description: "Membangun fitur dashboard admin menggunakan React dan Ant Design."
                }
            ],
            education: [
                {
                    institution: "Universitas Gadjah Mada",
                    degree: "S1 Ilmu Komputer",
                    period: "2021 - Sekarang",
                    gpa: "3.85"
                }
            ],
            portfolio: ["https://github.com/budisantoso/portfolio", "https://budisantoso.dev"]
        },
        status: "Pending",
        submittedAt: "2026-02-12T08:30:00Z",
        rejectionCount: 0,
        rejectionReason: null
    },
    {
        id: 2,
        user: {
            id: 102,
            name: "Siti Aminah",
            email: "siti.aminah@yahoo.com",
            avatar: "https://i.pravatar.cc/150?u=102",
            role: "Fresh Graduate",
            institution: "Institut Teknologi Sepuluh Nopember"
        },
        profileData: {
            headline: "UI/UX Designer Enthusiast",
            bio: "Lulusan baru Desain Komunikasi Visual yang fokus pada User Interface dan User Experience. Kreatif dan detail-oriented.",
            location: "Surabaya, Jawa Timur",
            skills: ["Figma", "Adobe XD", "Photoshop", "Illustrator", "Prototyping"],
            experience: [],
            education: [
                {
                    institution: "Institut Teknologi Sepuluh Nopember",
                    degree: "S1 Desain Komunikasi Visual",
                    period: "2020 - 2024",
                    gpa: "3.75"
                }
            ],
            portfolio: ["https://dribbble.com/sitiaminah", "https://behance.net/sitiaminah"]
        },
        status: "Pending",
        submittedAt: "2026-02-12T09:15:00Z",
        rejectionCount: 1,
        rejectionReason: "Portfolio link tidak dapat diakses."
    },
    {
        id: 3,
        user: {
            id: 103,
            name: "Rudi Hermawan",
            email: "rudi.hermawan@outlook.com",
            avatar: "https://i.pravatar.cc/150?u=103",
            role: "Mahasiswa",
            institution: "Universitas Indonesia"
        },
        profileData: {
            headline: "Data Analyst | Python | SQL",
            bio: "Mahasiswa tingkat akhir Statistika yang sedang mencari kesempatan magang di bidang Data Analysis. Mahir menggunakan Python (Pandas, NumPy) dan SQL.",
            location: "Depok, Jawa Barat",
            skills: ["Python", "SQL", "Tableau", "Power BI", "Excel"],
            experience: [
                {
                    role: "Data Analyst Intern",
                    company: "E-Commerce Indonesia",
                    period: "Jun 2025 - Aug 2025",
                    description: "Menganalisis perilaku konsumen dan membuat visualisasi data untuk tim marketing."
                }
            ],
            education: [
                {
                    institution: "Universitas Indonesia",
                    degree: "S1 Statistika",
                    period: "2022 - Sekarang",
                    gpa: "3.90"
                }
            ],
            portfolio: []
        },
        status: "Pending",
        submittedAt: "2026-02-12T10:00:00Z",
        rejectionCount: 0,
        rejectionReason: null
    },
    {
        id: 4,
        user: {
            id: 104,
            name: "Dewi Kartika",
            email: "dewi.kartika@student.ub.ac.id",
            avatar: "https://i.pravatar.cc/150?u=104",
            role: "Mahasiswa",
            institution: "Universitas Brawijaya"
        },
        profileData: {
            headline: "",
            bio: "Just a student.",
            location: "Malang",
            skills: ["Ms Word"],
            experience: [],
            education: [
                {
                    institution: "Universitas Brawijaya",
                    degree: "S1 Admin Public",
                    period: "2023 - Sekarang",
                    gpa: "3.00"
                }
            ],
            portfolio: []
        },
        status: "Pending",
        submittedAt: "2026-02-12T11:20:00Z",
        rejectionCount: 0,
        rejectionReason: null
    },
    {
        id: 5,
        user: {
            id: 105,
            name: "Andi Saputra",
            email: "andi.saputra@gmail.com",
            avatar: "https://i.pravatar.cc/150?u=105",
            role: "Alumni",
            institution: "Telkom University"
        },
        profileData: {
            headline: "Network Engineer",
            bio: "Berpengalaman dalam konfigurasi jaringan Cisco dan MikroTik. Mencari tantangan baru di industri telekomunikasi.",
            location: "Bandung, Jawa Barat",
            skills: ["Cisco Packet Tracer", "MikroTik", "Linux Administration", "Cyber Security"],
            experience: [
                {
                    role: "Freelance Technician",
                    company: "Self Employed",
                    period: "2023 - 2025",
                    description: "Memasang jaringan WiFi rumahan dan kantor kecil."
                }
            ],
            education: [
                {
                    institution: "Telkom University",
                    degree: "D3 Teknik Telekomunikasi",
                    period: "2021 - 2024",
                    gpa: "3.50"
                }
            ],
            portfolio: ["https://linkedin.com/in/andisaputra"]
        },
        status: "Approved",
        submittedAt: "2026-02-10T14:20:00Z",
        processedAt: "2026-02-11T09:00:00",
        rejectionCount: 0,
        rejectionReason: null
    },
    {
        id: 6,
        user: {
            id: 106,
            name: "Joko Susilo",
            email: "joko.susilo@scammer.com",
            avatar: "https://i.pravatar.cc/150?u=106",
            role: "Umum",
            institution: "-"
        },
        profileData: {
            headline: "Make Money Fast $$$",
            bio: "Join my crypto scheme to get rich quick!!!!!",
            location: "Unknown",
            skills: ["Marketing", "Sales"],
            experience: [],
            education: [],
            portfolio: ["http://scam-site.com"]
        },
        status: "Rejected",
        submittedAt: "2026-02-11T16:45:00Z",
        processedAt: "2026-02-12T08:00:00",
        rejectionCount: 1,
        rejectionReason: "Data profil mengandung konten ilegal/SARA. | Indikasi spam."
    }
];
