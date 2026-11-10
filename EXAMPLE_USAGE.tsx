// // Contoh penggunaan i18n yang sudah disederhanakan

// // 1. Setup di layout utama (src/app/layout.tsx)
// import { I18nProvider } from '@/components/providers/i18n-provider';

// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html>
//       <body>
//         <I18nProvider>
//           {children}
//         </I18nProvider>
//       </body>
//     </html>
//   );
// }

// // 2. Contoh penggunaan di komponen
// import { useI18n } from '@/components/providers/i18n-provider';
// import { LanguageSwitcher } from '@/components/ui/language-switcher';

// export default function ProfilePage() {
//   const { t, locale } = useI18n();

//   return (
//     <div>
//       {/* Language Switcher - bisa ditaruh di header/navbar */}
//       <div className="flex justify-end p-4">
//         <LanguageSwitcher />
//       </div>

//       {/* Konten dengan terjemahan */}
//       <div className="p-6">
//         <h1 className="text-2xl font-bold mb-4">
//           {t('profile.edit_profile', 'Edit Profile')}
//         </h1>
        
//         <div className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium mb-1">
//               {t('profile.full_name', 'Full Name')}
//             </label>
//             <input 
//               type="text" 
//               placeholder={t('auth.full_name', 'Enter your full name')}
//               className="w-full p-2 border rounded"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">
//               {t('auth.email', 'Email')}
//             </label>
//             <input 
//               type="email" 
//               placeholder={t('auth.email', 'Enter your email')}
//               className="w-full p-2 border rounded"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium mb-1">
//               {t('profile.language', 'Language')}
//             </label>
//             <p className="text-sm text-gray-600">
//               {t('profile.select_language', 'Select your preferred language')}
//             </p>
//           </div>
//         </div>

//         <div className="mt-6 flex gap-2">
//           <button className="px-4 py-2 bg-blue-500 text-white rounded">
//             {t('common.save', 'Save')}
//           </button>
//           <button className="px-4 py-2 bg-gray-300 text-gray-700 rounded">
//             {t('common.cancel', 'Cancel')}
//           </button>
//         </div>

//         {/* Debug info */}
//         <div className="mt-8 p-4 bg-gray-100 rounded text-sm">
//           <p>Current locale: <strong>{locale}</strong></p>
//           <p>Route: <strong>/profile</strong> (tidak berubah)</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// // 3. Contoh untuk komponen lain (Dashboard)
// export function DashboardExample() {
//   const { t } = useI18n();

//   return (
//     <div className="p-6">
//       <h1 className="text-3xl font-bold mb-2">
//         {t('dashboard.welcome', 'Welcome')}
//       </h1>
      
//       <div className="grid grid-cols-3 gap-4 mt-6">
//         <div className="bg-white p-4 rounded shadow">
//           <h3 className="font-semibold">
//             {t('dashboard.daily_target', 'Daily Target')}
//           </h3>
//           <p className="text-2xl font-bold text-green-600">5/10</p>
//         </div>
        
//         <div className="bg-white p-4 rounded shadow">
//           <h3 className="font-semibold">
//             {t('dashboard.weekly_target', 'Weekly Target')}
//           </h3>
//           <p className="text-2xl font-bold text-blue-600">15/35</p>
//         </div>
        
//         <div className="bg-white p-4 rounded shadow">
//           <h3 className="font-semibold">
//             {t('dashboard.monthly_target', 'Monthly Target')}
//           </h3>
//           <p className="text-2xl font-bold text-purple-600">45/150</p>
//         </div>
//       </div>

//       <div className="mt-8">
//         <h2 className="text-xl font-semibold mb-4">
//           {t('dashboard.recent_activity', 'Recent Activity')}
//         </h2>
        
//         <div className="space-y-2">
//           <div className="bg-white p-3 rounded shadow-sm">
//             <p>{t('quran.recitation', 'Recitation')} - {t('quran.surah', 'Surah')} Al-Fatiha</p>
//             <p className="text-sm text-gray-600">2 {t('common.hours_ago', 'hours ago')}</p>
//           </div>
          
//           <div className="bg-white p-3 rounded shadow-sm">
//             <p>{t('quran.memorization', 'Memorization')} - {t('quran.juz', 'Juz')} 1</p>
//             <p className="text-sm text-gray-600">1 {t('common.day_ago', 'day ago')}</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /*
// KEUNGGULAN PENDEKATAN INI:

// 1. ✅ Route TIDAK berubah
//    - /dashboard tetap /dashboard
//    - /profile tetap /profile
//    - Tidak ada duplikasi route

// 2. ✅ Switching mudah
//    - Klik dropdown language switcher
//    - Bahasa berubah instant tanpa reload
//    - Preference tersimpan di localStorage

// 3. ✅ Auto-detection
//    - Pertama kali buka: deteksi dari browser
//    - Kunjungan selanjutnya: ambil dari localStorage

// 4. ✅ Fallback system
//    - Jika key tidak ada, tampilkan fallback text
//    - Jika bahasa tidak ada, gunakan default (id)

// 5. ✅ TypeScript support
//    - Type safety untuk locale
//    - Autocomplete untuk key translation

// CARA KERJA:
// 1. User buka /dashboard
// 2. Hook useI18n() load bahasa dari localStorage/browser
// 3. Load file JSON sesuai bahasa (id.json, en.json, ar.json)
// 4. Render teks sesuai bahasa
// 5. User ganti bahasa → state berubah → teks berubah
// 6. Preference disimpan ke localStorage

// TIDAK ADA:
// - ❌ Route duplication (/id/dashboard, /en/dashboard)
// - ❌ Server-side routing complexity
// - ❌ URL berubah saat ganti bahasa
// - ❌ Page reload saat ganti bahasa
// */
