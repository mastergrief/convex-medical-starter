/**
 * Test Distributor for Parallel Test Orchestration
 * Distributes test files across multiple browser instances using round-robin
 */

/**
 * Configuration for a single test instance
 */
export interface TestDistribution {
  /** Unique instance identifier (e.g., "inst1", "inst2") */
  instance: string;
  /** Browser-CLI port for this instance */
  port: number;
  /** Vite dev server port for this instance */
  vitePort: number;
  /** Test files assigned to this instance */
  tests: string[];
}

/**
 * Configuration for test distribution
 */
export interface DistributorConfig {
  /** Starting port for Browser-CLI instances (default: 3456) */
  basePort?: number;
  /** Starting port for Vite dev servers (default: 5173) */
  baseVitePort?: number;
  /** Instance name prefix (default: "inst") */
  instancePrefix?: string;
}

const DEFAULT_CONFIG: Required<DistributorConfig> = {
  basePort: 3456,
  baseVitePort: 5173,
  instancePrefix: 'inst',
};

/**
 * TestDistributor handles distribution of test files across parallel instances
 * using a round-robin algorithm for balanced workload
 */
export class TestDistributor {
  private config: Required<DistributorConfig>;

  constructor(config: DistributorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Distribute test files across N instances using round-robin
   * @param testFiles - Array of test file paths
   * @param instanceCount - Number of parallel instances to use
   * @returns Array of TestDistribution objects, one per instance
   */
  distribute(testFiles: string[], instanceCount: number): TestDistribution[] {
    if (instanceCount < 1) {
      throw new Error('Instance count must be at least 1');
    }

    if (testFiles.length === 0) {
      return [];
    }

    // Initialize distributions for each instance
    const distributions: TestDistribution[] = [];
    for (let i = 0; i < instanceCount; i++) {
      distributions.push({
        instance: `${this.config.instancePrefix}${i + 1}`,
        port: this.config.basePort + i,
        vitePort: this.config.baseVitePort + i,
        tests: [],
      });
    }

    // Round-robin distribution of test files
    for (let i = 0; i < testFiles.length; i++) {
      const instanceIndex = i % instanceCount;
      distributions[instanceIndex].tests.push(testFiles[i]);
    }

    // Filter out instances with no tests assigned
    return distributions.filter((d) => d.tests.length > 0);
  }

  /**
   * Distribute tests with estimated duration balancing
   * Uses file size as a proxy for test duration
   * @param testFiles - Array of test file paths with optional sizes
   * @param instanceCount - Number of parallel instances
   * @returns Balanced distribution across instances
   */
  distributeBalanced(
    testFiles: Array<{ path: string; size?: number }>,
    instanceCount: number
  ): TestDistribution[] {
    if (instanceCount < 1) {
      throw new Error('Instance count must be at least 1');
    }

    if (testFiles.length === 0) {
      return [];
    }

    // Initialize distributions with total estimated duration
    const distributions: Array<TestDistribution & { estimatedDuration: number }> =
      [];
    for (let i = 0; i < instanceCount; i++) {
      distributions.push({
        instance: `${this.config.instancePrefix}${i + 1}`,
        port: this.config.basePort + i,
        vitePort: this.config.baseVitePort + i,
        tests: [],
        estimatedDuration: 0,
      });
    }

    // Sort tests by size descending (larger tests first for better balancing)
    const sortedTests = [...testFiles].sort(
      (a, b) => (b.size || 0) - (a.size || 0)
    );

    // Greedy assignment: assign each test to the instance with least total duration
    for (const test of sortedTests) {
      // Find instance with minimum estimated duration
      let minIndex = 0;
      let minDuration = distributions[0].estimatedDuration;
      for (let i = 1; i < distributions.length; i++) {
        if (distributions[i].estimatedDuration < minDuration) {
          minDuration = distributions[i].estimatedDuration;
          minIndex = i;
        }
      }

      distributions[minIndex].tests.push(test.path);
      distributions[minIndex].estimatedDuration += test.size || 1;
    }

    // Remove estimatedDuration before returning and filter empty
    return distributions
      .filter((d) => d.tests.length > 0)
      .map(({ estimatedDuration: _ed, ...rest }) => rest);
  }

  /**
   * Get the optimal number of instances based on test count
   * Heuristic: 1 instance per 5 tests, min 1, max specified
   * @param testCount - Number of tests
   * @param maxInstances - Maximum allowed instances
   * @returns Optimal instance count
   */
  getOptimalInstanceCount(testCount: number, maxInstances: number): number {
    if (testCount === 0) return 0;
    const optimal = Math.ceil(testCount / 5);
    return Math.min(Math.max(optimal, 1), maxInstances);
  }

  /**
   * Validate that ports are available for the distribution
   * @param distribution - The distribution to validate
   * @returns true if ports appear valid (non-overlapping)
   */
  validatePorts(distribution: TestDistribution[]): boolean {
    const ports = new Set<number>();
    for (const d of distribution) {
      if (ports.has(d.port) || ports.has(d.vitePort)) {
        return false;
      }
      if (d.port === d.vitePort) {
        return false;
      }
      ports.add(d.port);
      ports.add(d.vitePort);
    }
    return true;
  }

  /**
   * Get environment variables for a specific distribution
   * @param distribution - The distribution to get env vars for
   * @returns Record of environment variable key-value pairs
   */
  getEnvVars(distribution: TestDistribution): Record<string, string> {
    return {
      BROWSER_INSTANCE: distribution.instance,
      BROWSER_PORT: String(distribution.port),
      VITE_PORT: String(distribution.vitePort),
    };
  }
}
