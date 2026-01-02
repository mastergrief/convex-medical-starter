/**
 * Result Aggregator for Parallel Test Orchestration
 * Collects and aggregates test results from multiple browser instances
 */

/**
 * Individual test result from a single test file execution
 */
export interface TestResult {
  /** Path to the test file */
  testFile: string;
  /** Instance identifier that executed this test */
  instance: string;
  /** Test outcome status */
  status: 'pass' | 'fail' | 'error';
  /** Execution duration in milliseconds */
  duration: number;
  /** Number of commands executed */
  commands: number;
  /** Error message if status is 'fail' or 'error' */
  error?: string;
  /** Failed command (if any) */
  failedCommand?: string;
  /** Line number of failed command */
  failedLine?: number;
}

/**
 * Aggregated results from all test executions
 */
export interface AggregatedResults {
  /** Total number of test files executed */
  totalTests: number;
  /** Number of passed tests */
  passed: number;
  /** Number of failed tests */
  failed: number;
  /** Number of tests with errors (could not execute) */
  errors: number;
  /** Total duration in milliseconds */
  duration: number;
  /** List of instance identifiers used */
  instances: string[];
  /** Individual test results */
  results: TestResult[];
  /** Pass rate as percentage (0-100) */
  passRate: number;
  /** Start timestamp */
  startTime?: string;
  /** End timestamp */
  endTime?: string;
}

/**
 * ResultAggregator collects test results from multiple parallel executions
 * and provides aggregated statistics
 */
export class ResultAggregator {
  private results: TestResult[] = [];
  private instances: Set<string> = new Set();
  private startTime: Date | null = null;
  private endTime: Date | null = null;

  /**
   * Mark the start of test execution
   */
  start(): void {
    this.startTime = new Date();
    this.endTime = null;
  }

  /**
   * Mark the end of test execution
   */
  end(): void {
    this.endTime = new Date();
  }

  /**
   * Add a test result from an instance
   * @param result - The test result to add
   */
  addResult(result: TestResult): void {
    this.results.push(result);
    this.instances.add(result.instance);
  }

  /**
   * Add multiple test results at once
   * @param results - Array of test results to add
   */
  addResults(results: TestResult[]): void {
    for (const result of results) {
      this.addResult(result);
    }
  }

  /**
   * Get aggregated results from all collected test results
   * @returns Aggregated results with statistics
   */
  getResults(): AggregatedResults {
    const passed = this.results.filter((r) => r.status === 'pass').length;
    const failed = this.results.filter((r) => r.status === 'fail').length;
    const errors = this.results.filter((r) => r.status === 'error').length;
    const totalTests = this.results.length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalTests,
      passed,
      failed,
      errors,
      duration: totalDuration,
      instances: Array.from(this.instances),
      results: [...this.results],
      passRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0,
      startTime: this.startTime?.toISOString(),
      endTime: this.endTime?.toISOString(),
    };
  }

  /**
   * Get results filtered by status
   * @param status - The status to filter by
   * @returns Array of matching test results
   */
  getResultsByStatus(status: 'pass' | 'fail' | 'error'): TestResult[] {
    return this.results.filter((r) => r.status === status);
  }

  /**
   * Get results for a specific instance
   * @param instance - The instance identifier
   * @returns Array of test results from that instance
   */
  getResultsByInstance(instance: string): TestResult[] {
    return this.results.filter((r) => r.instance === instance);
  }

  /**
   * Check if all tests passed
   * @returns true if all tests passed
   */
  allPassed(): boolean {
    return (
      this.results.length > 0 && this.results.every((r) => r.status === 'pass')
    );
  }

  /**
   * Check if any tests failed or errored
   * @returns true if any test failed or errored
   */
  hasFailures(): boolean {
    return this.results.some(
      (r) => r.status === 'fail' || r.status === 'error'
    );
  }

  /**
   * Clear all collected results
   */
  clear(): void {
    this.results = [];
    this.instances.clear();
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Get the total number of results collected
   * @returns Number of results
   */
  get count(): number {
    return this.results.length;
  }
}
