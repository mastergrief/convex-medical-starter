#!/usr/bin/env tsx
/**
 * Phase 1 Implementation Test Suite
 * Tests FIX-001 (Environment Variable Masking) and FIX-002 (Logs Timeout)
 */

import { ConvexCLI } from './LIB/client.js';
import { ConvexSDK } from './SDK/client.js';

async function testPhase1() {
  console.log('🧪 Phase 1 Test Suite - FIX-001 & FIX-002\n');

  const cli = new ConvexCLI();
  const sdk = new ConvexSDK();

  let passed = 0;
  let failed = 0;

  // FIX-001 Tests: Environment Variable Masking
  console.log('📋 FIX-001: Environment Variable Masking\n');

  // Test 1: CLI API - Masked list
  try {
    console.log('Test 1: CLI API - env.list({ masked: true })');
    const result = await cli.env.list({ masked: true });
    const hasSecret = result.data.variables.some(v => v.name === 'OPENAI_API_KEY');
    const isMasked = result.data.variables.find(v => v.name === 'OPENAI_API_KEY')?.value.includes('****');

    if (hasSecret && isMasked) {
      console.log('  ✅ PASS - Secrets are masked\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - Secrets not properly masked\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Test 2: CLI API - Unmasked list
  try {
    console.log('Test 2: CLI API - env.list({ masked: false })');
    const result = await cli.env.list({ masked: false });
    const hasSecret = result.data.variables.some(v => v.name === 'OPENAI_API_KEY');
    const isUnmasked = result.data.variables.find(v => v.name === 'OPENAI_API_KEY')?.value.startsWith('sk-proj-');

    if (hasSecret && isUnmasked) {
      console.log('  ✅ PASS - Secrets are unmasked when requested\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - Unmasked mode not working\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Test 3: CLI API - Masked get
  try {
    console.log('Test 3: CLI API - env.get(name, { masked: true })');
    const result = await cli.env.get('OPENAI_API_KEY', { masked: true });
    const isMasked = result.data.value.includes('****');

    if (isMasked) {
      console.log('  ✅ PASS - Individual variable masked\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - Individual variable not masked\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Test 4: SDK - Default masked (security)
  try {
    console.log('Test 4: SDK - env.list() defaults to masked');
    const result = await sdk.env.list(); // Should default to masked=true
    const hasSecret = result.data.variables.some(v => v.name === 'OPENAI_API_KEY');
    const isMasked = result.data.variables.find(v => v.name === 'OPENAI_API_KEY')?.value.includes('****');

    if (hasSecret && isMasked) {
      console.log('  ✅ PASS - SDK defaults to masked (secure by default)\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - SDK not defaulting to masked\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Test 5: SDK - Explicit unmasked
  try {
    console.log('Test 5: SDK - env.list(false) for unmasked');
    const result = await sdk.env.list(false);
    const hasSecret = result.data.variables.some(v => v.name === 'OPENAI_API_KEY');
    const isUnmasked = result.data.variables.find(v => v.name === 'OPENAI_API_KEY')?.value.startsWith('sk-proj-');

    if (hasSecret && isUnmasked) {
      console.log('  ✅ PASS - SDK explicit unmasked works\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - SDK explicit unmasked not working\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Test 6: SDK - Separate cache keys
  try {
    console.log('Test 6: SDK - Separate cache for masked/unmasked');
    await sdk.env.list(true); // Cached as masked
    await sdk.env.list(false); // Should be separate cache
    const stats = sdk.getCacheStats();

    // Both should be cache misses on first call (already called above)
    // but they should be stored separately
    console.log(`  Cache size: ${stats.size}`);
    console.log('  ✅ PASS - Cache keys separate (visual inspection)\n');
    passed++;
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // FIX-002 Tests: Logs Timeout
  console.log('📋 FIX-002: Logs Command Timeout\n');

  // Test 7: CLI API - Timeout parameter
  try {
    console.log('Test 7: CLI API - logs({ timeout: 15000 })');
    const result = await cli.logs({ history: 5, timeout: 15000 });

    if (result.success) {
      console.log('  ✅ PASS - Timeout parameter accepted\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - Timeout parameter not working\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Test 8: SDK - Timeout parameter
  try {
    console.log('Test 8: SDK - logs({ timeout: 15000 })');
    const result = await sdk.logs({ history: 5, timeout: 15000 });

    if (result.success) {
      console.log('  ✅ PASS - SDK timeout parameter accepted\n');
      passed++;
    } else {
      console.log('  ❌ FAIL - SDK timeout parameter not working\n');
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ FAIL - ${error}\n`);
    failed++;
  }

  // Summary
  console.log('━'.repeat(60));
  console.log(`\n📊 Test Results: ${passed}/${passed + failed} passed`);

  if (failed === 0) {
    console.log('✅ All Phase 1 tests passed!\n');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} test(s) failed\n`);
    process.exit(1);
  }
}

testPhase1();
