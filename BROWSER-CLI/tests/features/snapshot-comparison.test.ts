/**
 * SnapshotComparisonFeature Unit Tests
 * Tests snapshot baseline management and comparison functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { SnapshotComparisonFeature } from '../../SCRIPTS/features/snapshot-comparison';
import { Page } from 'playwright';

describe('SnapshotComparisonFeature', () => {
  let mockPage: MockPage;
  let feature: SnapshotComparisonFeature;

  beforeEach(() => {
    mockPage = createMockPage();
    feature = new SnapshotComparisonFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 3 handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(3);
      expect(handlers.has('saveSnapshotBaseline')).toBe(true);
      expect(handlers.has('compareSnapshots')).toBe(true);
      expect(handlers.has('listBaselines')).toBe(true);
    });
  });

  describe('saveSnapshotBaseline', () => {
    it('saves baseline with valid name', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');

      const result = await saveHandler!({
        name: 'login-page',
        snapshot: '- button "Submit" [ref=e1]\n- textbox "Email" [ref=e2]'
      });

      expect(result.status).toBe('ok');
      expect(result.data).toEqual({ name: 'login-page' });
    });

    it('overwrites existing baseline with same name', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');

      // Save initial baseline
      await saveHandler!({
        name: 'test-baseline',
        snapshot: 'initial snapshot content'
      });

      // Overwrite with new content
      const result = await saveHandler!({
        name: 'test-baseline',
        snapshot: 'updated snapshot content'
      });

      expect(result.status).toBe('ok');
      expect(result.data).toEqual({ name: 'test-baseline' });

      // Verify overwrite by comparing
      const compareHandler = handlers.get('compareSnapshots');
      const compareResult = await compareHandler!({
        name: 'test-baseline',
        snapshot: 'updated snapshot content'
      });

      expect(compareResult.status).toBe('ok');
      expect(compareResult.data?.added).toEqual([]);
      expect(compareResult.data?.removed).toEqual([]);
      expect(compareResult.data?.changed).toEqual([]);
    });
  });

  describe('compareSnapshots', () => {
    it('returns error if baseline not found', async () => {
      const handlers = feature.getCommandHandlers();
      const compareHandler = handlers.get('compareSnapshots');

      const result = await compareHandler!({
        name: 'nonexistent-baseline',
        snapshot: '- button "Submit"'
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('No baseline snapshot found with name: nonexistent-baseline');
    });

    it('detects identical snapshots', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');
      const compareHandler = handlers.get('compareSnapshots');

      const snapshot = '- button "Submit" [ref=e1]\n- textbox "Email" [ref=e2]';

      // Save baseline
      await saveHandler!({ name: 'identical-test', snapshot });

      // Compare with identical snapshot
      const result = await compareHandler!({ name: 'identical-test', snapshot });

      expect(result.status).toBe('ok');
      expect(result.data?.added).toEqual([]);
      expect(result.data?.removed).toEqual([]);
      expect(result.data?.changed).toEqual([]);
    });

    it('detects identical snapshots with different refs', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');
      const compareHandler = handlers.get('compareSnapshots');

      const baselineSnapshot = '- button "Submit" [ref=e1]\n- textbox "Email" [ref=e2]';
      const currentSnapshot = '- button "Submit" [ref=e5]\n- textbox "Email" [ref=e6]';

      // Save baseline
      await saveHandler!({ name: 'ref-diff-test', snapshot: baselineSnapshot });

      // Compare - refs should be ignored
      const result = await compareHandler!({ name: 'ref-diff-test', snapshot: currentSnapshot });

      expect(result.status).toBe('ok');
      expect(result.data?.added).toEqual([]);
      expect(result.data?.removed).toEqual([]);
      expect(result.data?.changed).toEqual([]);
    });

    it('detects added lines', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');
      const compareHandler = handlers.get('compareSnapshots');

      const baselineSnapshot = '- button "Submit" [ref=e1]';
      const currentSnapshot = '- button "Submit" [ref=e1]\n- button "Cancel" [ref=e2]';

      await saveHandler!({ name: 'added-test', snapshot: baselineSnapshot });

      const result = await compareHandler!({ name: 'added-test', snapshot: currentSnapshot });

      expect(result.status).toBe('ok');
      expect(result.data?.added).toContain('- button "Cancel" [ref=e2]');
      expect(result.data?.removed).toEqual([]);
    });

    it('detects removed lines', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');
      const compareHandler = handlers.get('compareSnapshots');

      const baselineSnapshot = '- button "Submit" [ref=e1]\n- button "Cancel" [ref=e2]';
      const currentSnapshot = '- button "Submit" [ref=e1]';

      await saveHandler!({ name: 'removed-test', snapshot: baselineSnapshot });

      const result = await compareHandler!({ name: 'removed-test', snapshot: currentSnapshot });

      expect(result.status).toBe('ok');
      expect(result.data?.removed).toContain('- button "Cancel" [ref=e2]');
      expect(result.data?.added).toEqual([]);
    });

    it('detects changed lines', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');
      const compareHandler = handlers.get('compareSnapshots');

      const baselineSnapshot = '- button "Submit" [ref=e1]';
      const currentSnapshot = '- button "Save" [ref=e1]';

      await saveHandler!({ name: 'changed-test', snapshot: baselineSnapshot });

      const result = await compareHandler!({ name: 'changed-test', snapshot: currentSnapshot });

      expect(result.status).toBe('ok');
      expect(result.data?.changed.length).toBeGreaterThan(0);
      expect(result.data?.changed[0]).toContain('Submit');
      expect(result.data?.changed[0]).toContain('Save');
    });
  });

  describe('listBaselines', () => {
    it('returns empty array when no baselines', async () => {
      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listBaselines');

      const result = await listHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.baselines).toEqual([]);
    });

    it('returns list of saved baselines', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveSnapshotBaseline');
      const listHandler = handlers.get('listBaselines');

      // Save multiple baselines
      await saveHandler!({ name: 'baseline-1', snapshot: 'content 1' });
      await saveHandler!({ name: 'baseline-2', snapshot: 'content 2' });
      await saveHandler!({ name: 'baseline-3', snapshot: 'content 3' });

      const result = await listHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.baselines).toHaveLength(3);
      expect(result.data?.baselines).toContain('baseline-1');
      expect(result.data?.baselines).toContain('baseline-2');
      expect(result.data?.baselines).toContain('baseline-3');
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('SnapshotComparison');
    });
  });
});
