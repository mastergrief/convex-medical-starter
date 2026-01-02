/**
 * Snapshot Forms Module
 * Form detection and analysis functionality
 */

import { Page } from 'playwright';
import { RefData, FormAnalysis, AnalyzedForm, FormField } from './types';

/**
 * Raw form data from page evaluation
 */
interface RawFormData {
  formId: string;
  fields: Array<{
    label: string;
    type: string;
    value: string;
    required: boolean;
    valid: boolean;
    error?: string;
    inputSelector: string;
  }>;
  submitSelector?: string;
  submitEnabled?: boolean;
}

/**
 * Analyze forms on the page and map refs to form fields
 */
export async function analyzeForms(
  page: Page,
  refMap: Map<string, RefData>
): Promise<FormAnalysis> {
  const formData = await page.evaluate(() => {
    const forms: Array<{
      formId: string;
      fields: Array<{
        label: string;
        type: string;
        value: string;
        required: boolean;
        valid: boolean;
        error?: string;
        inputSelector: string;
      }>;
      submitSelector?: string;
      submitEnabled?: boolean;
    }> = [];

    // Find all forms (including implicit forms via role)
    const formElements = document.querySelectorAll('form, [role="form"]');

    formElements.forEach((form, formIdx) => {
      const formId = form.id || `form-${formIdx}`;
      const fields: typeof forms[0]['fields'] = [];

      // Find all form fields
      const inputs = form.querySelectorAll('input, textarea, select, [role="textbox"], [role="combobox"]');

      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;

        // Skip hidden, submit, button inputs
        if (htmlInput.type === 'hidden' || htmlInput.type === 'submit' || htmlInput.type === 'button') {
          return;
        }

        // Find label
        let label = '';
        const labelEl = input.closest('label') ||
                       document.querySelector(`label[for="${input.id}"]`);
        if (labelEl) {
          label = labelEl.textContent?.trim().replace(/\*$/, '').trim() || '';
        } else {
          label = input.getAttribute('aria-label') ||
                 input.getAttribute('placeholder') ||
                 input.getAttribute('name') || '';
        }

        // Get validation state
        let error: string | undefined;
        if (htmlInput.validity && !htmlInput.validity.valid) {
          error = htmlInput.validationMessage;
        } else if (input.getAttribute('aria-invalid') === 'true') {
          const errorId = input.getAttribute('aria-describedby');
          if (errorId) {
            const errorEl = document.getElementById(errorId);
            error = errorEl?.textContent?.trim();
          }
          if (!error) error = 'Invalid';
        }

        // Build selector for this input with proper CSS escaping
        let inputSelector = '';
        if (input.id) inputSelector = `#${CSS.escape(input.id)}`;
        else if (input.getAttribute('name')) inputSelector = `[name="${CSS.escape(input.getAttribute('name') || '')}"]`;
        else if (input.getAttribute('aria-label')) inputSelector = `[aria-label="${CSS.escape(input.getAttribute('aria-label') || '')}"]`;

        fields.push({
          label,
          type: htmlInput.type || input.tagName.toLowerCase(),
          value: htmlInput.value || '',
          required: htmlInput.required || input.getAttribute('aria-required') === 'true',
          valid: !error,
          error,
          inputSelector
        });
      });

      // Find submit button
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"], button:not([type])');

      forms.push({
        formId,
        fields,
        submitSelector: submitBtn?.id ? `#${CSS.escape(submitBtn.id)}` : undefined,
        submitEnabled: submitBtn ? !(submitBtn as HTMLButtonElement).disabled : undefined
      });
    });

    return forms;
  });

  // Map refs to form fields
  const analyzedForms: AnalyzedForm[] = formData.map((form, formIdx) => {
    const formRef = `form${formIdx + 1}`;

    const mappedFields: FormField[] = form.fields.map((field, fieldIdx) => {
      // Try to find ref for this field
      let ref = '';
      for (const [refKey, refData] of refMap.entries()) {
        if (refData.role === 'textbox' && refData.name?.toLowerCase().includes(field.label.toLowerCase())) {
          ref = refKey;
          break;
        }
      }
      if (!ref) ref = `?${fieldIdx + 1}`;

      return {
        ref,
        label: field.label,
        type: field.type,
        value: field.value,
        required: field.required,
        valid: field.valid,
        error: field.error
      };
    });

    const totalFields = mappedFields.length;
    const filledFields = mappedFields.filter(f => f.value.length > 0).length;
    const invalidFields = mappedFields.filter(f => !f.valid).length;

    // Find submit button ref
    let submitButton: { ref: string; enabled: boolean } | undefined;
    for (const [refKey, refData] of refMap.entries()) {
      if (refData.role === 'button' &&
          (refData.name?.toLowerCase().includes('submit') ||
           refData.name?.toLowerCase().includes('save'))) {
        submitButton = { ref: refKey, enabled: form.submitEnabled ?? true };
        break;
      }
    }

    // Generate quickFill command for empty required fields
    const emptyRequired = mappedFields.filter(f => f.required && !f.value && f.ref && !f.ref.startsWith('?'));
    let quickFill: string | undefined;
    if (emptyRequired.length > 0) {
      quickFill = emptyRequired.map(f => `type ${f.ref} "${f.label}"`).join(' && ');
      if (submitButton && submitButton.enabled) {
        quickFill += ` && click ${submitButton.ref}`;
      }
    }

    return {
      formRef,
      formId: form.formId,
      fields: mappedFields,
      totalFields,
      filledFields,
      invalidFields,
      submitButton,
      quickFill
    };
  });

  // Format output
  let formatted = '';
  for (const form of analyzedForms) {
    formatted += `Form: ${form.formId} [ref=${form.formRef}]\n`;
    for (const field of form.fields) {
      const status = !field.valid ? '\u274C' : field.value ? '\u2713' : '\u25CB';
      const reqMark = field.required ? ' *' : '';
      const errorMsg = field.error ? ` \u2192 ${field.error}` : '';
      formatted += `\u251C\u2500\u2500 [${field.ref}] ${field.label}${reqMark} = "${field.value}" ${status}${errorMsg}\n`;
    }
    if (form.submitButton) {
      const btnStatus = form.submitButton.enabled ? '\u2713' : '(disabled)';
      formatted += `\u2514\u2500\u2500 Submit: [${form.submitButton.ref}] ${btnStatus}\n`;
    }
    if (form.quickFill) {
      formatted += `QUICK FILL: ${form.quickFill}\n`;
    }
    formatted += '\n';
  }

  return { forms: analyzedForms, formatted };
}
