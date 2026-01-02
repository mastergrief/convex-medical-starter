/**
 * Test Suite for Convex SDK Phase 5 Features
 *
 * Tests:
 * - Batch operations (parallel, sequential, race, any)
 * - Streaming (pagination, document streams, chunked streams)
 * - Advanced caching (dependency tracking, invalidation)
 * - Monitoring export (Prometheus, JSON formats)
 */

import { ConvexSDK } from './client.js';
import { BatchExecutor, parallel, sequential } from './batch.js';
import { AdvancedCache, CommonPatterns, createAdvancedCache, CacheInvalidator } from './cache-advanced.js';
import { MonitoringExporter, ExampleCollectors } from './monitoring.js';

async function testPhase5() {
  console.log('\n🧪 Testing Convex SDK Phase 5 Features\n');

  // Initialize SDK with all Phase 5 features
  const sdk = new ConvexSDK({
    cache: { enabled: true, ttl: 30, maxSize: 50 },
    telemetry: { enabled: true },
    batch: { concurrency: 3, stopOnError: true },
    monitoring: { enabled: true, format: 'json', prefix: 'convex_sdk_test' }
  });

  // ========================================================================
  // 1. Batch Operations Tests
  // ========================================================================
  console.log('1️⃣  Batch Operations\n');

  try {
    // Test parallel execution
    console.log('   Testing parallel execution...');
    const parallelResults = await sdk.batch.parallel([
      () => sdk.status(),
      () => sdk.tables(),
      () => sdk.functions()
    ]);

    console.log(`   ✅ Parallel execution: ${parallelResults.succeeded}/${parallelResults.total} succeeded`);
    console.log(`   ⏱️  Total time: ${parallelResults.totalTime}ms`);
    console.log(`   📊 Success rate: ${(parallelResults.successRate * 100).toFixed(1)}%`);

    // Test sequential execution
    console.log('\n   Testing sequential execution...');
    const sequentialResults = await sdk.batch.sequential([
      () => sdk.functions(),
      () => sdk.status()
    ]);

    console.log(`   ✅ Sequential execution: ${sequentialResults.succeeded}/${sequentialResults.total} succeeded`);
    console.log(`   ⏱️  Total time: ${sequentialResults.totalTime}ms`);

  } catch (error) {
    console.error('   ❌ Batch operations failed:', error);
  }

  // ========================================================================
  // 2. Streaming Tests
  // ========================================================================
  console.log('\n2️⃣  Streaming Operations\n');

  try {
    // Test pagination
    console.log('   Testing pagination...');
    const paginator = sdk.paginate('users', { pageSize: 2, maxPages: 2 });

    let pageCount = 0;
    let totalDocs = 0;

    while (paginator.hasNext() && pageCount < 2) {
      const page = await paginator.next();
      pageCount++;
      totalDocs += page.count;
      console.log(`   📄 Page ${page.pageNumber}: ${page.count} documents`);
    }

    console.log(`   ✅ Pagination: ${pageCount} pages, ${totalDocs} total docs`);

    // Test document stream
    console.log('\n   Testing document stream...');
    const stream = sdk.stream('users', { chunkSize: 2, maxDocuments: 4 });

    let streamCount = 0;
    for await (const doc of stream) {
      streamCount++;
      if (streamCount <= 2) { // Only log first 2
        console.log(`   📄 Document ${streamCount}: ${doc._id}`);
      }
    }

    console.log(`   ✅ Document stream: ${streamCount} documents`);

    // Test chunked stream
    console.log('\n   Testing chunked stream...');
    const chunkedStream = sdk.streamChunks('users', { chunkSize: 2, maxDocuments: 4 });

    let chunkCount = 0;
    let chunkTotalDocs = 0;

    for await (const chunk of chunkedStream) {
      chunkCount++;
      chunkTotalDocs += chunk.length;
      console.log(`   📦 Chunk ${chunkCount}: ${chunk.length} documents`);
    }

    console.log(`   ✅ Chunked stream: ${chunkCount} chunks, ${chunkTotalDocs} total docs`);

  } catch (error) {
    console.error('   ❌ Streaming failed:', error);
  }

  // ========================================================================
  // 3. Advanced Caching Tests
  // ========================================================================
  console.log('\n3️⃣  Advanced Caching\n');

  try {
    // Create advanced cache with dependency tracking
    console.log('   Testing advanced cache with dependencies...');
    const advCache = createAdvancedCache({
      ttl: 60,
      maxSize: 100,
      dependencies: {
        enabled: true,
        patterns: [CommonPatterns.environment]
      }
    });

    // Test setting values with dependencies
    advCache.set('users:list', [{ id: 1 }, { id: 2 }], {
      ttl: 30,
      dependsOn: ['users:count']
    });

    advCache.set('users:count', 2);

    console.log(`   ✅ Cache entries created with dependencies`);

    // Test dependency info
    const depInfo = advCache.getDependencyInfo('users:list');
    console.log(`   📊 Dependencies: ${depInfo?.dependsOn.length || 0}`);

    // Test invalidation by pattern
    const invalidated = advCache.invalidatePattern('users:*');
    console.log(`   ✅ Pattern invalidation: ${invalidated} keys invalidated`);

    // Test cache invalidator
    const invalidator = new CacheInvalidator(advCache);
    advCache.set('data:workouts:query1', []);
    advCache.set('data:workouts:query2', []);

    invalidator.invalidateTable('workouts');
    console.log(`   ✅ Table invalidation: workouts cache cleared`);

    advCache.destroy();

  } catch (error) {
    console.error('   ❌ Advanced caching failed:', error);
  }

  // ========================================================================
  // 4. Monitoring Export Tests
  // ========================================================================
  console.log('\n4️⃣  Monitoring Export\n');

  try {
    // Test monitoring export (JSON format)
    console.log('   Testing monitoring export (JSON)...');
    const monitoringJson = await sdk.exportMonitoring();
    const parsed = JSON.parse(monitoringJson);

    console.log(`   ✅ JSON export successful`);
    console.log(`   📊 Metrics count: ${parsed.metrics.length}`);
    console.log(`   🏷️  Prefix: ${parsed.prefix}`);

    // Test Prometheus format
    console.log('\n   Testing Prometheus format...');
    const prometheusExporter = new MonitoringExporter({
      enabled: true,
      format: 'prometheus',
      prefix: 'test_metrics',
      labels: { environment: 'test', version: '1.0' }
    });

    // Add custom collector
    prometheusExporter.addCollector(ExampleCollectors.system());
    prometheusExporter.addCollector(ExampleCollectors.uptime());

    const prometheusMetrics = await prometheusExporter.export(sdk['telemetry'], sdk['cache']);
    const lines = prometheusMetrics.split('\n').filter(l => l.trim());

    console.log(`   ✅ Prometheus export successful`);
    console.log(`   📊 Metric lines: ${lines.length}`);

    // Show sample metrics
    const typeLines = lines.filter(l => l.startsWith('# TYPE')).slice(0, 3);
    console.log(`   📈 Sample metrics:\n${typeLines.map(l => `      ${l}`).join('\n')}`);

  } catch (error) {
    console.error('   ❌ Monitoring export failed:', error);
  }

  // ========================================================================
  // 5. Integration Tests
  // ========================================================================
  console.log('\n5️⃣  Integration Tests\n');

  try {
    // Test batch + streaming combination
    console.log('   Testing batch operations with streaming...');

    const batchWithStream = await sdk.batch.parallel([
      async () => {
        const stream = sdk.stream('users', { maxDocuments: 2 });
        const docs = [];
        for await (const doc of stream) {
          docs.push(doc);
        }
        return docs;
      },
      () => sdk.tables(),
      () => sdk.status()
    ]);

    console.log(`   ✅ Batch + stream: ${batchWithStream.succeeded}/${batchWithStream.total} succeeded`);

    // Test monitoring with actual SDK operations
    console.log('\n   Testing monitoring with live operations...');

    // Run some operations to generate metrics
    await sdk.status();
    await sdk.data('users').limit(2).execute();

    const finalMetrics = sdk.getMetrics();
    console.log(`   ✅ Operations tracked: ${finalMetrics.operations.total}`);
    console.log(`   📊 Cache hit rate: ${(finalMetrics.cache.hitRate * 100).toFixed(1)}%`);

    if (finalMetrics.latency) {
      console.log(`   ⏱️  Avg latency: ${finalMetrics.latency.avg.toFixed(0)}ms`);
      console.log(`   ⏱️  P95 latency: ${finalMetrics.latency.p95.toFixed(0)}ms`);
    }

  } catch (error) {
    console.error('   ❌ Integration tests failed:', error);
  }

  // ========================================================================
  // 6. Utility Function Tests
  // ========================================================================
  console.log('\n6️⃣  Utility Functions\n');

  try {
    // Test standalone batch functions
    console.log('   Testing standalone batch functions...');

    const standaloneParallel = await parallel([
      async () => 'result1',
      async () => 'result2',
      async () => 'result3'
    ]);

    console.log(`   ✅ Standalone parallel: ${standaloneParallel.succeeded}/${standaloneParallel.total} succeeded`);

    const standaloneSequential = await sequential([
      async () => 'step1',
      async () => 'step2'
    ], { stopOnError: true });

    console.log(`   ✅ Standalone sequential: ${standaloneSequential.succeeded}/${standaloneSequential.total} succeeded`);

  } catch (error) {
    console.error('   ❌ Utility functions failed:', error);
  }

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 Phase 5 Test Summary\n');

  const finalMetrics = sdk.getMetrics();
  const cacheStats = sdk.getCacheStats();

  console.log('Metrics:');
  console.log(`  - Total operations: ${finalMetrics.operations.total}`);
  console.log(`  - Cache hits: ${finalMetrics.cache.hits}`);
  console.log(`  - Cache misses: ${finalMetrics.cache.misses}`);
  console.log(`  - Hit rate: ${(finalMetrics.cache.hitRate * 100).toFixed(1)}%`);

  if (finalMetrics.latency) {
    console.log(`  - Avg latency: ${finalMetrics.latency.avg.toFixed(0)}ms`);
    console.log(`  - P95 latency: ${finalMetrics.latency.p95.toFixed(0)}ms`);
  }

  if (cacheStats.enabled) {
    console.log(`\nCache:` );
    console.log(`  - Size: ${cacheStats.size}/${cacheStats.maxSize}`);
    console.log(`  - Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
  }

  console.log('\n✅ All Phase 5 tests completed!\n');

  // Cleanup
  sdk.destroy();
}

// Run tests
testPhase5().catch(console.error);
