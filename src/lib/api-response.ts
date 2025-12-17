import { NextResponse } from "next/server";

interface ApiErrorResponse {
    error: string;
}

export function apiError(
    error: string,
    status: number = 500,
) {
    const body: ApiErrorResponse = { error };
    return NextResponse.json(body, { status });
}