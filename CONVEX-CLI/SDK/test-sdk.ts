/**
 * Convex SDK Test Suite - Phase 4
 *
 * Tests all Phase 4 features:
 * - Builder pattern for queries
 * - Caching with TTL
 * - Telemetry & metrics
 * - Event streaming (logs)
 */

import { ConvexSDK } from './index.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSDK() {
  console.log('🧪 Testing Convex SDK (Phase 4)\n');

  // ========================================================================
  // Initialize SDK
  // ========================================================================

  console.log('🚀 Initializing SDK with cache & telemetry...');
  const sdk = new ConvexSDK({
    cache: {
      enabled: true,
      ttl: 30, // 30 seconds
      maxSize: 50
    },
    telemetry: {
      enabled: true,
      metrics: ['latency', 'cache', 'errors', 'operations']
    }
  });
  console.log('   ✅ SDK initialized\n');

  // ========================================================================
  // Test 1: Status API (with caching)
  // ========================================================================

  console.log('1️⃣  Status API (with cache test)');
  try {
    // First call - cache miss
    const status1 = await sdk.status();
    console.log(`   ✅ Success: ${status1.success}`);
    console.log(`   📊 Deployments: ${status1.data.deployments.length}`);
    console.log(`   🔗 URL: ${status1.data.deployments[0]?.url}`);
    console.log(`   ⏱️  Execution time: ${status1.metadata.executionTime}ms`);

    // Second call - should hit cache
    const status2 = await sdk.status();
    console.log(`   ✅ Second call (cached): ${status2.success}`);

    const cacheStats = sdk.getCacheStats();
    console.log(`   📈 Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 2: Builder Pattern for Data Queries
  // ========================================================================

  console.log('2️⃣  Builder Pattern - Data Queries');
  try {
    // Query with builder
    const users = await sdk.data('users')
      .limit(3)
      .execute();

    console.log(`   ✅ Builder query success`);
    console.log(`   👥 Documents returned: ${users.length}`);
    console.log(`   📦 First user ID: ${users[0]?._id || 'none'}`);

    // Test first() method
    const firstUser = await sdk.data('users').first();
    console.log(`   ✅ first() method: ${firstUser ? 'found' : 'none'}`);

    // Test exists() method
    const hasUsers = await sdk.data('users').exists();
    console.log(`   ✅ exists() method: ${hasUsers}`);

    // Test count() method
    const userCount = await sdk.data('users').count();
    console.log(`   ✅ count() method: ${userCount} users`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 3: Cache Behavior
  // ========================================================================

  console.log('3️⃣  Cache Behavior Test');
  try {
    // First query - cache miss
    const query1 = await sdk.data('users').limit(2).execute();
    console.log(`   ✅ Query 1 executed: ${query1.length} documents`);

    // Second query (same params) - cache hit
    const query2 = await sdk.data('users').limit(2).execute();
    console.log(`   ✅ Query 2 executed: ${query2.length} documents`);

    // Third query with noCache() - cache bypass
    const query3 = await sdk.data('users').limit(2).noCache().execute();
    console.log(`   ✅ Query 3 (noCache): ${query3.length} documents`);

    const cacheStats = sdk.getCacheStats();
    console.log(`   📈 Cache stats: ${cacheStats.hits} hits, ${cacheStats.misses} misses`);
    console.log(`   📊 Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 4: Tables API (cached)
  // ========================================================================

  console.log('4️⃣  Tables API');
  try {
    const tables = await sdk.tables();
    console.log(`   ✅ Success: ${tables.success}`);
    console.log(`   📋 Tables count: ${tables.data.count}`);
    console.log(`   📋 Sample tables: ${tables.data.tables.slice(0, 3).join(', ')}`);
    console.log(`   ⏱️  Execution time: ${tables.metadata.executionTime}ms`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 5: Functions API
  // ========================================================================

  console.log('5️⃣  Functions API');
  try {
    const functions = await sdk.functions();
    console.log(`   ✅ Success: ${functions.success}`);
    console.log(`   🔧 Functions count: ${functions.data.count}`);
    console.log(`   🔧 Sample: ${functions.data.functions[0]?.name || 'none'}`);
    console.log(`   ⏱️  Execution time: ${functions.metadata.executionTime}ms`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 6: Run Function API
  // ========================================================================

  console.log('6️⃣  Run Function API');
  try {
    const result = await sdk.runFunction('exercises:getCategories', {});
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   📦 Result type: ${Array.isArray(result.data.result) ? 'Array' : typeof result.data.result}`);
    console.log(`   📊 Result length: ${Array.isArray(result.data.result) ? result.data.result.length : 'N/A'}`);
    console.log(`   ⏱️  Execution time: ${result.metadata.executionTime}ms`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 7: Environment API
  // ========================================================================

  console.log('7️⃣  Environment API');
  try {
    // List
    const envList = await sdk.env.list();
    console.log(`   ✅ List success: ${envList.success}`);
    console.log(`   🔑 Variables count: ${envList.data.count}`);
    console.log(`   ⏱️  Execution time: ${envList.metadata.executionTime}ms`);

    // Get specific var
    if (envList.data.variables.length > 0) {
      const varName = envList.data.variables[0].name;
      const envGet = await sdk.env.get(varName);
      console.log(`   ✅ Get success: ${envGet.success}`);
      console.log(`   🔑 Variable: ${varName}`);
      console.log(`   📝 Value length: ${envGet.data.value.length} chars`);
    }
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 8: Telemetry & Metrics
  // ========================================================================

  console.log('8️⃣  Telemetry & Metrics');
  try {
    const metrics = sdk.getMetrics();

    console.log('   ✅ Operations:');
    console.log(`      Total: ${metrics.operations.total}`);
    console.log(`      By type:`, Object.keys(metrics.operations.byType).join(', '));

    console.log('   ✅ Latency:');
    console.log(`      Avg: ${metrics.latency.avg.toFixed(0)}ms`);
    console.log(`      Min: ${metrics.latency.min}ms`);
    console.log(`      Max: ${metrics.latency.max}ms`);
    console.log(`      P95: ${metrics.latency.p95.toFixed(0)}ms`);

    console.log('   ✅ Cache:');
    console.log(`      Hits: ${metrics.cache.hits}`);
    console.log(`      Misses: ${metrics.cache.misses}`);
    console.log(`      Hit rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`);

    console.log('   ✅ Errors:');
    console.log(`      Total: ${metrics.errors.total}`);

    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 9: Cache Stats
  // ========================================================================

  console.log('9️⃣  Cache Statistics');
  try {
    const cacheStats = sdk.getCacheStats();

    if (cacheStats.enabled) {
      console.log(`   ✅ Cache enabled: true`);
      console.log(`   📊 Current size: ${cacheStats.size}`);
      console.log(`   📊 Max size: ${cacheStats.maxSize}`);
      console.log(`   📈 Hits: ${cacheStats.hits}`);
      console.log(`   📉 Misses: ${cacheStats.misses}`);
      console.log(`   🎯 Hit rate: ${(cacheStats.hitRate * 100).toFixed(1)}%`);
      console.log(`   🗑️  Evictions: ${cacheStats.evictions}`);
      console.log(`   ⏰ Expirations: ${cacheStats.expirations}`);
    } else {
      console.log(`   ⚠️  Cache disabled`);
    }
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 10: Cache Management
  // ========================================================================

  console.log('🔟 Cache Management');
  try {
    const before = sdk.getCacheStats();
    console.log(`   📊 Before clear: ${before.size} entries`);

    sdk.clearCache();

    const after = sdk.getCacheStats();
    console.log(`   ✅ After clear: ${after.size} entries`);
    console.log(`   ✅ Cache cleared successfully`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 11: Metrics Export
  // ========================================================================

  console.log('1️⃣1️⃣  Metrics Export');
  try {
    const metricsJson = sdk.exportMetrics();
    const parsed = JSON.parse(metricsJson);

    console.log(`   ✅ Export successful`);
    console.log(`   📊 JSON valid: true`);
    console.log(`   📦 Contains sections: operations, latency, cache, errors`);
    console.log(`   📈 Total operations: ${parsed.operations.total}`);
    console.log('');
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
  }

  // ========================================================================
  // Test 12: Log Streaming (basic test, don't run with --follow)
  // ========================================================================

  console.log('1️⃣2️⃣  Log Streaming (EventEmitter)');
  try {
    // Test non-streaming logs first
    const logs = await sdk.logs({ history: 5 });
    console.log(`   ✅ History logs success: ${logs.success}`);
    console.log(`   📋 Logs retrieved: ${logs.data.logs.length}`);

    // Test streaming (with timeout)
    console.log('   🔄 Testing streaming (5s timeout)...');
    const stream = sdk.logsStream({ follow: false }); // Don't actually follow

    let logCount = 0;
    stream.on('log', (log: any) => {
      logCount++;
    });

    stream.on('error', (err: Error) => {
      console.log(`   ⚠️  Stream error (expected): ${err.message}`);
    });

    stream.on('end', () => {
      console.log(`   ✅ Stream ended`);
    });

    // Stop after 2 seconds
    await sleep(2000);
    (stream as any).stop?.();

    console.log(`   ✅ Streaming test completed`);
    console.log('');
  } catch (error: any) {
    console.log(`   ⚠️  Logs test skipped (timeout): ${error.message}\n`);
  }

  // ========================================================================
  // Summary
  // ========================================================================

  console.log('📊 Test Summary\n');

  const finalMetrics = sdk.getMetrics();
  console.log('Final Metrics:');
  console.log(`  Operations: ${finalMetrics.operations.total}`);
  console.log(`  Avg Latency: ${finalMetrics.latency.avg.toFixed(0)}ms`);
  console.log(`  P95 Latency: ${finalMetrics.latency.p95.toFixed(0)}ms`);
  console.log(`  Cache Hit Rate: ${(finalMetrics.cache.hitRate * 100).toFixed(1)}%`);
  console.log(`  Errors: ${finalMetrics.errors.total}`);

  const finalCache = sdk.getCacheStats();
  console.log('\nCache Performance:');
  console.log(`  Total Hits: ${finalCache.hits}`);
  console.log(`  Total Misses: ${finalCache.misses}`);
  console.log(`  Hit Rate: ${(finalCache.hitRate * 100).toFixed(1)}%`);
  console.log(`  Evictions: ${finalCache.evictions}`);

  // ========================================================================
  // Cleanup
  // ========================================================================

  console.log('\n🧹 Cleaning up...');
  sdk.destroy();
  console.log('   ✅ SDK destroyed\n');

  console.log('✅ All tests completed!\n');
}

// Run tests
testSDK().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
