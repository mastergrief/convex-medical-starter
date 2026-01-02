# CONVEX-CLI Troubleshooting Guide

## Command Hangs or Times Out

### Symptoms
- Command doesn't return after 1-2 minutes
- No output or progress indication
- Terminal appears frozen

### Common Causes & Solutions

#### 1. Logs Command Timeout
**Cause:** Convex logs API slow or --follow mode active
**Solution:**
```bash
# Add timeout parameter (in milliseconds)
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --timeout=10000

# Use smaller history
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=5

# Increase timeout for large history
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=100 --timeout=60000
```

#### 2. Cold Start Delays
**Cause:** First Convex CLI invocation initializes connection
**Solution:** Wait 5-10 seconds for first command, subsequent calls are faster

#### 3. Network Issues
**Cause:** Slow/unstable connection to Convex backend
**Solution:** Check internet connection, retry command

### Performance Expectations

| Command | Expected Time | Max Acceptable |
|---------|---------------|----------------|
| status | < 100ms | 5s |
| tables | 2-4s (cold start) | 10s |
| data | 2-3s | 15s |
| functions | < 100ms | 5s |
| run | 2-3s | 30s |
| env | 2-3s | 15s |
| logs | 5-10s | 30s (with timeout) |

## TypeScript API Test Suite Issues

### Test Suite Hangs

**Problem:** `test-api.ts` hangs during execution
**Cause:** Individual test timeout not set
**Solution:** Test suite now includes per-test timeouts (30s default, 10s for logs)

```bash
# Run test suite with timeouts
npx tsx CONVEX-CLI/LIB/test-api.ts
```

### Individual Test Failures

**Logs Test Timeout:**
- **Expected behavior:** Logs test may timeout (10s limit)
- **Not a blocker:** Known issue, use CLI with `--timeout` parameter for actual usage
- **Workaround:** Test suite will report FAIL but continue with other tests

## JSON Output Issues

### Invalid JSON

**Cause:** Script outputs additional console messages mixed with JSON
**Solution:** Use `--json` flag only, avoid other output flags

```bash
# Correct
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=5 --json

# Incorrect (mixing output modes)
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --json --verbose
```

## Environment Variable Issues

### Cannot Read Environment Variables

**Cause:** Convex deployment not configured or .env.local missing
**Solution:**

```bash
# Verify deployment configured
npx convex dev

# Check .env.local exists
ls -la .env.local

# List available env vars
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list
```

## Function Execution Issues

### Function Not Found

**Cause:** Incorrect function path format
**Solution:** Use `module:functionName` format

```bash
# Correct
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:list '{}'

# Incorrect
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users.list '{}'
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts list '{}'
```

### Invalid Arguments JSON

**Cause:** Malformed JSON arguments
**Solution:** Use proper JSON syntax with escaped quotes

```bash
# Correct
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:create '{"email":"test@example.com"}'

# Incorrect (missing quotes around values)
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:create '{email:test@example.com}'
```

## Data Query Issues

### Empty Results

**Cause:** Table empty or limit too small
**Solution:**

```bash
# Verify table has data
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users

# Check table exists
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts

# Increase limit
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=100
```

## General Debugging Tips

### Enable Verbose Output

Most scripts support verbose mode for debugging:

```bash
# Add DEBUG environment variable
DEBUG=* npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts
```

### Check Convex CLI Version

```bash
npx convex --version
```

### Verify Deployment Connection

```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts
```

Should output:
- Deployment kind (ownDev, prod)
- Deployment URL
- Team and project names

### Clear Node Modules Cache

```bash
rm -rf node_modules/.cache
npm install
```

## Common Error Messages

### "Convex CLI failed: ..."

**Cause:** Underlying convex CLI error
**Solution:** Check error message for specific issue, verify:
1. Convex is installed (`npm list convex`)
2. Project is configured (`convex dev`)
3. Deployment is active

### "Command timed out after Xms"

**Cause:** Operation exceeded timeout
**Solution:**
1. Increase timeout: `--timeout=60000`
2. Reduce operation scope: `--history=5`, `--limit=10`
3. Check network connectivity

### "Cannot find module..."

**Cause:** TypeScript/ESM import issue
**Solution:** Run with tsx:

```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users
```

## Performance Troubleshooting

### Command Slower Than Expected

**Symptoms:** Commands taking longer than performance expectations
**Solutions:**

1. **Check cold start penalty**
   ```bash
   # First command (slow)
   time npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users

   # Second command (faster)
   time npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users
   ```

2. **Use TypeScript API for repeated operations**
   ```typescript
   import { ConvexCLI } from './CONVEX-CLI/LIB/index.js';

   const cli = new ConvexCLI();

   // Reuse instance for multiple operations
   await cli.tables();
   await cli.data('users', { limit: 10 });
   await cli.data('workouts', { limit: 10 });
   ```

3. **Check backend status**
   - Visit Convex dashboard
   - Check for backend alerts
   - Verify deployment health

## Getting Help

If issues persist:

1. Check this troubleshooting guide
2. Review [README.md](./README.md) for usage examples
3. Check [TEST-RESULTS.md](./TEST-RESULTS.md) for known test results
4. Review Convex CLI documentation: https://docs.convex.dev/cli

## Recent Fixes

### ✅ Logs Timeout (Fixed: 2025-11-20)
- **Issue:** Logs command hangs indefinitely
- **Fix:** Added `--timeout` parameter with 30s default
- **Status:** RESOLVED

### ✅ API Test Suite Timeout (Fixed: 2025-11-20)
- **Issue:** Test suite hangs for 5+ minutes
- **Fix:** Added per-test timeouts (30s default, 10s for logs)
- **Status:** RESOLVED
