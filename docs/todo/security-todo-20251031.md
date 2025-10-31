# Security Audit Report - NooblyJS Wiki Application
**Date:** 2025-10-31
**Auditor:** Claude Code Security Audit
**Status:** In Progress

---

## Executive Summary

A comprehensive security audit of the NooblyJS Wiki Application has identified **7 CRITICAL**, **8 HIGH**, and **6 MEDIUM** severity vulnerabilities. The most critical issues involve hardcoded credentials, unsafe code execution, insecure session configuration, and missing CSRF protection. This document tracks all identified issues and their remediation status.

---

## CRITICAL Vulnerabilities (Immediate Action Required)

### 1. Hardcoded Admin Credentials in Multiple Routes
**Severity:** CRITICAL
**File:**
- `src/routes/userRoutes.js:55`
- `src/auth/routes/authRoutes.js:83`

**Description:**
Hardcoded admin credentials exist in the codebase:
- `userRoutes.js`: `username === 'admin' && password === 'password'`
- `authRoutes.js`: `username === 'admin' && password === 'admin123'`

**Impact:**
- Complete authentication bypass
- Anyone with access to code can login as admin
- Production systems immediately compromised

**Recommended Fix:**
- Remove hardcoded credentials immediately
- Use environment variables for auth testing if needed
- Implement proper authentication flow with secure password hashing
- Add authentication tests that don't rely on hardcoded values

**Status:** [ ] Not Started

---

### 2. Insecure Session Configuration
**Severity:** CRITICAL
**File:** `app.js:27-32`

**Description:**
Session middleware configured with critical security issues:
```javascript
app.use(session({
  secret: 'admin-dashboard-secret',  // HARDCODED SECRET
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }  // NOT SECURE OVER HTTPS
}));
```

**Impact:**
- Session secret is hardcoded and version-controlled
- Session cookies sent over HTTP (insecure)
- Session hijacking possible
- MitM attacks can steal session tokens

**Recommended Fix:**
- Use environment variable for session secret: `process.env.SESSION_SECRET`
- Set `secure: true` when in production
- Set `httpOnly: true` to prevent XSS access to cookies
- Set `sameSite: 'Strict'` for CSRF protection
- Use secure session store (Redis) in production

**Status:** [ ] Not Started

**Implementation:**
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

---

### 3. Unsafe Code Execution with `new Function()` in Wiki-Code Feature
**Severity:** CRITICAL
**File:** `src/views/js/modules/documentcontroller.js:1870`

**Description:**
The wiki-code feature executes arbitrary JavaScript code from document content:
```javascript
const func = new Function('return ' + trimmedCode);
const result = func()();
```

**Impact:**
- Arbitrary code execution in browser
- Access to `window` object and all global scope
- Can steal session tokens, cookies, localStorage data
- Can modify DOM, perform XSS attacks
- No sandbox isolation

**Recommended Fix:**
- Use Web Workers for code isolation (limited scope)
- Implement a code sandbox with restricted API
- Consider using `iframe` with `sandbox` attribute
- Whitelist allowed functions/objects
- Add code validation and AST analysis before execution
- Document security limitations clearly

**Status:** [ ] Not Started

**Safer Alternative (Short-term):**
- Disable wiki-code execution in production
- Move to read-only mode for untrusted users
- Add permission checks before code execution

---

### 4. Missing CSRF Protection
**Severity:** CRITICAL
**File:** All routes - `src/routes/*.js`, `app.js`

**Description:**
No CSRF token validation on state-changing operations (POST, PUT, DELETE).

**Impact:**
- Cross-site request forgery attacks possible
- Malicious websites can perform actions on behalf of users
- File uploads, document modifications, settings changes vulnerable

**Recommended Fix:**
- Install `csurf` middleware: `npm install csurf`
- Generate and validate CSRF tokens on all forms and API calls
- Use double-submit cookie pattern or synchronizer token pattern

**Status:** [ ] Not Started

**Implementation:**
```javascript
const csrf = require('csurf');
app.use(csrf({ cookie: true }));
// Add middleware to protect routes
app.post('/applications/wiki/api/*', csrf(), (req, res) => { /* ... */ });
```

---

### 5. Direct File Path Access Without Proper Validation (Path Traversal Risk)
**Severity:** CRITICAL
**Files:**
- `src/routes/navigationRoutes.js:54-99`
- `src/routes/documentRoutes.js:28-61`

**Description:**
While path validation exists with `path.startsWith()` check, the implementation uses user-controlled input (`folderPath`, `parentPath`) with minimal normalization:
```javascript
const folderPath = parentPath ? `${parentPath}/${name}` : name;
const absolutePath = path.resolve(spaceBaseDir, folderPath);
if (!absolutePath.startsWith(spaceBaseDir)) { throw new Error(...) }
```

**Issues:**
- `path.resolve()` can be bypassed with `../` sequences
- No normalization of path separators (could use forward/backward slashes)
- Case-sensitive comparison on case-insensitive filesystems

**Impact:**
- Path traversal attacks possible (access files outside space)
- Read/write arbitrary files on filesystem
- Data exfiltration or modification

**Recommended Fix:**
- Use `path.normalize()` before validation
- Use `path.relative()` to ensure path is within base directory
- Reject paths containing `..` or `.`
- Implement strict allowlist validation

**Status:** [ ] Not Started

**Implementation:**
```javascript
function validatePath(basePath, userPath) {
  const normalized = path.normalize(userPath);
  if (normalized.includes('..') || normalized.startsWith('/')) {
    throw new Error('Invalid path');
  }
  const resolved = path.resolve(basePath, normalized);
  const relative = path.relative(basePath, resolved);
  if (relative.startsWith('..')) {
    throw new Error('Path outside base directory');
  }
  return resolved;
}
```

---

### 6. No Authentication Middleware on Critical Routes
**Severity:** CRITICAL
**Files:** `src/routes/documentRoutes.js`, `src/routes/spacesRoutes.js`, etc.

**Description:**
Most API routes lack authentication middleware. They depend on optional checks:
```javascript
if (!req.isAuthenticated()) { /* handle error */ }
```

This is reactive, not proactive. No global middleware enforces authentication.

**Impact:**
- Unauthenticated users can access all wiki data
- No authorization enforcement
- API endpoints accessible to anyone

**Recommended Fix:**
- Create global auth middleware in `app.js` or dedicated auth file
- Apply to all protected routes
- Use route guards or Express Router groups

**Status:** [ ] Not Started

---

### 7. Insecure Google OAuth Configuration Not Validated
**Severity:** CRITICAL
**File:** `src/auth/passport-config.js:68-92`

**Description:**
Google OAuth is conditionally enabled only if env vars exist, but no validation of credentials:
```javascript
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({...}))
}
```

**Issues:**
- No callback URL validation
- No state parameter verification (CSRF protection for OAuth)
- No PKCE support
- Default redirect if env vars missing

**Impact:**
- OAuth state hijacking possible
- Account takeover risk
- Redirect to untrusted OAuth providers

**Recommended Fix:**
- Always validate OAuth configuration
- Use PKCE flow for desktop/mobile apps
- Validate state parameter
- Ensure secure redirect_uri matching

**Status:** [ ] Not Started

---

## HIGH Severity Vulnerabilities (Should Fix Soon)

### 8. No HTTPS Enforcement / No Security Headers
**Severity:** HIGH
**File:** `app.js`

**Description:**
No security headers or HTTPS enforcement:
- No `Strict-Transport-Security` (HSTS) header
- No `X-Content-Type-Options` header
- No `X-Frame-Options` header (clickjacking)
- No `Content-Security-Policy` header

**Impact:**
- Clickjacking attacks possible
- MIME-type sniffing
- Man-in-the-middle attacks over HTTP

**Recommended Fix:**
- Install `helmet` middleware: `npm install helmet`
- Add security headers
- Redirect HTTP to HTTPS in production

**Status:** [ ] Not Started

---

### 9. Unrestricted File Upload in Avatar Upload
**Severity:** HIGH
**File:** `src/routes/userRoutes.js:33-49`

**Description:**
While fileFilter exists for MIME types:
```javascript
const allowedTypes = /jpeg|jpg|png|gif/;
const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
const mimetype = allowedTypes.test(file.mimetype);
```

**Issues:**
- MIME type can be spoofed by client
- File extension check is not secure (e.g., `file.jpg.php`)
- Memory storage means no file size scanning
- No virus scanning

**Impact:**
- Malicious file upload (if served as static)
- Storage exhaustion
- Code execution if files are served

**Recommended Fix:**
- Use server-side file type validation (magic bytes)
- Store uploaded files outside webroot
- Don't serve user uploads directly
- Add virus scanning
- Implement file size quota per user

**Status:** [ ] Not Started

---

### 10. Weak Password Requirements
**Severity:** HIGH
**File:** `src/auth/routes/authRoutes.js:192`

**Description:**
Password validation only checks minimum length:
```javascript
if (newPassword.length < 6) {
  // error: 'New password must be at least 6 characters long'
}
```

**Impact:**
- Weak passwords can be brute-forced
- No complexity requirements (uppercase, numbers, symbols)
- Easy password guessing

**Recommended Fix:**
- Require minimum 12 characters
- Require mixed case, numbers, symbols
- Implement rate limiting on password attempts
- Use libraries like `password-validator`

**Status:** [ ] Not Started

---

### 11. SQL Injection Risk (If Database Added Later)
**Severity:** HIGH
**File:** All routes that construct queries

**Description:**
Current implementation uses JSON files, but if/when database is added:
- No parameterized queries visible
- No query builders like Sequelize

**Impact:**
- Future SQL injection vulnerabilities
- Data breach through SQL queries

**Recommended Fix:**
- Use parameterized queries/prepared statements
- Never concatenate user input into queries
- Use ORM (Sequelize, TypeORM) when adding database

**Status:** [ ] Planned for future

---

### 12. No Rate Limiting on API Endpoints
**Severity:** HIGH
**File:** `app.js`, all routes

**Description:**
No rate limiting middleware on API endpoints.

**Impact:**
- Brute force attacks on login/password endpoints
- DDoS attacks possible
- Resource exhaustion

**Recommended Fix:**
- Install `express-rate-limit`: `npm install express-rate-limit`
- Apply to authentication endpoints especially
- Use sliding window algorithm

**Status:** [ ] Not Started

---

### 13. Insufficient Input Validation on Document Creation
**Severity:** HIGH
**File:** `src/routes/documentRoutes.js`

**Description:**
Document content uploaded with minimal validation.

**Impact:**
- Potential for stored XSS if documents rendered unsafely
- Code injection in document metadata
- Malicious file formats

**Recommended Fix:**
- Validate all document metadata fields
- Sanitize content on both client and server
- Use content-type validation
- Implement file scanning

**Status:** [ ] Not Started

---

### 14. Socket.IO No Authentication
**Severity:** HIGH
**File:** `index.js` (Socket.IO initialization)

**Description:**
Socket.IO connection lacks authentication verification.

**Impact:**
- Unauthenticated users can listen to real-time events
- Websocket security issues
- Potential for data leakage

**Recommended Fix:**
- Add authentication middleware to Socket.IO
- Validate session on connection
- Implement namespace-based access control

**Status:** [ ] Not Started

---

### 15. Sensitive Data Logging
**Severity:** HIGH
**File:** `src/auth/routes/authRoutes.js:60, 120, 131`

**Description:**
Logs contain usernames and email addresses:
```javascript
this.logger.info(`Login attempt for username: ${username}`);
this.logger.info(`Blog login successful: ${username}`);
```

**Impact:**
- Sensitive data in log files
- Log files might be backed up or exposed
- Privacy violation

**Recommended Fix:**
- Use user IDs instead of emails in logs
- Redact sensitive data from logs
- Implement log rotation and secure storage

**Status:** [ ] Not Started

---

## MEDIUM Severity Vulnerabilities (Should Review)

### 16. Missing Environment Variable Validation
**Severity:** MEDIUM
**File:** `app.js:76-80`, `src/auth/passport-config.js:68-72`

**Description:**
Environment variables used without validation or defaults:
```javascript
const aiservice = serviceRegistry.aiservice('ollama', {
  model: 'tinyllama:1.1b',
  tokensStorePath: './.noobly-core/data/ai-tokens.json'
});
```

**Impact:**
- Application may fail silently if config missing
- No clear configuration requirements
- Difficult debugging

**Recommended Fix:**
- Use `.env.example` file documenting all variables
- Validate all required env vars on startup
- Provide clear error messages

**Status:** [ ] Not Started

---

### 17. No Content Security Policy (CSP)
**Severity:** MEDIUM
**File:** `app.js`

**Description:**
No CSP headers to prevent XSS and injection attacks.

**Impact:**
- Stored/Reflected XSS possible
- Inline script execution
- Unsafe eval execution

**Recommended Fix:**
- Add `Content-Security-Policy` header
- Use `script-src 'self'` to restrict script sources
- Disable inline scripts

**Status:** [ ] Not Started

---

### 18. Insufficient Error Handling and Information Disclosure
**Severity:** MEDIUM
**File:** All route files

**Description:**
Error responses may leak stack traces or system information:
```javascript
catch (error) {
  logger.error('Error:', error);
  res.status(500).json({ error: error.message }); // Might leak details
}
```

**Impact:**
- Information disclosure (stack traces)
- Attack surface information revealed
- Debugging information for attackers

**Recommended Fix:**
- Return generic error messages to clients
- Log detailed errors server-side only
- Never return stack traces to users

**Status:** [ ] Not Started

---

### 19. Cross-Origin Resource Sharing (CORS) Configuration Missing
**Severity:** MEDIUM
**File:** `app.js`

**Description:**
No explicit CORS configuration. Socket.IO has CORS enabled in options but main app doesn't.

**Impact:**
- Default CORS might be too permissive
- Could allow unauthorized cross-origin requests

**Recommended Fix:**
- Install `cors`: `npm install cors`
- Configure explicitly: `app.use(cors({ origin: process.env.ALLOWED_ORIGINS }))`
- Restrict to specific origins in production

**Status:** [ ] Not Started

---

### 20. No Data Encryption at Rest
**Severity:** MEDIUM
**File:** All data storage files

**Description:**
JSON data files and user files stored unencrypted on filesystem.

**Impact:**
- Physical/backup access reveals all data
- User documents exposed if disk compromised
- Password hashes visible (bcrypt is good but plaintext other data)

**Recommended Fix:**
- Encrypt sensitive data fields (passwords, tokens)
- Use database encryption features
- Implement filesystem encryption
- Use `crypto` module for sensitive data

**Status:** [ ] Not Started (Low Priority)

---

### 21. No Audit Logging
**Severity:** MEDIUM
**File:** All routes

**Description:**
No audit trail of critical actions (document access, deletion, modifications).

**Impact:**
- Cannot track who did what
- Compliance issues (GDPR, HIPAA if applicable)
- Incident response difficult

**Recommended Fix:**
- Log all critical actions with timestamp, user, action, and results
- Store audit logs separately from application logs
- Implement audit log retention policy

**Status:** [ ] Not Started (Lower Priority)

---

## LOW Severity Vulnerabilities (Nice to Have)

### 22. Missing `.gitignore` for Sensitive Files
**Severity:** LOW
**File:** `.gitignore`

**Description:**
Ensure `.env`, `data/users.json`, and other sensitive files aren't committed.

**Recommended Fix:**
- Add to `.gitignore`: `.env`, `.env.*`, `data/`, `.application/wiki-data/`, etc.

**Status:** [ ] Not Started

---

### 23. No Security Policy / Security.txt
**Severity:** LOW
**File:** `/.well-known/security.txt`

**Description:**
No security reporting policy defined.

**Recommended Fix:**
- Create `/.well-known/security.txt` with security contact info
- Add `SECURITY.md` to repo with responsible disclosure guidelines

**Status:** [ ] Not Started

---

### 24. Missing Dependency Security Checks
**Severity:** LOW
**File:** `package.json`, npm dependencies

**Description:**
No automated security scanning of dependencies.

**Recommended Fix:**
- Run `npm audit` to check for vulnerabilities
- Set up GitHub Dependabot or similar
- Regularly update dependencies

**Status:** [ ] Not Started

---

### 25. No API Documentation with Security Warnings
**Severity:** LOW
**File:** Documentation files

**Description:**
API documentation doesn't include security best practices.

**Recommended Fix:**
- Document all endpoints with auth requirements
- Add security warnings to sensitive operations
- Include rate limiting information

**Status:** [ ] Not Started

---

### 26. Missing HTTPS Certificate Validation (Electron App)
**Severity:** LOW
**File:** `app-electron.js`

**Description:**
Electron app may not properly validate HTTPS certificates.

**Recommended Fix:**
- Validate server certificates in Electron
- Pin certificates if communicating with known server
- Warn on certificate mismatches

**Status:** [ ] Not Started

---

### 27. Weak API Key Management (If Implemented)
**Severity:** LOW
**File:** Potential future extensions

**Description:**
If API keys are added, they need proper management.

**Recommended Fix:**
- Never store API keys in code or version control
- Use environment variables
- Implement key rotation
- Log key usage

**Status:** [ ] Planned for future

---

## Summary Statistics

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 7 | Needs Action |
| HIGH | 8 | Needs Action |
| MEDIUM | 6 | Needs Action |
| LOW | 6 | Nice to Have |
| **TOTAL** | **27** | - |

---

## Remediation Timeline Recommendations

### Immediate (Week 1)
- [ ] Fix hardcoded credentials (Critical #1, #2)
- [ ] Implement session security (Critical #2)
- [ ] Add CSRF protection (Critical #4)
- [ ] Add authentication middleware (Critical #6)
- [ ] Add Helmet security headers (High #8)

### Short-term (Week 2-3)
- [ ] Fix path traversal vulnerabilities (Critical #5)
- [ ] Implement rate limiting (High #12)
- [ ] Fix weak password requirements (High #10)
- [ ] Disable or sandbox wiki-code execution (Critical #3)
- [ ] Add input validation (High #13)

### Medium-term (Month 1)
- [ ] Socket.IO authentication (High #14)
- [ ] Remove sensitive data logging (High #15)
- [ ] Add CSP headers (Medium #17)
- [ ] Improve error handling (Medium #18)
- [ ] Configure CORS (Medium #19)
- [ ] Implement audit logging (Medium #21)

### Long-term (Month 2+)
- [ ] Data encryption at rest (Medium #20)
- [ ] Add security.txt and SECURITY.md (Low #22, #23)
- [ ] Dependency scanning (Low #24)
- [ ] API documentation (Low #25)

---

## Testing Recommendations

### Security Testing Checklist
- [ ] OWASP Top 10 testing
- [ ] Penetration testing
- [ ] XSS testing (DOM-based and stored)
- [ ] CSRF testing
- [ ] SQL injection testing (when database added)
- [ ] Path traversal testing
- [ ] Authentication bypass testing
- [ ] Session hijacking testing
- [ ] Rate limiting testing
- [ ] File upload security testing

---

## References

- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- Express.js Security: https://expressjs.com/en/advanced/best-practice-security.html
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/

---

## Sign-Off

**Generated:** 2025-10-31
**Auditor:** Claude Code Security Module
**Review Status:** Ready for team review

**Next Steps:**
1. Assign team members to remediation tasks
2. Create security sprint
3. Implement fixes in priority order
4. Re-audit after fixes
5. Implement continuous security testing
