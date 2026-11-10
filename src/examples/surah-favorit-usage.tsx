// "use client"

// import { useState, useEffect } from "react";
// import { 
//   fetchSurahFavorit, 
//   fetchSurahFavoritWithDetails, 
//   fetchSurahFavoritByPeriod, 
//   fetchSurahTrend 
// } from "@/utils/api/statistik/fetch";

// // Contoh penggunaan function fetchSurahFavorit
// export function SurahFavoritExample() {
//   const [surahFavorit, setSurahFavorit] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadSurahFavorit = async () => {
//       try {
//         const result = await fetchSurahFavorit();
//         if (result.success) {
//           setSurahFavorit(result.data);
//         }
//       } catch (error) {
//         console.error("Error loading surah favorit:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadSurahFavorit();
//   }, []);

//   if (loading) return <div>Loading...</div>;

//   return (
//     <div>
//       <h2>Top 10 Surah Terfavorit</h2>
//       <ul>
//         {surahFavorit.map((surah, index) => (
//           <li key={surah.surahNumber}>
//             {index + 1}. {surah.surahName} (Surah {surah.surahNumber}) - {surah.count} kali
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// // Contoh penggunaan function fetchSurahFavoritWithDetails
// export function SurahFavoritWithDetailsExample() {
//   const [surahDetails, setSurahDetails] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadSurahDetails = async () => {
//       try {
//         const result = await fetchSurahFavoritWithDetails();
//         if (result.success) {
//           setSurahDetails(result);
//         }
//       } catch (error) {
//         console.error("Error loading surah details:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadSurahDetails();
//   }, []);

//   if (loading) return <div>Loading...</div>;

//   return (
//     <div>
//       <h2>Surah Favorit dengan Detail</h2>
//       <div>
//         <h3>Summary:</h3>
//         <p>Total Recaps: {surahDetails.summary.totalRecaps}</p>
//         <p>Unique Surahs: {surahDetails.summary.uniqueSurahs}</p>
//         <p>Total Reciters: {surahDetails.summary.totalUniqueReciters}</p>
//         <p>Total Groups: {surahDetails.summary.totalGroups}</p>
//       </div>
      
//       <div>
//         <h3>Top 15 Surah:</h3>
//         {surahDetails.data.map((surah: any, index: number) => (
//           <div key={surah.surahNumber} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
//             <h4>{index + 1}. {surah.surahName} (Surah {surah.surahNumber})</h4>
//             <p>Total Count: {surah.count}</p>
//             <p>Recent Count (30 days): {surah.recentCount}</p>
//             <p>Unique Reciters: {surah.uniqueRecitersCount}</p>
//             <p>Groups: {surah.groupsCount}</p>
//             <p>Last Activity: {new Date(surah.lastActivity).toLocaleDateString()}</p>
//             <div>
//               <strong>Recitation Types:</strong>
//               {Object.entries(surah.recitationTypes).map(([type, count]) => (
//                 <span key={type} style={{ marginLeft: '10px' }}>
//                   {type}: {count as number}
//                 </span>
//               ))}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Contoh penggunaan function fetchSurahFavoritByPeriod
// export function SurahFavoritByPeriodExample() {
//   const [surahByPeriod, setSurahByPeriod] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadSurahByPeriod = async () => {
//       try {
//         // Contoh: ambil data 7 hari terakhir
//         const endDate = new Date().toISOString();
//         const startDate = new Date();
//         startDate.setDate(startDate.getDate() - 7);
//         const startDateStr = startDate.toISOString();

//         const result = await fetchSurahFavoritByPeriod(startDateStr, endDate);
//         if (result.success) {
//           setSurahByPeriod(result);
//         }
//       } catch (error) {
//         console.error("Error loading surah by period:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadSurahByPeriod();
//   }, []);

//   if (loading) return <div>Loading...</div>;

//   return (
//     <div>
//       <h2>Surah Favorit 7 Hari Terakhir</h2>
//       <div>
//         <h3>Period Info:</h3>
//         <p>Start Date: {new Date(surahByPeriod.period.startDate).toLocaleDateString()}</p>
//         <p>End Date: {new Date(surahByPeriod.period.endDate).toLocaleDateString()}</p>
//         <p>Total Recaps: {surahByPeriod.period.totalRecaps}</p>
//         <p>Unique Surahs: {surahByPeriod.period.uniqueSurahs}</p>
//       </div>
      
//       <div>
//         <h3>Surah dalam periode ini:</h3>
//         {surahByPeriod.data.map((surah: any, index: number) => (
//           <div key={surah.surahNumber} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc' }}>
//             <h4>{index + 1}. {surah.surahName} (Surah {surah.surahNumber})</h4>
//             <p>Count: {surah.count}</p>
//             <p>Unique Reciters: {surah.uniqueRecitersCount}</p>
//             <p>Groups: {surah.groupsCount}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Contoh penggunaan function fetchSurahTrend
// export function SurahTrendExample() {
//   const [surahTrend, setSurahTrend] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const loadSurahTrend = async () => {
//       try {
//         const result = await fetchSurahTrend();
//         if (result.success) {
//           setSurahTrend(result);
//         }
//       } catch (error) {
//         console.error("Error loading surah trend:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadSurahTrend();
//   }, []);

//   if (loading) return <div>Loading...</div>;

//   return (
//     <div>
//       <h2>Analisis Trend Surah</h2>
//       <div>
//         <h3>Summary:</h3>
//         <p>Period: {surahTrend.analysis.period}</p>
//         <p>Comparison: {surahTrend.analysis.comparison}</p>
//         <p>Total Surahs: {surahTrend.analysis.totalSurahs}</p>
//         <p>Increasing Trend: {surahTrend.analysis.increasingTrend}</p>
//         <p>Decreasing Trend: {surahTrend.analysis.decreasingTrend}</p>
//         <p>Stable Trend: {surahTrend.analysis.stableTrend}</p>
//       </div>
      
//       <div>
//         <h3>Surah dengan Trend:</h3>
//         {surahTrend.data.map((surah: any, index: number) => (
//           <div key={surah.surahNumber} style={{ 
//             marginBottom: '10px', 
//             padding: '10px', 
//             border: '1px solid #ccc',
//             backgroundColor: surah.trend === 'increasing' ? '#d4edda' : 
//                            surah.trend === 'decreasing' ? '#f8d7da' : '#fff3cd'
//           }}>
//             <h4>{index + 1}. {surah.surahName} (Surah {surah.surahNumber})</h4>
//             <p>Trend: <strong>{surah.trend}</strong></p>
//             <p>Change Percentage: {surah.changePercentage}%</p>
//             <p>Old Period Count: {surah.oldPeriodCount}</p>
//             <p>New Period Count: {surah.newPeriodCount}</p>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// // Komponen utama yang menggabungkan semua contoh
// export default function SurahFavoritUsageExamples() {
//   return (
//     <div style={{ padding: '20px' }}>
//       <h1>Contoh Penggunaan Function Surah Favorit</h1>
      
//       <div style={{ marginBottom: '40px' }}>
//         <SurahFavoritExample />
//       </div>
      
//       <div style={{ marginBottom: '40px' }}>
//         <SurahFavoritWithDetailsExample />
//       </div>
      
//       <div style={{ marginBottom: '40px' }}>
//         <SurahFavoritByPeriodExample />
//       </div>
      
//       <div style={{ marginBottom: '40px' }}>
//         <SurahTrendExample />
//       </div>
//     </div>
//   );
// }
