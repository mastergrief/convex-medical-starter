/**
 * Advanced SDK Features Test Suite
 *
 * Tests advanced caching, batch race/any operations, and monitoring/metrics export.
 * Part of Convex CLI improvement plan (Item #4).
 */

import { AdvancedCache, CommonPatterns, CacheInvalidator, getAdvancedStats } from './cache-advanced.js';
import { BatchExecutor } from './batch.js';
import { MonitoringExporter, ExampleCollectors } from './monitoring.js';
import { Telemetry } from './telemetry.js';
import { Cache } from './cache.js';

/**
 * Test result interface
 */
interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  duration: number;
}

/**
 * Utility: Delay promise
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: Advanced Caching - Dependency Tracking
 */
async function testDependencyTracking(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n1️⃣  Testing dependency tracking...');

    const cache = new AdvancedCache({
      dependencies: {
        enabled: true,
        patterns: []
      }
    });

    // Set value with dependencies
    cache.set('user:123', { name: 'Alice' });
    cache.set('user:123:profile', { bio: 'Developer' }, { dependsOn: ['user:123'] });
    cache.set('user:123:posts', ['post1', 'post2'], { dependsOn: ['user:123'] });

    // Check dependency info
    const profileDeps = cache.getDependencyInfo('user:123:profile');
    if (!profileDeps || profileDeps.dependsOn[0] !== 'user:123') {
      throw new Error('Dependency tracking failed: profile not linked to user');
    }

    const userDeps = cache.getDependencyInfo('user:123');
    if (!userDeps || !userDeps.dependents.includes('user:123:profile')) {
      throw new Error('Dependency tracking failed: user not tracking profile as dependent');
    }

    // Delete parent should cascade to dependents
    cache.delete('user:123');

    if (cache.get('user:123:profile') !== undefined) {
      throw new Error('Cascade deletion failed: dependent still exists');
    }

    console.log('   ✅ Dependency tracking works correctly');
    console.log('   ✅ Cascade deletion works correctly');

    cache.destroy();

    return {
      test: 'Dependency Tracking',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Dependency Tracking',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 2: Advanced Caching - Cache Warming
 */
async function testCacheWarming(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n2️⃣  Testing cache warming...');

    let fetchCount = 0;

    const cache = new AdvancedCache({
      warming: {
        enabled: true,
        strategy: 'eager',
        warmup: [
          {
            key: 'config:app',
            fetcher: async () => {
              fetchCount++;
              await delay(10);
              return { theme: 'dark', version: '1.0' };
            }
          },
          {
            key: 'config:db',
            fetcher: async () => {
              fetchCount++;
              await delay(10);
              return { host: 'localhost', port: 5432 };
            }
          }
        ]
      }
    });

    // Give warmup time to complete
    await delay(100);

    // Manually trigger warming
    await cache.warm();

    // Check if values were warmed
    const appConfig = cache.get('config:app');
    const dbConfig = cache.get('config:db');

    if (!appConfig || !dbConfig) {
      throw new Error('Cache warming failed: values not pre-loaded');
    }

    if (fetchCount < 2) {
      throw new Error('Cache warming failed: fetchers not called');
    }

    console.log('   ✅ Eager warming pre-loads data');
    console.log('   ✅ Manual warming trigger works');
    console.log(`   ℹ️  Fetchers called ${fetchCount} times`);

    cache.destroy();

    return {
      test: 'Cache Warming',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Cache Warming',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 3: Advanced Caching - Invalidation Patterns
 */
async function testInvalidationPatterns(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n3️⃣  Testing invalidation patterns...');

    const cache = new AdvancedCache({
      dependencies: {
        enabled: true,
        patterns: [
          CommonPatterns.environment,
          CommonPatterns.dataMutation('users')
        ]
      }
    });

    // Set various keys
    cache.set('users:123', { name: 'Alice' });
    cache.set('users:456', { name: 'Bob' });
    cache.set('posts:789', { title: 'Test' });
    cache.set('data:users:list', ['123', '456']);

    // Test wildcard pattern invalidation
    const invalidatedCount = cache.invalidatePattern('users:*');

    if (invalidatedCount !== 2) {
      throw new Error(`Expected 2 invalidations, got ${invalidatedCount}`);
    }

    if (cache.get('users:123') !== undefined) {
      throw new Error('Pattern invalidation failed: key still exists');
    }

    // Posts should not be affected
    if (cache.get('posts:789') === undefined) {
      throw new Error('Pattern invalidation too broad: unrelated key deleted');
    }

    console.log('   ✅ Wildcard pattern matching works');
    console.log('   ✅ Selective invalidation works');
    console.log(`   ℹ️  Invalidated ${invalidatedCount} keys`);

    // Test cache invalidator utility
    const invalidator = new CacheInvalidator(cache);
    cache.set('data:posts:list', ['789']);
    invalidator.invalidateTable('posts');

    if (cache.get('data:posts:list') !== undefined) {
      throw new Error('CacheInvalidator failed: table data not cleared');
    }

    console.log('   ✅ CacheInvalidator utility works');

    cache.destroy();

    return {
      test: 'Invalidation Patterns',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Invalidation Patterns',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 4: Batch Operations - race()
 */
async function testBatchRace(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n4️⃣  Testing batch.race() - first to complete wins...');

    const batch = new BatchExecutor({ operationTimeout: 5000 });

    // Create operations with different delays
    const operations = [
      async () => {
        await delay(200);
        return 'slow-result';
      },
      async () => {
        await delay(50);
        return 'fast-result';
      },
      async () => {
        await delay(500);
        return 'slowest-result';
      }
    ];

    const winner = await batch.race(operations);

    if (winner !== 'fast-result') {
      throw new Error(`Expected 'fast-result', got '${winner}'`);
    }

    console.log('   ✅ race() returns first completed result');
    console.log(`   ℹ️  Winner: ${winner}`);

    return {
      test: 'Batch Race',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Batch Race',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 5: Batch Operations - any()
 */
async function testBatchAny(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n5️⃣  Testing batch.any() - first successful result...');

    const batch = new BatchExecutor({ operationTimeout: 5000 });

    // Create operations where some fail
    const operations = [
      async () => {
        await delay(10);
        throw new Error('Primary failed');
      },
      async () => {
        await delay(50);
        return 'secondary-success';
      },
      async () => {
        await delay(100);
        return 'tertiary-success';
      }
    ];

    const result = await batch.any(operations);

    if (result !== 'secondary-success') {
      throw new Error(`Expected 'secondary-success', got '${result}'`);
    }

    console.log('   ✅ any() returns first successful result');
    console.log('   ✅ any() skips failed operations');
    console.log(`   ℹ️  Result: ${result}`);

    // Test all failures scenario
    try {
      await batch.any([
        async () => { throw new Error('Fail 1'); },
        async () => { throw new Error('Fail 2'); },
        async () => { throw new Error('Fail 3'); }
      ]);
      throw new Error('Expected all failures to throw error');
    } catch (error) {
      if (!(error instanceof AggregateError)) {
        throw new Error(`Expected AggregateError, got ${error}`);
      }
      console.log('   ✅ any() throws when all operations fail');
    }

    return {
      test: 'Batch Any',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Batch Any',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 6: Monitoring - Prometheus Format
 */
async function testPrometheusFormat(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n6️⃣  Testing Prometheus metrics format...');

    const exporter = new MonitoringExporter({
      enabled: true,
      format: 'prometheus',
      prefix: 'test_sdk',
      labels: { environment: 'test' }
    });

    // Create telemetry with some operations
    const telemetry = new Telemetry({ enabled: true });
    telemetry.recordOperation('query:users');
    telemetry.recordLatency('query:users', 150);
    telemetry.recordOperation('mutation:posts');
    telemetry.recordLatency('mutation:posts', 200);
    telemetry.recordError('timeout', 'connection');

    // Create cache with some activity
    const cache = new Cache({ maxSize: 100 });
    cache.set('key1', 'value1');
    cache.get('key1'); // Hit
    telemetry.recordCacheHit();
    cache.get('key2'); // Miss
    telemetry.recordCacheMiss();

    // Export metrics
    const metrics = await exporter.export(telemetry, cache);

    // Verify Prometheus format
    if (!metrics.includes('# TYPE test_sdk_operations_total counter')) {
      throw new Error('Missing TYPE declaration in Prometheus format');
    }

    if (!metrics.includes('# HELP test_sdk_operations_total')) {
      throw new Error('Missing HELP declaration in Prometheus format');
    }

    if (!metrics.includes('test_sdk_operations_total')) {
      throw new Error('Missing operations_total metric');
    }

    if (!metrics.includes('test_sdk_cache_hits_total')) {
      throw new Error('Missing cache_hits_total metric');
    }

    if (!metrics.includes('environment="test"')) {
      throw new Error('Missing custom labels in metrics');
    }

    console.log('   ✅ Prometheus TYPE/HELP declarations present');
    console.log('   ✅ Metric names formatted correctly');
    console.log('   ✅ Custom labels included');
    console.log(`   ℹ️  Exported ${metrics.split('\n').filter(l => l && !l.startsWith('#')).length} metric lines`);

    return {
      test: 'Prometheus Format',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Prometheus Format',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 7: Monitoring - Custom Collectors
 */
async function testCustomCollectors(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n7️⃣  Testing custom metric collectors...');

    const exporter = new MonitoringExporter({
      enabled: true,
      format: 'json',
      collectors: [
        ExampleCollectors.system(),
        ExampleCollectors.uptime()
      ]
    });

    // Export with custom collectors
    const metricsJson = await exporter.export();
    const parsed = JSON.parse(metricsJson);

    if (!parsed.metrics) {
      throw new Error('Missing metrics array in JSON output');
    }

    // Check for system metrics
    const memoryMetric = parsed.metrics.find(
      (m: any) => m.name === 'convex_sdk_memory_heap_used_bytes'
    );

    if (!memoryMetric) {
      throw new Error('Missing system memory metric from collector');
    }

    // Check for uptime metric
    const uptimeMetric = parsed.metrics.find(
      (m: any) => m.name === 'convex_sdk_uptime_seconds'
    );

    if (!uptimeMetric) {
      throw new Error('Missing uptime metric from collector');
    }

    console.log('   ✅ Custom collectors integrate correctly');
    console.log('   ✅ System metrics collected');
    console.log('   ✅ Uptime metrics collected');
    console.log(`   ℹ️  Total metrics: ${parsed.metrics.length}`);

    // Test adding custom collector at runtime
    let customCollectorCalled = false;
    exporter.addCollector({
      name: 'custom',
      collect: () => {
        customCollectorCalled = true;
        return [{
          name: 'custom_metric',
          type: 'gauge',
          help: 'Custom test metric',
          value: 42,
          timestamp: Date.now()
        }];
      }
    });

    await exporter.export();

    if (!customCollectorCalled) {
      throw new Error('Runtime-added collector not called');
    }

    console.log('   ✅ Runtime collector addition works');

    return {
      test: 'Custom Collectors',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Custom Collectors',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Test 8: Advanced Cache Statistics
 */
async function testAdvancedCacheStats(): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log('\n8️⃣  Testing advanced cache statistics...');

    const cache = new AdvancedCache({
      dependencies: { enabled: true }
    });

    // Create some data with dependencies
    cache.set('parent1', { data: 'p1' });
    cache.set('child1', { data: 'c1' }, { dependsOn: ['parent1'] });
    cache.set('child2', { data: 'c2' }, { dependsOn: ['parent1'] });
    cache.set('grandchild1', { data: 'gc1' }, { dependsOn: ['child1'] });

    const stats = getAdvancedStats(cache);

    if (stats.dependencyCount < 4) {
      throw new Error(`Expected at least 4 tracked dependencies, got ${stats.dependencyCount}`);
    }

    if (stats.totalDependents < 3) {
      throw new Error(`Expected at least 3 total dependents, got ${stats.totalDependents}`);
    }

    if (stats.cache.size !== 4) {
      throw new Error(`Expected cache size 4, got ${stats.cache.size}`);
    }

    console.log('   ✅ Advanced statistics calculated correctly');
    console.log(`   ℹ️  Dependency count: ${stats.dependencyCount}`);
    console.log(`   ℹ️  Total dependents: ${stats.totalDependents}`);
    console.log(`   ℹ️  Avg dependencies per key: ${stats.avgDependenciesPerKey.toFixed(2)}`);

    cache.destroy();

    return {
      test: 'Advanced Cache Stats',
      status: 'PASS',
      duration: Date.now() - startTime
    };
  } catch (error) {
    console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return {
      test: 'Advanced Cache Stats',
      status: 'FAIL',
      error: String(error),
      duration: Date.now() - startTime
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests(): Promise<void> {
  console.log('🧪 Testing Convex SDK Advanced Features');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Testing: Advanced Caching, Batch Race/Any, Monitoring');
  console.log('');

  const results: TestResult[] = [];

  // Run tests sequentially
  results.push(await testDependencyTracking());
  results.push(await testCacheWarming());
  results.push(await testInvalidationPatterns());
  results.push(await testBatchRace());
  results.push(await testBatchAny());
  results.push(await testPrometheusFormat());
  results.push(await testCustomCollectors());
  results.push(await testAdvancedCacheStats());

  // Print summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Passed: ${passCount}/${results.length}`);
  console.log(`❌ Failed: ${failCount}/${results.length}`);
  console.log(`⏱️  Total time: ${totalDuration}ms`);
  console.log('');

  // Detailed results
  console.log('Test Results:');
  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const duration = `${result.duration}ms`;
    console.log(`  ${icon} ${result.test}: ${result.status} (${duration})`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Exit with appropriate code
  if (failCount > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
