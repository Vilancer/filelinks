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

export class AgentConfigError extends FilelinksError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(
      'AGENT_CONFIG_INVALID',
      message ?? 'agent settings failed validation after merge',
      options,
    );
    this.name = 'AgentConfigError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentMissingApiKeyError extends FilelinksError {
  constructor(message?: string, options?: { cause?: unknown }) {
    super(
      'AGENT_MISSING_API_KEY',
      message ??
        'CURSOR_API_KEY is required — set it in your environment or create one in Cursor Dashboard → Integrations',
      options,
    );
    this.name = 'AgentMissingApiKeyError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentProviderUnknownError extends FilelinksError {
  constructor(providerId?: string, options?: { cause?: unknown }) {
    super(
      'AGENT_PROVIDER_UNKNOWN',
      providerId
        ? `Unknown agent provider: ${providerId}`
        : 'Unknown agent provider',
      options,
    );
    this.name = 'AgentProviderUnknownError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentStartupError extends FilelinksError {
  readonly details?: { isRetryable?: boolean };

  constructor(
    message?: string,
    options?: { cause?: unknown; details?: { isRetryable?: boolean } },
  ) {
    super(
      'AGENT_STARTUP_FAILED',
      message ?? 'Agent failed to start',
      options,
    );
    this.name = 'AgentStartupError';
    if (options?.details !== undefined) {
      this.details = options.details;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AgentRunFailedError extends FilelinksError {
  constructor(
    message?: string,
    options?: { cause?: unknown; runId?: string },
  ) {
    const runId = options?.runId;
    const baseMessage = message ?? 'Agent run failed';
    super(
      'AGENT_RUN_FAILED',
      runId ? `${baseMessage} (runId: ${runId})` : baseMessage,
      options,
    );
    this.name = 'AgentRunFailedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
