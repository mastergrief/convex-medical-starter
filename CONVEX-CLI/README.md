# Convex CLI Wrapper

Simple CLI wrapper for Convex operations providing easy access to deployment management, database operations, and function execution.

## Installation

No installation needed - uses existing `convex` package via `npx`.

## Usage

Two ways to use the CLI:

### 1. Unified Command Interface
```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts <command> [args...]
```

### 2. Individual Scripts (Recommended)
```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-<command>.ts [args...]
```

## Individual Scripts

### convex-status.ts

Get deployment configuration and URLs:

```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts
```

**Output:**
- Deployment kind (ownDev, prod)
- Team and project names
- Deployment URL
- Dashboard URL
- Deployment selector

### convex-tables.ts

List all database tables:

```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts
```

### convex-data.ts

Query table data:

```bash
# Basic query
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users

# With limit
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=10

# JSON output
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts workouts --json
```

### convex-functions.ts

List function files:

```bash
# Simple list
npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts

# Detailed with file info
npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts --detailed
```

### convex-run.ts

Execute a function:

```bash
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:list '{}'
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:create '{"email":"test@example.com"}'
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts analytics:getMetrics '{"userId":"123"}'
```

### convex-env.ts

Manage environment variables:

```bash
# List all
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list

# Get specific variable
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts get OPENAI_API_KEY

# Set variable
npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts set MY_VAR "my value"
```

### convex-logs.ts

View execution logs:

```bash
# Default (last 30 entries)
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts

# Last 50 entries
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=50

# Follow logs in real-time
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --follow

# Only errors
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --error --history=100
```

## Quick Reference

| Task | Script | Command |
|------|--------|---------|
| Check deployment | `convex-status.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts` |
| List tables | `convex-tables.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts` |
| Query data | `convex-data.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=10` |
| List functions | `convex-functions.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts` |
| Run function | `convex-run.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:list '{}'` |
| List env vars | `convex-env.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list` |
| View logs | `convex-logs.ts` | `npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=50` |

## Comparison with MCP Tools

This CLI wraps the same functionality as the Convex MCP tools:

| CLI Command | MCP Tool | Description |
|-------------|----------|-------------|
| `status` | `mcp__convex__status` | Get deployment info |
| `tables` | `mcp__convex__tables` | List tables with schema |
| `data <table>` | `mcp__convex__data` | Query table data |
| `functions` | `mcp__convex__functionSpec` | List functions |
| `run <fn> <args>` | `mcp__convex__run` | Execute function |
| `env-list` | `mcp__convex__envList` | List env vars |
| `env-get <name>` | `mcp__convex__envGet` | Get env var |
| `env-set <name> <val>` | `mcp__convex__envSet` | Set env var |
| `logs` | `mcp__convex__logs` | View execution logs |

## Known Issues

### Logs Command Timeout

The `convex-logs.ts` script may experience timeouts when:
- Using `--follow` mode (watches logs continuously)
- Requesting large history values (>100 entries)
- Convex backend is under load

**Workarounds:**
```bash
# Use explicit timeout parameter (in milliseconds)
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=10 --timeout=15000

# Use small history values
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=5

# Increase timeout for large history
npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=100 --timeout=60000
```

**Default timeout:** 30 seconds (30000ms)

**Status:** Fixed in current version (timeout parameter added)

## Architecture

The script is a thin wrapper around the official `convex` CLI:

```
convex-cmd.ts → npx convex [command] → Convex Backend
```

This provides:
- Simple command-line interface
- Pretty-printed output
- Error handling
- Consistent with browser-cli pattern

## Performance Characteristics

### Cold Start Penalty

The first Convex CLI operation incurs a **2-3 second** initialization penalty as the Convex CLI connects to the backend:

```bash
# First command (cold start)
time npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts
# real: ~3.5s

# Subsequent commands (warm, but still slow)
time npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts
# real: ~2.5s (still requires backend round-trip)
```

**Why?** Each CLI invocation spawns a new process that initializes the Convex CLI connection.

### SDK Performance Optimization

Use the **Advanced SDK** with caching for dramatically improved performance:

```typescript
import { ConvexSDK } from './CONVEX-CLI/SDK';

const sdk = new ConvexSDK({ cache: { enabled: true } });

await sdk.tables();  // 2.5s (cold start)
await sdk.tables();  // <1ms (cached) - 99.9% faster!
```

### Expected Performance

| Operation | CLI Script | SDK (Cached) | Improvement |
|-----------|------------|--------------|-------------|
| `status()` | 2.3s | <1ms | 99.9% |
| `tables()` | 5.3s | <1ms | 99.9% |
| `functions()` | 2.5s | <1ms | 99.9% |
| `env.list()` | 2.5s | <1ms | 99.9% |
| `data()` | 2.6s | N/A* | - |
| `run()` | 2.5s | N/A* | - |

*Data queries and function execution are never cached (always fresh).

### Cache Behavior

**Default TTLs:**
- Status: 60s
- Tables: 300s (5 minutes)
- Functions: 300s (5 minutes)
- Env vars: 60s
- Data queries: Not cached

**Cache invalidation:**
```typescript
sdk.clearCache();  // Clears all cached data + resets stats to 0
```

**Note:** After clearing the cache, stats counters (hits/misses) reset to 0. This is intentional - it provides a clean baseline for measuring subsequent cache performance.

### Performance Tips

1. **Reuse SDK instances** - Avoid creating new instances per operation
   ```typescript
   // ❌ Bad: Creates new instance each time
   async function getStatus() {
     const sdk = new ConvexSDK();
     return await sdk.status();
   }

   // ✅ Good: Reuse instance
   const sdk = new ConvexSDK({ cache: { enabled: true } });

   async function getStatus() {
     return await sdk.status();
   }
   ```

2. **Enable caching** - 99%+ improvement for repeated operations
   ```typescript
   const sdk = new ConvexSDK({
     cache: {
       enabled: true,
       ttl: 60,        // Default TTL in seconds
       maxSize: 1000   // Max cache entries
     }
   });
   ```

3. **Use batch operations** - 30-50% faster for parallel work
   ```typescript
   // Execute multiple operations concurrently
   const [users, posts, stats] = await sdk.batch.parallel([
     () => sdk.data('users').limit(10).execute(),
     () => sdk.data('posts').limit(20).execute(),
     () => sdk.runFunction('stats:summary', {})
   ]);
   ```

4. **Stream large datasets** - 99% memory reduction
   ```typescript
   // Instead of loading all at once
   for await (const user of sdk.stream('users', { chunkSize: 100 })) {
     processUser(user);  // Process one at a time
   }
   ```

5. **Expect cold start** - First command is slower (one-time penalty per script execution)

### Performance Benchmarks

From `CONVEX-CLI/test-performance.ts`:

**Cache Performance:**
- Hit rate: 77.8% (typical usage)
- Cache hits: <1ms average
- Cache misses: 2000-5000ms (full CLI execution)
- Operations: ~9 per test run

**Batch Performance:**
- Sequential 3 ops: ~6000ms
- Parallel 3 ops: ~4000ms
- Improvement: 33% faster

**Memory Usage:**
- Full load (10K docs): ~50MB
- Streaming (10K docs): ~500KB
- Reduction: 99%
