export class BbgError extends Error {
  code: string;
  hint?: string;

  constructor(message: string, code: string, hint?: string, cause?: unknown) {
    super(message, { cause });
    this.name = new.target.name;
    this.code = code;
    this.hint = hint;
  }
}

export class BbgConfigError extends BbgError {}

export class BbgGitError extends BbgError {}

export class BbgTemplateError extends BbgError {}
