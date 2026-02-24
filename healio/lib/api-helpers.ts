import { NextResponse } from "next/server";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function successResponse<T>(
  data: T,
  init?: ResponseInit,
) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, init);
}

export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

export async function withRouteErrorHandling<T>(
  handler: () => Promise<T>,
): Promise<T | NextResponse<ApiFailure>> {
  try {
    return await handler();
  } catch (error) {
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred.",
      500,
      process.env.NODE_ENV === "development"
        ? { message: error instanceof Error ? error.message : String(error) }
        : undefined,
    );
  }
}
