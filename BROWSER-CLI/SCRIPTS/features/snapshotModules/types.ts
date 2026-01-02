/**
 * Snapshot Module Types
 * Shared interfaces and types for snapshot feature modules
 */

import { Page } from 'playwright';

/**
 * RefData stores both the aria role selector and an optional CSS selector
 * for reliable element location (especially for unnamed elements)
 */
export interface RefData {
  roleSelector: string;      // e.g., "- button \"Submit\"" or "- button"
  cssSelector?: string;      // e.g., "[data-date=\"2025-11-25\"] button"
  role: string;              // e.g., "button"
  name?: string;             // e.g., "Submit" (if available)
  roleIndex: number;         // Index among elements of same role type
  // Phase 1: Element State Enrichment
  state?: 'enabled' | 'disabled' | 'readonly' | 'loading';
  visible?: boolean;
  value?: string;            // Current value (for inputs)
  placeholder?: string;
  checked?: boolean;         // For checkbox/radio
  required?: boolean;
  validationError?: string;
  options?: string[];        // For select/combobox
  selectedOption?: string;
  expanded?: boolean;        // For combobox/menu
  // Phase 2.1: Ref Lifecycle Tracking
  snapshotId?: string;       // ID of snapshot that generated this ref
  generatedAt?: number;      // Timestamp when ref was generated
  cssValidated?: boolean;    // Whether CSS selector was validated
}

/**
 * Form field data for form analysis
 */
export interface FormField {
  ref: string;
  label: string;
  type: string;
  value: string;
  required: boolean;
  valid: boolean;
  error?: string;
}

/**
 * Analyzed form data with refs mapped
 */
export interface AnalyzedForm {
  formRef: string;
  formId: string;
  fields: FormField[];
  totalFields: number;
  filledFields: number;
  invalidFields: number;
  submitButton?: { ref: string; enabled: boolean };
  quickFill?: string;
}

/**
 * Form analysis result
 */
export interface FormAnalysis {
  forms: AnalyzedForm[];
  formatted: string;
}

/**
 * Logging function type for dependency injection
 */
export type LogFn = (message: string) => void;

/**
 * Context passed to interaction functions
 */
export interface InteractionContext {
  page: Page;
  refMap: Map<string, RefData>;
  log: LogFn;
}
