/**
 * Comprehensive SDK Test - All Advanced Features
 *
 * Tests:
 * - Phase 4: Builder pattern, caching, telemetry
 * - Phase 5: Batch operations, streaming, monitoring
 */

import { ConvexSDK } from './index.js';

async function testSDK() {
  console.log('🧪 CONVEX SDK COMPREHENSIVE TEST\n');
  console.log('='.repeat(80));

  const sdk = new ConvexSDK({
    cache: { enabled: true, ttl: 60, maxSize: 100 },
    telemetry: { enabled: true },
    monitoring: { enabled: false } // Disable for this test
  });

  const results: any = {
    phase4: {},
    phase5: {},
    errors: []
  };

  try {
    // ========================================================================
    // PHASE 4 TESTS: Builder Pattern, Caching, Telemetry
    // ========================================================================
    console.log('\n📦 PHASE 4: BUILDER PATTERN, CACHING, TELEMETRY\n');

    // Test 1: Builder Pattern - Basic Query
    console.log('1️⃣  Testing builder pattern (basic query)...');
    try {
      const users = await sdk.data('users').limit(2).execute();
      results.phase4.builderBasic = {
        success: true,
        count: users.data?.count || 0,
        hasData: !!users.data
      };
      console.log(`   ✅ Retrieved ${users.data?.count} users`);
    } catch (err: any) {
      results.phase4.builderBasic = { success: false, error: err.message };
      results.errors.push(`Builder basic: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 2: Builder Pattern - First Document
    console.log('\n2️⃣  Testing builder pattern (first document)...');
    try {
      const firstUser = await sdk.data('users').first();
      results.phase4.builderFirst = {
        success: true,
        hasDocument: !!firstUser
      };
      console.log(`   ✅ Retrieved first document`);
    } catch (err: any) {
      results.phase4.builderFirst = { success: false, error: err.message };
      results.errors.push(`Builder first: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 3: Builder Pattern - Exists Check
    console.log('\n3️⃣  Testing builder pattern (exists check)...');
    try {
      const exists = await sdk.data('users').exists();
      results.phase4.builderExists = {
        success: true,
        exists
      };
      console.log(`   ✅ Table exists: ${exists}`);
    } catch (err: any) {
      results.phase4.builderExists = { success: false, error: err.message };
      results.errors.push(`Builder exists: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 4: Builder Pattern - Count
    console.log('\n4️⃣  Testing builder pattern (count)...');
    try {
      const count = await sdk.data('users').count();
      results.phase4.builderCount = {
        success: true,
        count
      };
      console.log(`   ✅ Count: ${count}`);
    } catch (err: any) {
      results.phase4.builderCount = { success: false, error: err.message };
      results.errors.push(`Builder count: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 5: Caching - Cache Hit Test
    console.log('\n5️⃣  Testing caching (cache hit)...');
    try {
      // First call (miss)
      await sdk.status();
      const statsBefore = sdk.getCacheStats();

      // Second call (should hit cache)
      await sdk.status();
      const statsAfter = sdk.getCacheStats();

      results.phase4.caching = {
        success: true,
        enabled: statsAfter.enabled,
        hits: statsAfter.hits,
        misses: statsAfter.misses,
        hitRate: statsAfter.hitRate
      };
      console.log(`   ✅ Cache hits: ${statsAfter.hits}, misses: ${statsAfter.misses}`);
      console.log(`   📊 Hit rate: ${(statsAfter.hitRate * 100).toFixed(1)}%`);
    } catch (err: any) {
      results.phase4.caching = { success: false, error: err.message };
      results.errors.push(`Caching: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 6: Telemetry - Metrics Collection
    console.log('\n6️⃣  Testing telemetry (metrics collection)...');
    try {
      const metrics = sdk.getMetrics();
      results.phase4.telemetry = {
        success: true,
        operations: metrics.operations?.total || 0,
        cache: {
          hits: metrics.cache?.hits || 0,
          misses: metrics.cache?.misses || 0,
          hitRate: metrics.cache?.hitRate || 0
        },
        hasLatency: !!metrics.latency
      };
      console.log(`   ✅ Total operations: ${metrics.operations?.total || 0}`);
      console.log(`   📊 Cache metrics: ${metrics.cache?.hits || 0} hits, ${metrics.cache?.misses || 0} misses`);
    } catch (err: any) {
      results.phase4.telemetry = { success: false, error: err.message };
      results.errors.push(`Telemetry: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // ========================================================================
    // PHASE 5 TESTS: Batch Operations, Streaming
    // ========================================================================
    console.log('\n\n📦 PHASE 5: BATCH OPERATIONS, STREAMING\n');

    // Test 7: Batch Parallel Execution
    console.log('7️⃣  Testing batch parallel execution...');
    try {
      const batchResults = await sdk.batch.parallel([
        () => sdk.data('users').limit(1).execute(),
        () => sdk.status(),
        () => sdk.tables()
      ]);

      results.phase5.batchParallel = {
        success: true,
        total: batchResults.total,
        succeeded: batchResults.succeeded,
        failed: batchResults.failed,
        successRate: batchResults.successRate
      };
      console.log(`   ✅ Executed ${batchResults.total} operations`);
      console.log(`   📊 Success: ${batchResults.succeeded}, Failed: ${batchResults.failed}`);
      console.log(`   📈 Success rate: ${(batchResults.successRate * 100).toFixed(1)}%`);
    } catch (err: any) {
      results.phase5.batchParallel = { success: false, error: err.message };
      results.errors.push(`Batch parallel: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 8: Batch Sequential Execution
    console.log('\n8️⃣  Testing batch sequential execution...');
    try {
      const batchResults = await sdk.batch.sequential([
        () => sdk.data('users').limit(1).execute(),
        () => sdk.tables()
      ]);

      results.phase5.batchSequential = {
        success: true,
        total: batchResults.total,
        succeeded: batchResults.succeeded,
        executedInOrder: true
      };
      console.log(`   ✅ Executed ${batchResults.total} operations sequentially`);
    } catch (err: any) {
      results.phase5.batchSequential = { success: false, error: err.message };
      results.errors.push(`Batch sequential: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 9: Streaming - Document Stream
    console.log('\n9️⃣  Testing streaming (document stream)...');
    try {
      const stream = sdk.stream('users', { chunkSize: 5, maxDocuments: 3 });
      let count = 0;

      for await (const user of stream) {
        count++;
      }

      results.phase5.streamDocuments = {
        success: true,
        documentsStreamed: count
      };
      console.log(`   ✅ Streamed ${count} documents`);
    } catch (err: any) {
      results.phase5.streamDocuments = { success: false, error: err.message };
      results.errors.push(`Stream documents: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 10: Streaming - Chunked Stream
    console.log('\n🔟 Testing streaming (chunked stream)...');
    try {
      const stream = sdk.streamChunks('users', { chunkSize: 2, maxDocuments: 4 });
      let chunkCount = 0;
      let totalDocs = 0;

      for await (const chunk of stream) {
        chunkCount++;
        totalDocs += chunk.length;
      }

      results.phase5.streamChunks = {
        success: true,
        chunks: chunkCount,
        totalDocuments: totalDocs
      };
      console.log(`   ✅ Streamed ${chunkCount} chunks (${totalDocs} documents)`);
    } catch (err: any) {
      results.phase5.streamChunks = { success: false, error: err.message };
      results.errors.push(`Stream chunks: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

    // Test 11: Pagination
    console.log('\n1️⃣1️⃣ Testing pagination...');
    try {
      const paginator = sdk.paginate('users', { pageSize: 2, maxPages: 2 });
      let pageCount = 0;
      let totalDocs = 0;

      while (paginator.hasNext()) {
        const page = await paginator.next();
        pageCount++;
        totalDocs += page.count;
      }

      results.phase5.pagination = {
        success: true,
        pages: pageCount,
        totalDocuments: totalDocs
      };
      console.log(`   ✅ Paginated ${pageCount} pages (${totalDocs} documents)`);
    } catch (err: any) {
      results.phase5.pagination = { success: false, error: err.message };
      results.errors.push(`Pagination: ${err.message}`);
      console.log(`   ❌ Error: ${err.message}`);
    }

  } finally {
    // Cleanup
    sdk.destroy();
  }

  // ========================================================================
  // SUMMARY
  // ========================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY\n');

  console.log('Phase 4 (Builder, Cache, Telemetry):');
  const phase4Tests = Object.keys(results.phase4).length;
  const phase4Success = Object.values(results.phase4).filter((r: any) => r.success).length;
  console.log(`  ✅ Passed: ${phase4Success}/${phase4Tests}`);
  console.log(`  ❌ Failed: ${phase4Tests - phase4Success}/${phase4Tests}\n`);

  console.log('Phase 5 (Batch, Streaming):');
  const phase5Tests = Object.keys(results.phase5).length;
  const phase5Success = Object.values(results.phase5).filter((r: any) => r.success).length;
  console.log(`  ✅ Passed: ${phase5Success}/${phase5Tests}`);
  console.log(`  ❌ Failed: ${phase5Tests - phase5Success}/${phase5Tests}\n`);

  const totalTests = phase4Tests + phase5Tests;
  const totalSuccess = phase4Success + phase5Success;
  const successRate = ((totalSuccess / totalTests) * 100).toFixed(1);

  console.log(`Overall: ${totalSuccess}/${totalTests} tests passed (${successRate}%)`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    results.errors.forEach((err: string, i: number) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // Output JSON results
  console.log('\n📄 Detailed Results (JSON):\n');
  console.log(JSON.stringify(results, null, 2));

  process.exit(results.errors.length > 0 ? 1 : 0);
}

testSDK();
