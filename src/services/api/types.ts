/**
 * MyQurani API Type Definitions
 * Base URL: https://api.myqurani.com
 * 
 * These types are based on the OpenAPI specification from:
 * https://api.myqurani.com/scalar/#openapisupportjson
 */

// ============================================
// Generic API Response Wrapper
// ============================================
export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data?: T;
}

// ============================================
// Authentication Types
// ============================================
export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
    user?: UserInfo;
}

export interface UserInfo {
    id: number;
    email: string;
    name?: string;
    username?: string;
    role?: string;
    avatar?: string;
    emailVerified?: boolean;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface LogoutRequest {
    refreshToken: string;
}

// ============================================
// Error Response
// ============================================
export interface ErrorResponse {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
}

// For handling API errors
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode: number,
        public errors?: Record<string, string[]>
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// ============================================
// Ticket Types (for future use)
// ============================================
export interface TicketListDto {
    id: number;
    subject: string;
    status: number;
    priority: number;
    createdAt: string;
    updatedAt: string;
    userId: number;
    userName?: string;
    assignedTo?: number;
    assignedName?: string;
}

export interface TicketDetailDto extends TicketListDto {
    description: string;
    replies: TicketReplyDto[];
    attachments?: TicketAttachmentDto[];
}

export interface TicketReplyDto {
    id: number;
    ticketId: number;
    userId: number;
    userName?: string;
    message: string;
    isStaff: boolean;
    createdAt: string;
    attachments?: TicketAttachmentDto[];
}

export interface TicketAttachmentDto {
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
}

export interface CreateTicketRequest {
    subject: string;
    description: string;
    priority?: number;
    departmentId?: number;
}

export interface CreateReplyRequest {
    message: string;
}

// ============================================
// Pagination Types
// ============================================
export interface OffsetPagedResponse<T> {
    items: T[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}
