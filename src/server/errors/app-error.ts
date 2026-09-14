type AppErrorOptions = {
  cause?: unknown;
  code: string;
  statusCode: number;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, options: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;

    if (options.cause) {
      this.cause = options.cause;
    }
  }
}
