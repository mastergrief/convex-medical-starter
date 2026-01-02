import { describe, bench } from 'vitest';
import { parseGateCondition } from '../../lib/gateParser.js';

describe('Gate Parsing Performance', () => {
  bench('simple condition', () => {
    parseGateCondition('typecheck');
  });

  bench('compound condition', () => {
    parseGateCondition('typecheck AND tests AND memory:ANALYSIS_*');
  });

  bench('complex condition', () => {
    parseGateCondition(
      '(typecheck AND tests) OR (memory:SKIP_* AND traceability:justification)'
    );
  });

  bench('threshold condition', () => {
    parseGateCondition('evidence[coverage] >= 80 AND tests[passed] >= 10');
  });
});
