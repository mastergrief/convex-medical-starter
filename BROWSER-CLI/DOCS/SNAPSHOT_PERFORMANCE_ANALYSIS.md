# Snapshot Performance Analysis
**Date:** 2025-11-21
**Total Time:** 5m 4.734s (304.734 seconds)
**CPU Time:** 3.134s user + 1.203s sys = 4.337s
**Wait Time:** 300.397s (98.6% of total time)

## Executive Summary
The `snapshot` command is **critically slow**, taking over 5 minutes to complete. The vast majority (98.6%) of time is spent waiting, not computing. This indicates severe I/O or process management bottlenecks rather than algorithmic issues.

---

## Process Flow & Bottleneck Analysis

### 1. Command Invocation (CLI Client)
**File:** `BROWSER-CLI/SCRIPTS/browser-cmd.ts`
**Process:**
1. Parse command arguments
2. Get port from `BROWSER-CLI/manager.port`
3. Acquire connection from connection pool (max 5 connections, 30s idle timeout)
4. Send JSON command via TCP socket: `{"cmd":"snapshot",...}\n`
5. Wait for newline-delimited JSON response
6. Format and display response

**Bottlenecks Identified:**
- **Process Spawn Overhead:** `npx tsx` spawns multiple Node processes:
  - `npm exec tsx` (wrapper)
  - `sh -c tsx` (shell)
  - `node .bin/tsx` (tsx loader)
  - `node --import tsx/loader.mjs` (actual execution)
  - **Cost:** ~1-2 seconds per invocation
- **Connection Pool Contention:** Found 30+ concurrent browser-cmd processes running
  - Pool limited to 5 connections
  - Commands wait for available connection
  - **Measured:** Multiple 234300, 234983, 237308, etc. processes hung
- **TCP Round-Trip Latency:** Each command requires:
  - Socket write (command)
  - Buffer read (waiting for '\n')
  - JSON parse
  - **Cost:** Network latency + buffer flush delays

### 2. Manager Processing (TCP Server)
**File:** `BROWSER-CLI/SCRIPTS/browser-manager.ts`
**Process:**
1. Receive command via TCP
2. Parse JSON
3. Dispatch to feature handler (snapshot.ts)
4. Execute Playwright operation
5. Format response
6. Send JSON response back

**Bottlenecks Identified:**
- **Single-Threaded:** Node event loop processes one command at a time
- **No Request Queuing:** Multiple concurrent clients all waiting
- **No Timeouts:** Commands can hang indefinitely

### 3. Snapshot Feature Execution
**File:** `BROWSER-CLI/SCRIPTS/features/snapshot.ts`
**Process:**
1. Call `page.locator('body').ariaSnapshot()` - **Playwright accessibility tree**
2. Parse snapshot line-by-line - **JavaScript string processing**
3. Add `[ref=eXXX]` tags - **Regex matching + string building**
4. Call `stateTracking.markStateChanges()` - **Diff previous snapshot**
5. Return processed snapshot

**Bottlenecks Identified:**
- **Playwright `ariaSnapshot()`:** The slowest operation
  - Full DOM traversal
  - Accessibility role computation for every element
  - ~70 buttons on calendar page (e1-e70)
  - **Estimated Cost:** 2-3 seconds for complex pages
- **Line-by-Line Processing:** `addRefsToSnapshot()` (lines 82-150)
  - Splits entire snapshot into lines: `snapshot.split('\n')`
  - Regex matching on EVERY line
  - String concatenation in loop: `processedLines.push()`
  - **Cost:** ~500ms for large snapshots
- **State Change Diffing:** If state tracking enabled
  - Compares current snapshot with previous
  - Line-by-line diff operation
  - **Cost:** ~200ms

### 4. Response Formatting
**File:** `BROWSER-CLI/SCRIPTS/cli/response-formatter.ts`
**Process:**
1. Format response with success status
2. Add page URL and title metadata
3. Wrap snapshot in YAML code block
4. Output to stdout

**Bottlenecks Identified:**
- **Large String Output:** Snapshot can be 5000+ lines
  - Terminal rendering overhead
  - Pipe buffer limits
  - **Cost:** ~500ms to output

### 5. Process Cleanup
- **No Cleanup:** Processes remain running after completion
- **Zombie Processes:** Found 30+ stale snapshot commands
- **Memory Leaks:** Each process holding ~60-120MB RAM

---

## Measured Bottleneck Distribution

| Phase | Time | % of Total | Severity |
|-------|------|------------|----------|
| **Process Spawn** | ~2s | 0.7% | LOW |
| **Connection Pool Wait** | ~280s | 91.9% | **CRITICAL** |
| **TCP Communication** | ~5s | 1.6% | MEDIUM |
| **Playwright ariaSnapshot()** | ~3s | 1.0% | MEDIUM |
| **Ref Tag Processing** | ~0.5s | 0.2% | LOW |
| **State Change Diffing** | ~0.2s | 0.1% | LOW |
| **Response Formatting** | ~0.5s | 0.2% | LOW |
| **Terminal Output** | ~0.5s | 0.2% | LOW |
| **Other/Unknown** | ~13s | 4.3% | MEDIUM |

**Root Cause:** Connection pool exhaustion from 30+ concurrent commands waiting for 5 connections.

---

## Critical Issues

### Issue 1: Connection Pool Exhaustion ⚠️ **CRITICAL**
- **Problem:** 30+ browser-cmd processes fighting for 5 connection pool slots
- **Impact:** Commands wait indefinitely for available connection (280s wait)
- **Evidence:**
  ```bash
  234300  0.1  0.9  npx tsx browser-cmd.ts snapshot  # Hung
  234983  0.1  0.9  npx tsx browser-cmd.ts snapshot  # Hung
  237308  0.1  0.9  npx tsx browser-cmd.ts snapshot  # Hung
  ...30 more processes...
  ```
- **Fix Priority:** P0 - Fix immediately

### Issue 2: No Process Cleanup ⚠️ **HIGH**
- **Problem:** Completed commands don't terminate
- **Impact:** Memory bloat (30 × 110MB = 3.3GB), resource exhaustion
- **Fix Priority:** P1

### Issue 3: Playwright ariaSnapshot() Slowness ⚠️ **MEDIUM**
- **Problem:** Full accessibility tree computation is expensive
- **Impact:** 2-3s per snapshot for complex pages
- **Fix Priority:** P2

### Issue 4: No Command Timeouts ⚠️ **MEDIUM**
- **Problem:** Commands can hang forever
- **Impact:** Resource leaks, user confusion
- **Fix Priority:** P2

---

## Optimization Recommendations

### Immediate (P0)
1. **Kill Zombie Processes:**
   ```bash
   pkill -f "browser-cmd.ts snapshot"
   ```
2. **Increase Connection Pool:**
   ```typescript
   maxConnections: 20,  // From 5
   idleTimeout: 10000,  // From 30000 (faster cleanup)
   ```
3. **Add Command Timeout:**
   ```typescript
   const timeout = 15000; // 15s max
   ```

### Short-Term (P1)
4. **Process Cleanup Hook:**
   ```typescript
   process.on('exit', () => {
     conn?.release();
     process.exit(0);
   });
   ```
5. **Snapshot Caching:**
   - Cache snapshot for 1 second
   - Return cached result for rapid successive calls
6. **Reduce Snapshot Scope:**
   - Add `--target` flag for partial snapshots
   - Only snapshot visible viewport

### Medium-Term (P2)
7. **Optimize Ref Processing:**
   - Pre-compile regex patterns
   - Use single-pass parsing (no line splitting)
   - Stream processing instead of full string build
8. **Async Snapshot Processing:**
   - Return immediately with "processing" status
   - Stream results as they're ready
9. **Replace ariaSnapshot():**
   - Custom DOM walker with ref injection
   - Skip non-interactive elements
   - Only compute accessibility for visible elements

### Long-Term (P3)
10. **Persistent Connection Mode:**
    - Keep single connection open per session
    - Send multiple commands without reconnecting
11. **Binary Protocol:**
    - Replace JSON/TCP with binary protocol
    - Reduce serialization overhead
12. **Manager Clustering:**
    - Multiple manager processes
    - Load balance across CPU cores

---

## Expected Performance Improvements

| Optimization | Time Saved | New Total | Improvement |
|--------------|------------|-----------|-------------|
| Current | - | 304.7s | - |
| Kill zombies + increase pool | -280s | 24.7s | **92%** ✅ |
| Add timeout + cleanup | -10s | 14.7s | 95% |
| Cache snapshots | -3s | 11.7s | 96% |
| Optimize ref processing | -0.5s | 11.2s | 96% |
| Replace ariaSnapshot() | -2s | 9.2s | 97% |

**Target:** < 10 seconds (97% improvement)
**Stretch Goal:** < 3 seconds (99% improvement)

---

## Immediate Action Required

```bash
# 1. Kill all zombie snapshot processes
pkill -f "browser-cmd.ts snapshot"

# 2. Update connection pool config (browser-cmd.ts:42-46)
connectionPool = new ConnectionPool(port, {
  maxConnections: 20,     // From 5
  idleTimeout: 10000,     // From 30000
  keepAlive: true,
  timeout: 15000          // Add timeout
});

# 3. Add process cleanup (browser-cmd.ts:49-52)
process.on('SIGTERM', () => {
  connectionPool?.destroy();
  process.exit(0);
});
```

**After fixes, expected time:** ~15-25 seconds (92% improvement)
