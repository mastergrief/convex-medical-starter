# TSGO Setup Guide for New Projects

A complete guide to setting up TSGO (TypeScript's native Rust compiler) with Vite + React + Convex.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Vite-based React project
- Convex (optional, for backend)

## Step 1: Install Dependencies

```bash
# Core dependencies
npm install --save-dev \
  @typescript/native-preview@^7.0.0-dev.20250827.1 \
  npm-run-all@^4.1.5

# For Convex projects only
npm install convex@latest
```

## Step 2: Create TypeScript Configuration

### tsconfig.json (Root - Orchestrator)
```json
{
  "compilerOptions": {
    "composite": true,
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.tsbuildinfo",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "exclude": ["convex/_generated", "**/_generated"]
}
```

### tsconfig.app.json (Application Code)
```json
{
  "compilerOptions": {
    "composite": true,
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ESNext",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "forceConsistentCasingInFileNames": true,
    
    /* Paths */
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "convex"],
  "exclude": ["convex/_generated", "**/_generated"]
}
```

### tsconfig.node.json (Build Tools)
```json
{
  "compilerOptions": {
    "composite": true,
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ESNext",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "skipLibCheck": true,
    
    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    
    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "forceConsistentCasingInFileNames": true,
    "jsx": "react-jsx"
  },
  "include": ["vite.config.ts"],
  "exclude": ["convex/_generated", "**/_generated"]
}
```

## Step 3: Configure package.json Scripts

### For Vite + React Only
```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:frontend dev:typecheck",
    "dev:frontend": "vite",
    "dev:typecheck": "tsgo --watch --noEmit --project tsconfig.app.json",
    "build": "npm-run-all build:typecheck build:app",
    "build:typecheck": "tsgo --noEmit --project tsconfig.app.json",
    "build:app": "vite build",
    "typecheck": "tsgo --noEmit --project tsconfig.app.json",
    "preview": "vite preview"
  }
}
```

### For Vite + React + Convex
```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:frontend dev:backend dev:typecheck",
    "dev:frontend": "vite",
    "dev:backend": "convex dev --typecheck=disable",
    "dev:typecheck": "tsgo --watch --noEmit --project tsconfig.app.json",
    "build": "npm-run-all build:typecheck build:app",
    "build:typecheck": "tsgo --noEmit --project tsconfig.app.json",
    "build:app": "vite build",
    "typecheck": "tsgo --noEmit --project tsconfig.app.json",
    "preview": "vite preview",
    
    "convex:deploy": "npm run typecheck && convex deploy --typecheck=disable",
    "convex:deploy:prod": "npm run typecheck && convex deploy --typecheck=disable --prod"
  }
}
```

## Step 4: Convex Configuration (If Using Convex)

### convex/tsconfig.json
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "../node_modules/.tmp/tsconfig.convex.tsbuildinfo",
    "allowJs": true,
    "strict": true,
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    
    /* Required by Convex */
    "target": "ESNext",
    "lib": ["ES2021", "dom"],
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["./**/*"],
  "exclude": ["./_generated"]
}
```

## Step 5: Verify Installation

```bash
# Check TSGO is installed
npx tsgo --version
# Should show: Version 7.0.0-dev.YYYYMMDD.X

# Test type checking
npm run typecheck
# Should complete in <1 second

# Run development mode
npm run dev
# Should start all services in parallel
```

## Step 6: Add Test File to Verify Setup

Create `src/test-tsgo.ts`:
```typescript
// This should trigger a type error
const testString: string = 123; // Error: Type 'number' is not assignable to type 'string'

// This should pass
const correctString: string = "hello";
```

Run `npm run typecheck` - you should see the error reported in <1 second.

## Troubleshooting

### TSGO Command Not Found
```bash
# Reinstall the package
npm uninstall @typescript/native-preview
npm install --save-dev @typescript/native-preview@^7.0.0-dev.20250827.1
```

### Type Checking Not Working
1. Verify `tsconfig.app.json` includes all source directories
2. Check that `--project tsconfig.app.json` is in the command
3. Ensure no syntax errors in tsconfig files

### Convex Still Using Its Own TypeScript
Always use `--typecheck=disable` flag:
```bash
convex dev --typecheck=disable
convex deploy --typecheck=disable
```

### Performance Not Improved
1. Clear build cache: `rm -rf node_modules/.tmp`
2. Ensure you're using `tsgo` not `tsc`
3. Check CPU usage - TSGO should use multiple cores

## Migration from Traditional TSC

### Before (with tsc)
```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc && vite build"
  }
}
```

### After (with tsgo)
```json
{
  "scripts": {
    "typecheck": "tsgo --noEmit --project tsconfig.app.json",
    "build": "npm-run-all build:typecheck build:app",
    "build:typecheck": "tsgo --noEmit --project tsconfig.app.json",
    "build:app": "vite build",
    
    "typecheck:tsc": "tsc --noEmit"  // Keep as fallback
  }
}
```

## Performance Expectations

For a typical React + Convex project:
- **Small (< 100 files)**: 0.2-0.5 seconds
- **Medium (100-500 files)**: 0.5-1.5 seconds  
- **Large (500+ files)**: 1.5-3 seconds

Compare to traditional tsc:
- Usually 3-5x slower than TSGO
- Single-threaded vs multi-threaded

## Platform Support

TSGO provides platform-specific binaries:
- `@typescript/native-preview-linux-x64`
- `@typescript/native-preview-darwin-x64` (Intel Mac)
- `@typescript/native-preview-darwin-arm64` (M1/M2 Mac)
- `@typescript/native-preview-win32-x64` (Windows)

The main package automatically selects the correct binary.

## Summary

This setup provides:
- ⚡ 3-5x faster type checking with TSGO
- 🔄 Parallel development with watch mode
- 🎯 Single type checker for frontend + backend
- ✅ Zero duplicate checking with Convex
- 📦 Incremental builds with caching

Total setup time: ~10 minutes
Performance improvement: 300-500%