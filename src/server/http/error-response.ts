import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/errors/app-error";
import { logger } from "@/server/logger";

type ErrorContext = {
  method?: string;
  path?: string;
};

export function toErrorResponse(error: unknown, context: ErrorContext = {}) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: error.issues[0]?.message ?? "Request validation failed.",
        },
      },
      { status: 400 },
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_json",
          message: "Malformed JSON body.",
        },
      },
      { status: 400 },
    );
  }

  logger.error(
    {
      ...context,
      error: serializeError(error),
    },
    "Unhandled route error",
  );

  return NextResponse.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 },
  );
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  return error;
}
