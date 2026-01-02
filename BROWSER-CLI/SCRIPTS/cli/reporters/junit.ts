/**
 * JUnit XML Reporter for Browser-CLI
 *
 * Generates JUnit-compatible XML reports for CI/CD integration.
 * Only assertion commands become test cases in the report.
 *
 * Usage:
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts assertVisible e5 --reporter=junit --junit-output=results.xml
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AssertionResult } from '../../features/assertions';

export interface JUnitTestCase {
  name: string;
  classname: string;
  time: number; // seconds
  failure?: {
    message: string;
    type: string;
    screenshot?: string;
  };
  systemOut?: string; // Playwright code or other output
}

export interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  time: number; // seconds
  timestamp: string; // ISO format
  testCases: JUnitTestCase[];
}

export class JUnitReporter {
  private suite: JUnitTestSuite;
  private startTime: number;

  constructor(suiteName: string = 'browser-cli-e2e') {
    this.startTime = Date.now();
    this.suite = {
      name: suiteName,
      tests: 0,
      failures: 0,
      errors: 0,
      skipped: 0,
      time: 0,
      timestamp: new Date().toISOString(),
      testCases: [],
    };
  }

  /**
   * Add a single test case
   */
  addTestCase(
    name: string,
    passed: boolean,
    durationMs: number,
    failure?: {
      message: string;
      screenshot?: string;
    },
    systemOut?: string
  ): void {
    const testCase: JUnitTestCase = {
      name,
      classname: this.suite.name,
      time: durationMs / 1000, // Convert to seconds
    };

    if (!passed && failure) {
      testCase.failure = {
        message: failure.message,
        type: 'AssertionError',
        screenshot: failure.screenshot,
      };
      this.suite.failures++;
    }

    if (systemOut) {
      testCase.systemOut = systemOut;
    }

    this.suite.tests++;
    this.suite.testCases.push(testCase);
  }

  /**
   * Import assertion results from AssertionsFeature
   * Only assertion commands become test cases (per user requirement)
   */
  importAssertions(results: AssertionResult[]): void {
    for (const result of results) {
      this.addTestCase(
        result.name,
        result.passed,
        result.duration,
        result.passed
          ? undefined
          : {
              message: `Expected: ${result.expected}, Actual: ${result.actual}`,
            }
      );
    }
  }

  /**
   * Generate JUnit XML string
   */
  toXML(): string {
    // Update total time
    this.suite.time = (Date.now() - this.startTime) / 1000;

    // Escape special XML characters
    const escapeXML = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuite name="${escapeXML(this.suite.name)}" `;
    xml += `tests="${this.suite.tests}" `;
    xml += `failures="${this.suite.failures}" `;
    xml += `errors="${this.suite.errors}" `;
    xml += `skipped="${this.suite.skipped}" `;
    xml += `time="${this.suite.time.toFixed(3)}" `;
    xml += `timestamp="${this.suite.timestamp}">\n`;

    for (const testCase of this.suite.testCases) {
      xml += `  <testcase name="${escapeXML(testCase.name)}" `;
      xml += `classname="${escapeXML(testCase.classname)}" `;
      xml += `time="${testCase.time.toFixed(3)}"`;

      if (testCase.failure || testCase.systemOut) {
        xml += '>\n';

        if (testCase.failure) {
          xml += `    <failure message="${escapeXML(testCase.failure.message)}" `;
          xml += `type="${escapeXML(testCase.failure.type)}">\n`;
          xml += `<![CDATA[${testCase.failure.message}`;
          if (testCase.failure.screenshot) {
            xml += `\nScreenshot: ${testCase.failure.screenshot}`;
          }
          xml += ']]>\n';
          xml += '    </failure>\n';
        }

        if (testCase.systemOut) {
          xml += `    <system-out><![CDATA[${testCase.systemOut}]]></system-out>\n`;
        }

        xml += '  </testcase>\n';
      } else {
        xml += ' />\n';
      }
    }

    xml += '</testsuite>\n';
    return xml;
  }

  /**
   * Write XML to file
   */
  writeToFile(outputPath: string): void {
    const dir = path.dirname(outputPath);
    if (dir && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, this.toXML(), 'utf-8');
  }

  /**
   * Get summary
   */
  getSummary(): { passed: number; failed: number; total: number; time: number } {
    return {
      passed: this.suite.tests - this.suite.failures,
      failed: this.suite.failures,
      total: this.suite.tests,
      time: (Date.now() - this.startTime) / 1000,
    };
  }
}
