/**
 * Convex CLI TypeScript API
 *
 * Provides programmatic access to Convex CLI operations with full type safety
 * and runtime validation.
 *
 * @example
 * ```typescript
 * import { ConvexCLI } from './CONVEX-CLI/LIB';
 *
 * const cli = new ConvexCLI();
 *
 * // Get deployment status
 * const status = await cli.status();
 * console.log(`Deployment: ${status.data.deployments[0].url}`);
 *
 * // Query data
 * const users = await cli.queryData('users', { limit: 10 });
 * console.log(`Retrieved ${users.data.count} users`);
 *
 * // Run function
 * const result = await cli.runFunction('users:list', {});
 * console.log('Result:', result.data.result);
 *
 * // Environment variables
 * const envVars = await cli.env.list();
 * console.log(`${envVars.data.count} environment variables`);
 * ```
 *
 * @example Validation
 * ```typescript
 * import { ConvexCLI, ValidationError, StatusResponseSchema } from './CONVEX-CLI/LIB';
 *
 * const cli = new ConvexCLI();
 *
 * try {
 *   const status = await cli.status();
 *   console.log('Valid status response:', status);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.getDetailedMessage());
 *     console.error('Issues:', error.getIssues());
 *   }
 * }
 * ```
 *
 * @module ConvexCLI
 */

export { ConvexCLI } from './client.js';
export * from './types.js';
export * from './schemas.js';
