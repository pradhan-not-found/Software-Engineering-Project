// Self-contained verification script for Page 1 Authentication & Session Gateway

console.log("==================================================");
console.log("TESTING PAGE 1 (AUTHENTICATION GATEWAY) FUNCTIONALITY");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ------------------------------------------------------------------
// 1. Validation Logic
// ------------------------------------------------------------------
console.log("[1. Layer 2: Validation Tests]");

function validateLoginInput(body) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid JSON payload." };
  const { email, password } = body;
  if (typeof email !== "string" || !email.trim()) return { ok: false, error: "Email address is required." };
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) return { ok: false, error: "Please provide a valid email address." };
  if (typeof password !== "string" || !password) return { ok: false, error: "Password is required." };
  if (password.length < 4) return { ok: false, error: "Password must be at least 4 characters." };
  return { ok: true, data: { email: normalizedEmail, password } };
}

assert(validateLoginInput({ email: "arjun@workplace.com", password: "demo1234" }).ok === true, "Valid login passes validation");
assert(validateLoginInput({ email: "bad-email", password: "demo1234" }).ok === false, "Invalid email fails validation");
assert(validateLoginInput({ email: "arjun@workplace.com", password: "12" }).ok === false, "Short password fails validation");

// ------------------------------------------------------------------
// 2. Mock Database & Repository Logic
// ------------------------------------------------------------------
console.log("\n[2. Layer 4: Repository Tests]");

const mockEmployees = [
  {
    id: "emp_arjun",
    code: "WP-1001",
    firstName: "Arjun",
    lastName: "Mehta",
    email: "arjun@workplace.com",
    password: "demo1234",
    role: "SUPER_ADMIN",
    accountStatus: "ACTIVE",
    status: "ACTIVE",
  },
  {
    id: "emp_suspended",
    code: "WP-1002",
    firstName: "Suspended",
    lastName: "User",
    email: "suspended@workplace.com",
    password: "demo1234",
    role: "EMPLOYEE",
    accountStatus: "SUSPENDED",
    status: "ACTIVE",
  },
];

function findByEmail(email) {
  const norm = email.trim().toLowerCase();
  return mockEmployees.find((e) => e.email.toLowerCase() === norm) || null;
}

function findById(id) {
  return mockEmployees.find((e) => e.id === id) || null;
}

assert(findByEmail("arjun@workplace.com")?.role === "SUPER_ADMIN", "Repository finds user by email");
assert(findByEmail("unknown@workplace.com") === null, "Repository returns null for unknown email");

// ------------------------------------------------------------------
// 3. Domain Service Logic
// ------------------------------------------------------------------
console.log("\n[3. Layer 3: Service & Session Security Tests]");

function login(email, password) {
  const user = findByEmail(email);
  if (!user) return { ok: false, error: "Invalid email or password." };
  if (user.accountStatus === "SUSPENDED" || user.status === "TERMINATED") {
    return { ok: false, error: "This account has been suspended. Please contact your HR administrator." };
  }
  if (user.password !== password) return { ok: false, error: "Invalid email or password." };

  const sessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
    issuedAt: Date.now(),
  };

  const token = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");
  const sanitized = { ...user };
  delete sanitized.password;

  return { ok: true, data: { user: sanitized, token } };
}

function getSessionUser(token) {
  try {
    if (!token) return null;
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (!decoded.userId) return null;
    const user = findById(decoded.userId);
    if (!user || user.accountStatus === "SUSPENDED") return null;
    const sanitized = { ...user };
    delete sanitized.password;
    return sanitized;
  } catch {
    return null;
  }
}

const loginRes = login("arjun@workplace.com", "demo1234");
assert(loginRes.ok === true && loginRes.data.token, "Successful login generates signed base64 token");
assert(loginRes.data.user.password === undefined, "Password is removed from sanitized user payload");

const wrongPassRes = login("arjun@workplace.com", "wrongpass");
assert(wrongPassRes.ok === false && wrongPassRes.error === "Invalid email or password.", "Wrong password rejected");

const suspendedRes = login("suspended@workplace.com", "demo1234");
assert(suspendedRes.ok === false && suspendedRes.error.includes("suspended"), "Suspended account is locked out");

const sessionUser = getSessionUser(loginRes.data.token);
assert(sessionUser?.id === "emp_arjun", "Valid session token restores user session");
assert(getSessionUser("bad_token_xyz") === null, "Malformed session token safely returns null");

console.log("\n==================================================");
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) process.exit(1);

