/** Base error for @filelinks/core — carries a stable `code` for CLI and handlers. */
export class FilelinksError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'FilelinksError';
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigNotFoundError extends FilelinksError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(
      'CONFIG_NOT_FOUND',
      message ??
        'filelinks.config.ts not found when searching upward from the given directory',
      options,
    );
    this.name = 'ConfigNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigExportShapeError extends FilelinksError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(
      'CONFIG_EXPORT_INVALID',
      message ?? 'filelinks.config.ts default export has an invalid shape',
      options,
    );
    this.name = 'ConfigExportShapeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ConfigValidationError extends FilelinksError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(
      'CONFIG_VALIDATION',
      message ?? 'filelinks.config.ts failed schema validation',
      options,
    );
    this.name = 'ConfigValidationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
