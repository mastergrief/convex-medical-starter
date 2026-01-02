#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

interface TemplateVariables {
  [key: string]: string;
}

async function runTemplate(templateName: string, variables: TemplateVariables): Promise<void> {
  const templatePath = path.join('BROWSER-CLI', 'templates', `${templateName}.txt`);

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Template not found: ${templateName}`);
    console.error(`   Expected path: ${templatePath}`);
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf-8');

  // Replace variables
  let commands = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    commands = commands.replace(regex, value);
  });

  // Check for unreplaced variables
  const unreplaced = commands.match(/{{[A-Z_]+}}/g);
  if (unreplaced) {
    console.error(`❌ Missing required variables: ${unreplaced.join(', ')}`);
    process.exit(1);
  }

  // Execute commands line by line
  const lines = commands.split('\n').filter(line =>
    line.trim() && !line.trim().startsWith('#')
  );

  console.log(`\n🚀 Running template: ${templateName}`);
  console.log(`📋 Total commands: ${lines.length}\n`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`\n[${i + 1}/${lines.length}] >>> ${line}`);

    try {
      await new Promise<void>((resolve, reject) => {
        // Parse command line respecting quotes
        const args: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if ((char === '"' || char === "'") && (i === 0 || line[i-1] !== '\\')) {
            if (!inQuotes) {
              inQuotes = true;
              quoteChar = char;
            } else if (char === quoteChar) {
              inQuotes = false;
              quoteChar = '';
            } else {
              current += char;
            }
          } else if (char === ' ' && !inQuotes) {
            if (current) {
              args.push(current);
              current = '';
            }
          } else {
            current += char;
          }
        }

        if (current) {
          args.push(current);
        }

        const proc = spawn('npx', ['tsx', 'BROWSER-CLI/SCRIPTS/browser-cmd.ts', ...args], {
          stdio: 'inherit'
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Command failed with code ${code}`));
          }
        });
      });
    } catch (error: any) {
      console.error(`\n❌ Command failed: ${line}`);
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }
  }

  console.log('\n✅ Template execution completed successfully\n');
}

// CLI arg parsing
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx BROWSER-CLI/SCRIPTS/template-runner.ts <template-name> [--var=value ...]');
  console.error('\nGeneric Templates (reusable across apps):');
  console.error('  - generic/login-flow        - Universal authentication');
  console.error('  - generic/modal-workflow    - Modal interaction testing');
  console.error('  - generic/form-validation   - Form validation errors');
  console.error('  - generic/crud-create       - Create entity workflow');
  console.error('  - generic/crud-update       - Update entity workflow');
  console.error('  - generic/crud-delete       - Delete entity workflow');
  console.error('\nZenith-Specific Templates:');
  console.error('  - zenith/auth-flow          - Save authenticated state');
  console.error('  - zenith/modal-test         - Workout modal testing');
  console.error('  - zenith/form-validation    - Zenith form testing');
  console.error('\nExample (generic):');
  console.error('  npx tsx BROWSER-CLI/SCRIPTS/template-runner.ts generic/login-flow \\');
  console.error('    --base_url=http://localhost:5173 \\');
  console.error('    --login_trigger=click \\');
  console.error('    --login_path="role:button:Sign In" \\');
  console.error('    --email_field="label:Email" \\');
  console.error('    --password_field="label:Password" \\');
  console.error('    --email=coach@test.com \\');
  console.error('    --password=password123 \\');
  console.error('    --submit_button="role:button:Sign In" \\');
  console.error('    --success_wait=3000 \\');
  console.error('    --state_name=authenticated');
  console.error('\nExample (Zenith-specific):');
  console.error('  npx tsx BROWSER-CLI/SCRIPTS/template-runner.ts zenith/auth-flow \\');
  console.error('    --base_url=http://localhost:5173 \\');
  console.error('    --role=coach');
  process.exit(1);
}

const templateName = args[0];
const variables: TemplateVariables = {};

args.slice(1).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, ...valueParts] = arg.substring(2).split('=');
    const value = valueParts.join('='); // Handle values with = in them
    variables[key.toUpperCase()] = value;
  }
});

runTemplate(templateName, variables);
