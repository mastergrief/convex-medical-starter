/**
 * Browser Manager Types
 */

export interface BrowserConfig {
  headless: boolean;
  width: number;
  height: number;
}

export const DEFAULT_CONFIG: BrowserConfig = {
  headless: false,
  width: 2560,
  height: 1440,
};
