/**
 * Workplace EMS Backend Architecture
 * Dedicated, systematic 4-Layer Architecture and Connected Wedge Engine
 * 
 * Layers:
 * 1. Validations (Input validation schemas & business rule constraints)
 * 2. Repositories (Data Access Layer - Supabase PostgreSQL + Local in-memory fallback)
 * 3. Services (Domain logic & Connected Wedge cross-domain reactive engine)
 * 4. API Routes (Handled by Next.js route handlers calling this backend package)
 */

// Layer 1: Validations
export * from "./validations";

// Layer 2: Repositories (DAL)
export * from "./repositories";

// Layer 3: Services (Connected Wedge Engine)
export * from "./services";

// Database & Connectivity
export * from "./database";

// Domain Types
export * from "./types";
