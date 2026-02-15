/**
 * Standardized API Response Utilities
 * Ensures all endpoints return consistent response formats
 */

import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

/**
 * Success response with data
 */
export function successResponse<T>(
  data: T,
  meta?: Record<string, any>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Paginated success response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, any>
): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * JSON response with proper status code
 */
export function jsonResponse<T>(data: ApiResponse<T>, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Error JSON response with proper status code
 */
export function jsonErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
) {
  return NextResponse.json(errorResponse(code, message, details), { status });
}

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_REQUEST: 'INVALID_REQUEST',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
} as const;

/**
 * Request validation helper
 */
export async function validateRequest<T>(
  request: Request,
  schema: any
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const body = await request.json();
    const validated = await schema.parseAsync(body);
    return { success: true, data: validated };
  } catch (error: any) {
    return {
      success: false,
      error: error?.errors?.[0]?.message || error.message || 'Validation failed',
    };
  }
}
