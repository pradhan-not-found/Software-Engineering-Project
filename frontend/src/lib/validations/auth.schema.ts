/**
 * Authentication Input Validation Schemas
 * Layer 2 / Validation Layer
 */

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SignupDTO {
  name: string;
  email: string;
  password: string;
  orgName: string;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Validates login request payload
 */
export function validateLoginInput(body: unknown): ValidationResult<LoginDTO> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON payload." };
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.trim()) {
    return { ok: false, error: "Email address is required." };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return { ok: false, error: "Please provide a valid email address." };
  }

  if (typeof password !== "string" || !password) {
    return { ok: false, error: "Password is required." };
  }

  if (password.length < 4) {
    return { ok: false, error: "Password must be at least 4 characters." };
  }

  return {
    ok: true,
    data: {
      email: normalizedEmail,
      password,
    },
  };
}

/**
 * Validates signup request payload
 */
export function validateSignupInput(body: unknown): ValidationResult<SignupDTO> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON payload." };
  }

  const { name, email, password, orgName } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, error: "Full name must be at least 2 characters." };
  }

  const loginCheck = validateLoginInput({ email, password });
  if (!loginCheck.ok) {
    return loginCheck;
  }

  const org = typeof orgName === "string" ? orgName.trim() : "My Organization";

  return {
    ok: true,
    data: {
      name: name.trim(),
      email: loginCheck.data.email,
      password: loginCheck.data.password,
      orgName: org || "My Organization",
    },
  };
}

