#!/usr/bin/env tsx
/**
 * Comprehensive SDK Advanced Features Test
 * Tests Phase 4 (Builder, Cache, Telemetry) and Phase 5 (Batch, Streaming) features
 */

import { ConvexSDK } from './SDK/index.js';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  details?: string;
  error?: string;
}

async function runTest(
  name: string,
  fn: () => Promise<any>
): Promise<TestResult> {
  const start = Date.now();

  try {
    const result = await fn();
    return {
      test: name,
      status: 'PASS',
      duration: Date.now() - start,
      details: typeof result === 'object' ? JSON.stringify(result).slice(0, 100) : String(result)
    };
  } catch (error: any) {
    return {
      test: name,
      status: 'FAIL',
      duration: Date.now() - start,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 Testing SDK Advanced Features (Phase 4 & 5)\n');

  const sdk = new ConvexSDK({
    cache: { enabled: true, ttl: 60, maxSize: 100 },
    telemetry: { enabled: true },
    timeout: 10000
  });

  const results: TestResult[] = [];

  // ===================================================================
  // PHASE 4: Builder Pattern, Caching, Telemetry
  // ===================================================================

  console.log('📦 Phase 4: Builder Pattern, Caching, Telemetry\n');

  // Test 1: Builder Pattern - Basic Query
  results.push(await runTest('Builder: .limit().execute()',
    async () => {
      const result = await sdk.data('users').limit(2).execute();
      return { count: result.data.count };
    }
  ));

  // Test 2: Builder Pattern - First
  results.push(await runTest('Builder: .first()',
    async () => {
      const result = await sdk.data('users').first();
      return { hasData: !!result.data };
    }
  ));

  // Test 3: Builder Pattern - Exists
  results.push(await runTest('Builder: .exists()',
    async () => {
      const result = await sdk.data('users').exists();
      return { exists: result.data.exists };
    }
  ));

  // Test 4: Builder Pattern - Count
  results.push(await runTest('Builder: .count()',
    async () => {
      const result = await sdk.data('users').count();
      return { count: result.data.count };
    }
  ));

  // Test 5: Caching - Hit Test
  results.push(await runTest('Cache: Hit test (repeat status call)',
    async () => {
      await sdk.status(); // First call (miss)
      await sdk.status(); // Second call (should be hit)
      const stats = sdk.getCacheStats();
      return { hitRate: stats.hitRate, hits: stats.hits };
    }
  ));

  // Test 6: Telemetry - Metrics Collection
  results.push(await runTest('Telemetry: Metrics collection',
    async () => {
      const metrics = sdk.getMetrics();
      return {
        operations: metrics.operations.total,
        cacheHits: metrics.cache.hits
      };
    }
  ));

  // ===================================================================
  // PHASE 5: Batch Operations
  // ===================================================================

  console.log('\n📦 Phase 5: Batch Operations & Streaming\n');

  // Test 7: Batch Parallel
  results.push(await runTest('Batch: parallel() execution',
    async () => {
      const summary = await sdk.batch.parallel([
        () => sdk.data('users').limit(1).execute(),
        () => sdk.status(),
        () => sdk.functions()
      ]);
      return {
        total: summary.total,
        succeeded: summary.succeeded,
        successRate: (summary.successRate * 100).toFixed(0) + '%'
      };
    }
  ));

  // Test 8: Batch Sequential
  results.push(await runTest('Batch: sequential() execution',
    async () => {
      const summary = await sdk.batch.sequential([
        () => sdk.data('users').limit(1).execute(),
        () => sdk.status()
      ]);
      return {
        total: summary.total,
        succeeded: summary.succeeded
      };
    }
  ));

  // Test 9: Batch Race
  results.push(await runTest('Batch: race() execution',
    async () => {
      const result = await sdk.batch.race([
        () => sdk.status(),
        () => sdk.functions()
      ]);
      return { hasResult: !!result };
    }
  ));

  // Test 10: Batch Any
  results.push(await runTest('Batch: any() execution',
    async () => {
      const result = await sdk.batch.any([
        () => sdk.status(),
        () => sdk.functions()
      ]);
      return { hasResult: !!result };
    }
  ));

  // ===================================================================
  // PHASE 5: Streaming
  // ===================================================================

  // Test 11: Document Stream
  results.push(await runTest('Stream: Document streaming',
    async () => {
      let count = 0;
      const stream = sdk.stream('users', { chunkSize: 5, maxDocuments: 3 });

      for await (const user of stream) {
        count++;
      }

      return { streamedDocs: count };
    }
  ));

  // Test 12: Chunked Stream
  results.push(await runTest('Stream: Chunked streaming',
    async () => {
      let chunkCount = 0;
      let totalDocs = 0;
      const stream = sdk.streamChunks('users', { chunkSize: 2, maxDocuments: 4 });

      for await (const chunk of stream) {
        chunkCount++;
        totalDocs += chunk.length;
      }

      return { chunks: chunkCount, totalDocs };
    }
  ));

  // Test 13: Pagination
  results.push(await runTest('Stream: Pagination',
    async () => {
      const paginator = sdk.paginate('users', { pageSize: 2, maxPages: 2 });
      let pageCount = 0;
      let totalDocs = 0;

      while (paginator.hasNext()) {
        const page = await paginator.next();
        pageCount++;
        totalDocs += page.count;
      }

      return { pages: pageCount, totalDocs };
    }
  ));

  // ===================================================================
  // RESULTS SUMMARY
  // ===================================================================

  console.log('\n📊 Test Results:\n');
  console.log('─'.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const duration = `${result.duration}ms`;

    console.log(`${icon} ${result.test.padEnd(50)} ${result.status.padEnd(6)} ${duration}`);

    if (result.details && result.status === 'PASS') {
      console.log(`   → ${result.details}`);
    }

    if (result.error && result.status === 'FAIL') {
      console.log(`   ❌ Error: ${result.error}`);
    }

    if (result.status === 'PASS') passed++;
    else failed++;
  }

  console.log('─'.repeat(80));

  // Final metrics
  const metrics = sdk.getMetrics();
  const cacheStats = sdk.getCacheStats();

  console.log('\n📈 Performance Metrics:');
  console.log(`   Operations: ${metrics.operations.total}`);
  console.log(`   Cache Hit Rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`);
  console.log(`   Cache Hits: ${metrics.cache.hits} | Misses: ${metrics.cache.misses}`);
  console.log(`   Avg Latency: ${metrics.latency.avg.toFixed(0)}ms`);
  console.log(`   P95 Latency: ${metrics.latency.p95.toFixed(0)}ms`);

  console.log('\n📊 Final Summary:');
  console.log(`   ✅ Passed: ${passed}/${results.length}`);
  console.log(`   ❌ Failed: ${failed}/${results.length}`);
  console.log(`   📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

  // Cleanup
  sdk.destroy();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
