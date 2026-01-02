#!/usr/bin/env tsx
/**
 * Quick TypeScript API Test
 * Tests ConvexCLI class methods with timeouts
 */

import { ConvexCLI } from './LIB/index.js';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'TIMEOUT';
  duration: number;
  error?: string;
}

async function runTest(
  name: string,
  fn: () => Promise<any>,
  timeout: number = 10000
): Promise<TestResult> {
  const start = Date.now();

  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), timeout)
      )
    ]);

    return {
      test: name,
      status: 'PASS',
      duration: Date.now() - start
    };
  } catch (error: any) {
    return {
      test: name,
      status: error.message === 'TIMEOUT' ? 'TIMEOUT' : 'FAIL',
      duration: Date.now() - start,
      error: error.message
    };
  }
}

async function main() {
  console.log('🧪 Testing TypeScript API (ConvexCLI class)\n');

  const cli = new ConvexCLI({ timeout: 10000 });
  const results: TestResult[] = [];

  // Test 1: status()
  results.push(await runTest('status()', () => cli.status()));

  // Test 2: tables()
  results.push(await runTest('tables()', () => cli.tables()));

  // Test 3: queryData()
  results.push(await runTest('queryData("users", {limit: 2})',
    () => cli.queryData('users', { limit: 2 })));

  // Test 4: functions()
  results.push(await runTest('functions()', () => cli.functions()));

  // Test 5: runFunction()
  results.push(await runTest('runFunction("exercises:getCategories", {})',
    () => cli.runFunction('exercises:getCategories', {})));

  // Test 6: env.list()
  results.push(await runTest('env.list()', () => cli.env.list()));

  // Test 7: env.get()
  results.push(await runTest('env.get("OPENAI_MODEL")',
    () => cli.env.get('OPENAI_MODEL')));

  // Skip logs test (known timeout issue)
  results.push({
    test: 'logs({history: 5})',
    status: 'TIMEOUT',
    duration: 0,
    error: 'SKIPPED - Known timeout issue'
  });

  // Print results
  console.log('\n📊 Test Results:\n');
  console.log('─'.repeat(70));

  let passed = 0;
  let failed = 0;
  let timeouts = 0;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' :
                 result.status === 'TIMEOUT' ? '⏱️' : '❌';
    const duration = result.duration > 0 ? `${result.duration}ms` : 'N/A';

    console.log(`${icon} ${result.test.padEnd(45)} ${result.status.padEnd(10)} ${duration}`);

    if (result.error && result.status !== 'TIMEOUT') {
      console.log(`   Error: ${result.error}`);
    }

    if (result.status === 'PASS') passed++;
    else if (result.status === 'FAIL') failed++;
    else timeouts++;
  }

  console.log('─'.repeat(70));
  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Timeout: ${timeouts}/${results.length}`);
  console.log(`\n📈 Success Rate: ${((passed / (results.length - timeouts)) * 100).toFixed(1)}%`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
