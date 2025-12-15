export interface ApiResponse<T> {
    ok: boolean;
    data?: T;
    error?: string;
}
