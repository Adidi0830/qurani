/**
 * MyQurani API Services
 * 
 * Central export point for all API services.
 * Import from this file for cleaner imports elsewhere.
 */

// Re-export API client
export { apiClient, getAccessToken, clearTokens, setTokens } from './client';

// Re-export auth services
export {
    loginWithApi,
    logoutWithApi,
    refreshAccessToken,
    getCurrentUserFromToken,
    isAuthenticated,
} from './auth';

// Re-export OAuth services
export {
    getGoogleOAuthUrl,
    handleGoogleCallback,
} from './oauth';

// Re-export Setoran/Recitation services
export {
    createSetoran,
    fetchMySetoran,
    fetchReceivedSetoran,
    fetchSetoranByGroup,
    fetchSetoranById,
    searchSetoran,
    verifySetoran,
    uploadSetoranAudio,
    getSetoranAudio,
    deleteSetoranAudio,
    fetchHafalanProgress,
    fetchStreakInfo,
    fetchGroupLeaderboard,
    fetchTeacherDashboard,
    fetchRecapByCity,
    fetchCertificates,
    fetchSetoranStats,
} from './setoran';

// Re-export types from setoran
export type {
    SetoranListDto,
    SetoranDetailDto,
    SetoranStatsDto,
    CreateSetoranRequest,
    SetoranAudioDto,
    VerifySetoranRequest,
    HafalanProgressDto,
    StreakInfoDto,
    LeaderboardEntryDto,
    TeacherDashboardDto,
    RecapCityDto,
    SetoranCertificateDto,
} from './setoran';

// Re-export types from types file
export type {
    ApiResponse,
    AuthResponse,
    LoginRequest,
    UserInfo,
    ErrorResponse,
    OffsetPagedResponse,
} from './types';

export { ApiError } from './types';

// Re-export User/Profile services
export {
    fetchCurrentUser,
    fetchUserById,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    searchUsers,
} from './users';

// Re-export types from users
export type {
    UserProfileDto,
    UpdateProfileRequest,
} from './users';

// Re-export Certificate services
export {
    searchCertificates,
    getCertificateById,
    getCertificateByNumber,
    getCertificateForBooking,
    getCertificatesByTrainer,
    bulkIssueCertificates,
    revokeCertificate,
    reinstateCertificate,
    getCertificateTemplates,
    getCertificateStatistics,
    getExpiringCertificates,
    updateCertificateVisibility,
} from './certificates';

// Re-export types from certificates
export type {
    CertificateDto,
    CertificateSearchParams,
    CertificatePagedResponse,
    BulkIssueCertificatesRequest,
    RevokeCertificateRequest,
    ReinstateCertificateRequest,
    CertificateTemplateDto,
    CertificateStatisticsDto,
    ExpiringCertificateDto,
} from './certificates';
