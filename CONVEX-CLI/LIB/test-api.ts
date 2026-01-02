/**
 * Test script for Convex CLI TypeScript API
 *
 * Tests all API methods to ensure proper functionality
 */

import { ConvexCLI } from './index.js';

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param testName - Name of the test for error messages
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  testName: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Test '${testName}' timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

async function testAPI() {
  console.log('🧪 Testing Convex CLI TypeScript API\n');
  console.log('⏱️  Each test has a 30s timeout (logs test: 10s)\n');

  const cli = new ConvexCLI();
  const DEFAULT_TIMEOUT = 30000; // 30 seconds
  const LOGS_TIMEOUT = 10000; // 10 seconds for logs test

  const results: Array<{ test: string; status: 'PASS' | 'FAIL' | 'SKIP'; error?: string }> = [];

  try {
    // Test 1: Status
    console.log('1️⃣  Testing status()...');
    try {
      const status = await withTimeout(cli.status(), DEFAULT_TIMEOUT, 'status');
      console.log(`   ✅ Success: ${status.success}`);
      console.log(`   📊 Deployments: ${status.data?.deployments.length}`);
      console.log(`   🔗 URL: ${status.data?.deployments[0]?.url}`);
      console.log(`   ⏱️  Execution time: ${status.metadata.executionTime}ms\n`);
      results.push({ test: 'status', status: 'PASS' });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({ test: 'status', status: 'FAIL', error: String(error) });
    }

    // Test 2: Tables
    console.log('2️⃣  Testing tables()...');
    try {
      const tables = await withTimeout(cli.tables(), DEFAULT_TIMEOUT, 'tables');
      console.log(`   ✅ Success: ${tables.success}`);
      console.log(`   📋 Tables count: ${tables.data?.count}`);
      console.log(`   📄 First 5 tables: ${tables.data?.tables.slice(0, 5).join(', ')}`);
      console.log(`   ⏱️  Execution time: ${tables.metadata.executionTime}ms\n`);
      results.push({ test: 'tables', status: 'PASS' });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({ test: 'tables', status: 'FAIL', error: String(error) });
    }

    // Test 3: Functions
    console.log('3️⃣  Testing functions()...');
    try {
      const functions = await withTimeout(cli.functions(), DEFAULT_TIMEOUT, 'functions');
      console.log(`   ✅ Success: ${functions.success}`);
      console.log(`   🔧 Functions count: ${functions.data?.count}`);
      console.log(`   📝 First 5 functions: ${functions.data?.functions.slice(0, 5).map(f => f.name).join(', ')}`);
      console.log(`   ⏱️  Execution time: ${functions.metadata.executionTime}ms\n`);
      results.push({ test: 'functions', status: 'PASS' });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({ test: 'functions', status: 'FAIL', error: String(error) });
    }

    // Test 4: Query Data (users table with limit)
    console.log('4️⃣  Testing queryData(\'users\', { limit: 2 })...');
    try {
      const users = await withTimeout(cli.queryData('users', { limit: 2 }), DEFAULT_TIMEOUT, 'queryData');
      console.log(`   ✅ Success: ${users.success}`);
      console.log(`   👥 Documents returned: ${users.data?.documents.length}`);
      console.log(`   📊 Total count: ${users.data?.count}`);
      console.log(`   ⏱️  Execution time: ${users.metadata.executionTime}ms\n`);
      results.push({ test: 'queryData', status: 'PASS' });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({ test: 'queryData', status: 'FAIL', error: String(error) });
    }

    // Test 5: Run Function
    console.log('5️⃣  Testing runFunction(\'exercises:getCategories\', {})...');
    try {
      const result = await withTimeout(cli.runFunction('exercises:getCategories', {}), DEFAULT_TIMEOUT, 'runFunction');
      console.log(`   ✅ Success: ${result.success}`);
      console.log(`   📦 Result type: ${Array.isArray(result.data?.result) ? 'Array' : typeof result.data?.result}`);
      console.log(`   📊 Result length: ${Array.isArray(result.data?.result) ? result.data.result.length : 'N/A'}`);
      console.log(`   ⏱️  Execution time: ${result.metadata.executionTime}ms\n`);
      results.push({ test: 'runFunction', status: 'PASS' });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({ test: 'runFunction', status: 'FAIL', error: String(error) });
    }

    // Test 6: Environment Variables - List
    console.log('6️⃣  Testing env.list()...');
    let envListData;
    try {
      const envList = await withTimeout(cli.env.list(), DEFAULT_TIMEOUT, 'env.list');
      envListData = envList.data;
      console.log(`   ✅ Success: ${envList.success}`);
      console.log(`   🔑 Variables count: ${envList.data?.count}`);
      console.log(`   📝 Variables: ${envList.data?.variables.map(v => v.name).join(', ')}`);
      console.log(`   ⏱️  Execution time: ${envList.metadata.executionTime}ms\n`);
      results.push({ test: 'env.list', status: 'PASS' });
    } catch (error) {
      console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
      results.push({ test: 'env.list', status: 'FAIL', error: String(error) });
    }

    // Test 7: Environment Variables - Get
    if (envListData && envListData.variables.length > 0) {
      const firstVar = envListData.variables[0].name;
      console.log(`7️⃣  Testing env.get('${firstVar}')...`);
      try {
        const envGet = await withTimeout(cli.env.get(firstVar), DEFAULT_TIMEOUT, 'env.get');
        console.log(`   ✅ Success: ${envGet.success}`);
        console.log(`   🔑 Variable: ${envGet.data?.name}`);
        console.log(`   📝 Value length: ${envGet.data?.value.length} chars`);
        console.log(`   ⏱️  Execution time: ${envGet.metadata.executionTime}ms\n`);
        results.push({ test: 'env.get', status: 'PASS' });
      } catch (error) {
        console.log(`   ❌ FAIL: ${error instanceof Error ? error.message : String(error)}\n`);
        results.push({ test: 'env.get', status: 'FAIL', error: String(error) });
      }
    }

    // Test 8: Logs (last 5, with shorter timeout)
    console.log('8️⃣  Testing logs({ history: 5 })...');
    try {
      const logs = await withTimeout(cli.logs({ history: 5 }), LOGS_TIMEOUT, 'logs');
      console.log(`   ✅ Success: ${logs.success}`);
      console.log(`   📜 Logs count: ${logs.data?.count}`);
      console.log(`   ⏱️  Execution time: ${logs.metadata.executionTime}ms\n`);
      results.push({ test: 'logs', status: 'PASS' });
    } catch (error) {
      console.log(`   ⚠️  TIMEOUT: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`   ℹ️  Known issue: Logs may timeout. Use CLI with --timeout parameter.\n`);
      results.push({ test: 'logs', status: 'FAIL', error: String(error) });
    }

    // Print summary
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const skipCount = results.filter(r => r.status === 'SKIP').length;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 TEST SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Passed: ${passCount}/${results.length}`);
    console.log(`❌ Failed: ${failCount}/${results.length}`);
    console.log(`⏭️  Skipped: ${skipCount}/${results.length}`);
    console.log('\nTest Results:');

    results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`  ${icon} ${result.test}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (failCount > 0) {
      console.log('⚠️  Some tests failed. Check logs above for details.');
      process.exit(1);
    } else {
      console.log('🎉 All API tests completed successfully!');
    }

  } catch (error) {
    console.error('❌ Fatal error during API testing:');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
testAPI();
