# Security Guidelines - Preventing SQL Injection and Database Errors

## 🚨 Critical Security Issue Fixed

### Error Analysis: PostgreSQL 22P02

-   **Error Code**: `22P02` - "invalid input syntax for type"
-   **Root Cause**: SQL injection vulnerability in `searchForInvite.ts`
-   **Impact**: Database errors, potential data exposure, application crashes

### Vulnerable Code Patterns (❌ NEVER DO THIS)

```typescript
// ❌ DANGEROUS: Direct string interpolation in SQL
.not("id", "in", `(
  SELECT user_id
  FROM grup_members
  WHERE grup_id = '${groupId}'  // SQL INJECTION RISK
)`)

// ❌ DANGEROUS: Unescaped search terms
.or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
```

### Secure Code Patterns (✅ ALWAYS DO THIS)

```typescript
// ✅ SAFE: Separate queries with proper parameterization
const { data: existingMembers } = await supabase
    .from("grup_members")
    .select("user_id")
    .eq("grup_id", groupId); // Supabase handles parameterization

// ✅ SAFE: Individual .neq() calls instead of raw SQL
for (const memberId of memberIds) {
    query = query.neq("id", memberId);
}

// ✅ SAFE: Input validation and sanitization
if (!groupId || typeof groupId !== "string") {
    throw new Error("Invalid groupId provided");
}
```

## 🛡️ Security Checklist

### 1. Input Validation

```typescript
// Always validate inputs
if (
    !searchQuery ||
    typeof searchQuery !== "string" ||
    searchQuery.trim().length < 2
) {
    return { users: [], hasMore: false };
}

// Sanitize limits and numbers
const safeLimit = Math.min(Math.max(parseInt(String(limit)) || 2, 1), 10);
```

### 2. Parameterized Queries

```typescript
// ✅ Use Supabase's built-in methods
.eq("grup_id", groupId)     // Safe
.neq("id", currentUserId)   // Safe
.ilike("full_name", `%${escapedTerm}%`) // With proper escaping

// ❌ Never use raw SQL with string interpolation
.not("id", "in", `(SELECT ... WHERE id = '${unsafeId}')`) // NEVER
```

### 3. Error Handling

```typescript
// Handle specific PostgreSQL error codes
if (error.code === "PGRST116") {
    // No data found - not an error
    return null;
}

// Always log errors for debugging
console.error("Database error:", error);
```

### 4. Type Safety

```typescript
// Use TypeScript interfaces
interface InviteUser {
    id: string;
    name: string;
    username: string | null;
    // ... other fields
}

// Validate types at runtime
if (typeof groupId !== "string") {
    throw new Error("Invalid groupId type");
}
```

## 🔍 Code Review Guidelines

### Before Merging ANY Database Code:

1. **Check for String Interpolation in SQL**

    - Search for: `${variable}` in database queries
    - Replace with parameterized queries

2. **Validate All Inputs**

    - Check type, length, format
    - Sanitize special characters
    - Set reasonable limits

3. **Test with Malicious Inputs**

    - SQL injection attempts: `'; DROP TABLE users; --`
    - Special characters: `%`, `_`, `\`, `'`, `"`
    - Invalid UUIDs, null values, empty strings

4. **Error Handling**
    - Catch specific error codes
    - Don't expose internal errors to users
    - Log errors for debugging

## 📋 Testing Checklist

### Unit Tests Required:

-   [ ] Valid inputs work correctly
-   [ ] Invalid inputs are rejected safely
-   [ ] SQL injection attempts are blocked
-   [ ] Database errors are handled gracefully
-   [ ] Edge cases (empty results, null values)

### Integration Tests Required:

-   [ ] End-to-end user search flow
-   [ ] Error scenarios don't crash the app
-   [ ] Performance with large datasets
-   [ ] Cache behavior is correct

## 🚀 Performance Best Practices

1. **Separate Queries**: Split complex JOINs into multiple simple queries
2. **Limit Results**: Always set reasonable limits (max 10 for search)
3. **Use Indexes**: Ensure proper database indexes exist
4. **Cache Results**: Implement caching for frequently accessed data
5. **Validate Early**: Check inputs before database calls

## 📚 References

-   [OWASP SQL Injection Prevention](https://owasp.org/www-community/attacks/SQL_Injection)
-   [Supabase Security Guidelines](https://supabase.com/docs/guides/database/postgres/row-level-security)
-   [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)

---

**Remember**: Security is not optional. Every database interaction must be secure by design.
