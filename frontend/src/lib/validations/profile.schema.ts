// frontend/src/lib/validations/profile.schema.ts
// Layer 1: Validation Schemas for Page 15 (My Profile & Employee Self-Service)

import type { Employee, EmployeeDocument } from "../types";

export interface UpdateProfileInput {
  phone?: string;
  address?: string;
  dob?: string;
  gender?: Employee["gender"];
  bankAccount?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  skills?: string[];
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UploadDocumentInput {
  name: string;
  type: EmployeeDocument["type"];
  url?: string;
}

export function validateUpdateProfileInput(input: any): { ok: true; data: UpdateProfileInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Request payload is required." };
  }

  const result: UpdateProfileInput = {};

  if (input.phone !== undefined) {
    result.phone = typeof input.phone === "string" ? input.phone.trim() : "";
  }

  if (input.address !== undefined) {
    result.address = typeof input.address === "string" ? input.address.trim() : "";
  }

  if (input.dob !== undefined) {
    const dob = typeof input.dob === "string" ? input.dob.trim() : "";
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      return { ok: false, error: "Date of birth must be formatted YYYY-MM-DD." };
    }
    result.dob = dob;
  }

  if (input.gender !== undefined) {
    const validGenders = ["Male", "Female", "Other"];
    if (!validGenders.includes(input.gender)) {
      return { ok: false, error: "Gender must be Male, Female, or Other." };
    }
    result.gender = input.gender;
  }

  if (input.bankAccount !== undefined) {
    result.bankAccount = typeof input.bankAccount === "string" ? input.bankAccount.trim() : "";
  }

  if (input.emergencyContact !== undefined) {
    if (typeof input.emergencyContact !== "object" || input.emergencyContact === null) {
      return { ok: false, error: "Emergency contact must be an object." };
    }
    result.emergencyContact = {
      name: typeof input.emergencyContact.name === "string" ? input.emergencyContact.name.trim() : "",
      relation: typeof input.emergencyContact.relation === "string" ? input.emergencyContact.relation.trim() : "",
      phone: typeof input.emergencyContact.phone === "string" ? input.emergencyContact.phone.trim() : "",
    };
  }

  if (input.skills !== undefined) {
    if (!Array.isArray(input.skills)) {
      return { ok: false, error: "Skills must be an array of strings." };
    }
    result.skills = input.skills.map((s: any) => String(s).trim()).filter(Boolean);
  }

  return { ok: true, data: result };
}

export function validateChangePasswordInput(input: any): { ok: true; data: ChangePasswordInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Password payload is required." };
  }

  if (!input.currentPassword || typeof input.currentPassword !== "string") {
    return { ok: false, error: "Current password is required." };
  }

  if (!input.newPassword || typeof input.newPassword !== "string" || input.newPassword.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters." };
  }

  return {
    ok: true,
    data: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
  };
}

export function validateUploadDocumentInput(input: any): { ok: true; data: UploadDocumentInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Document payload is required." };
  }

  if (!input.name || typeof input.name !== "string" || input.name.trim().length < 2) {
    return { ok: false, error: "Document name must be at least 2 characters." };
  }

  const validTypes = ["ID Proof", "Address Proof", "Education", "Certification", "Contract", "Other"];
  if (!input.type || !validTypes.includes(input.type)) {
    return { ok: false, error: `Document type must be one of: ${validTypes.join(", ")}` };
  }

  return {
    ok: true,
    data: {
      name: input.name.trim(),
      type: input.type,
      url: typeof input.url === "string" ? input.url.trim() : undefined,
    },
  };
}
