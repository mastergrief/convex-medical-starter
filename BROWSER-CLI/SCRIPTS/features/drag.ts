/**
 * Drag and Drop Feature
 * Handles drag-and-drop operations using Chrome DevTools Protocol for reliability with dnd-kit
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { SnapshotFeature, RefData } from './snapshot';

/**
 * DragFeature provides drag-and-drop functionality for ref-based interactions.
 *
 * Uses CDP (Chrome DevTools Protocol) for OS-level mouse events, which provides
 * the most reliable drag behavior with React dnd-kit library.
 *
 * Dependencies:
 * - SnapshotFeature: Required for element ref resolution
 */
export class DragFeature extends BaseFeature {
  public readonly name = 'Drag';
  private snapshotFeature: SnapshotFeature | null = null;

  /**
   * Set the snapshot feature dependency for ref resolution
   */
  setSnapshotFeature(snapshotFeature: SnapshotFeature): void {
    this.snapshotFeature = snapshotFeature;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['dragByRef', this.dragByRef.bind(this)],
      ['dragByCSS', this.dragByCSS.bind(this)],
    ]);
  }

  /**
   * Drag from one element to another by reference using CDP
   */
  async dragByRef(args: {
    sourceRef: string;
    targetRef: string;
  }): Promise<CommandResponse> {
    if (!this.snapshotFeature) {
      return {
        status: 'error',
        message: 'DragFeature requires SnapshotFeature to be set. Call setSnapshotFeature() first.'
      };
    }

    const { sourceRef, targetRef } = args;
    const refMap = this.snapshotFeature.getRefMap();
    const sourceData = refMap.get(sourceRef);
    const targetData = refMap.get(targetRef);

    if (!sourceData) {
      return {
        status: 'error',
        message: `Invalid source ref: ${sourceRef}. Capture a snapshot first to generate refs.`
      };
    }

    if (!targetData) {
      return {
        status: 'error',
        message: `Invalid target ref: ${targetRef}. Capture a snapshot first to generate refs.`
      };
    }

    this.log(`Dragging from ref ${sourceRef} to ${targetRef} using CDP`);

    try {
      return await this.dragByCDP(sourceRef, targetRef, sourceData, targetData);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Drag from one element to another by CSS selector using CDP
   * Use --cdp flag with drag command: drag --cdp '[source-selector]' '[target-selector]'
   */
  async dragByCSS(args: {
    sourceSelector: string;
    targetSelector: string;
  }): Promise<CommandResponse> {
    const { sourceSelector, targetSelector } = args;

    this.log(`Dragging from CSS selector "${sourceSelector}" to "${targetSelector}" using CDP`);

    try {
      return await this.performCDPDragBySelector(sourceSelector, targetSelector);
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * CDP drag using CSS selectors directly (no ref resolution needed)
   * Uses boundingBox to get coordinates and CDP for OS-level events
   */
  private async performCDPDragBySelector(
    sourceSelector: string,
    targetSelector: string
  ): Promise<CommandResponse> {
    this.log('Using CDP raw input with CSS selectors...');

    // Get locators directly from CSS selectors
    const sourceElement = this.page.locator(sourceSelector);
    const targetElement = this.page.locator(targetSelector);

    // Get bounding boxes
    const sourceBox = await sourceElement.boundingBox();
    const targetBox = await targetElement.boundingBox();

    if (!sourceBox) {
      throw new Error(`Source element "${sourceSelector}" not visible or not found`);
    }
    if (!targetBox) {
      throw new Error(`Target element "${targetSelector}" not visible or not found`);
    }

    // Find grip icon coordinates within source element (for workout cards)
    const gripCoords = await this.page.evaluate((box) => {
      // Find elements at source position
      const el = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      if (!el) {
        return { x: box.x + 10, y: box.y + box.height / 2, found: false };
      }

      // Look for grip icon (svg or img) within or near the element
      const parentButton = el.closest('button') || el;
      const gripIcon = parentButton.querySelector('svg') || parentButton.querySelector('img');
      if (gripIcon) {
        const rect = gripIcon.getBoundingClientRect();
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          found: true
        };
      }

      // Fallback to left edge (where grip usually is for workout cards)
      return { x: box.x + 10, y: box.y + box.height / 2, found: false };
    }, sourceBox);

    const targetCenterX = targetBox.x + targetBox.width / 2;
    const targetCenterY = targetBox.y + targetBox.height / 2;

    this.log(`Grip icon ${gripCoords.found ? 'found' : 'not found (using left edge)'} at (${Math.round(gripCoords.x)}, ${Math.round(gripCoords.y)})`);
    this.log(`CDP drag from (${Math.round(gripCoords.x)}, ${Math.round(gripCoords.y)}) to (${Math.round(targetCenterX)}, ${Math.round(targetCenterY)})`);

    // Get CDP session
    const client = await this.page.context().newCDPSession(this.page);

    try {
      // Move to source position (grip icon)
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: gripCoords.x,
        y: gripCoords.y,
        button: 'left',
        clickCount: 0
      });

      await this.page.waitForTimeout(100);

      // Mouse down (press and hold)
      await client.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: gripCoords.x,
        y: gripCoords.y,
        button: 'left',
        clickCount: 1
      });

      await this.page.waitForTimeout(150);

      // Move to target with intermediate steps (20 steps for smooth animation)
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentX = gripCoords.x + (targetCenterX - gripCoords.x) * progress;
        const currentY = gripCoords.y + (targetCenterY - gripCoords.y) * progress;

        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: currentX,
          y: currentY,
          button: 'left',
          clickCount: 0
        });

        await this.page.waitForTimeout(20);
      }

      await this.page.waitForTimeout(100);

      // Mouse up (release)
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: targetCenterX,
        y: targetCenterY,
        button: 'left',
        clickCount: 1
      });

      await this.page.waitForTimeout(200);

      // Detach CDP session
      await client.detach();

      return {
        status: 'ok',
        data: {
          sourceSelector,
          targetSelector,
          method: 'cdp',
          gripFound: gripCoords.found,
          coordinates: {
            from: { x: Math.round(gripCoords.x), y: Math.round(gripCoords.y) },
            to: { x: Math.round(targetCenterX), y: Math.round(targetCenterY) }
          }
        },
        code: `// CDP raw input with CSS selectors\nconst client = await page.context().newCDPSession(page);\nconst sourceBox = await page.locator('${sourceSelector}').boundingBox();\nconst targetBox = await page.locator('${targetSelector}').boundingBox();\nawait client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${Math.round(gripCoords.x)}, y: ${Math.round(gripCoords.y)}, button: 'left' });\n// ... 20 mouseMoved events ...\nawait client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${Math.round(targetCenterX)}, y: ${Math.round(targetCenterY)}, button: 'left' });`
      };
    } catch (error: any) {
      // Ensure we detach even on error
      try {
        await client.detach();
      } catch {}
      throw error;
    }
  }

  /**
   * CDP Raw Input: Use Chrome DevTools Protocol to inject real OS-level mouse events
   *
   * This is the most reliable method for dragging with dnd-kit because:
   * - Generates real OS-level mouse events (not synthetic)
   * - Properly activates dnd-kit PointerSensor
   * - Handles all phases: mousePressed → mouseMoved → mouseReleased
   */
  private async dragByCDP(
    sourceRef: string,
    targetRef: string,
    sourceData: RefData,
    targetData: RefData
  ): Promise<CommandResponse> {
    this.log('Using CDP raw input for real OS-level events...');

    // Helper function to get locator from RefData - now uses CSS selectors for unnamed elements
    const getLocator = (refData: RefData, ref: string) => {
      // Priority 1: Use name if available (most reliable)
      if (refData.name) {
        this.log(`Using role-based locator for ${ref}: ${refData.role} "${refData.name}"`);
        return this.page.getByRole(refData.role as any, { name: refData.name });
      }
      
      // Priority 2: Use CSS selector (captured during snapshot)
      if (refData.cssSelector) {
        this.log(`Using CSS selector for ${ref}: ${refData.cssSelector}`);
        return this.page.locator(refData.cssSelector);
      }
      
      // Priority 3: Fallback to roleIndex (last resort)
      this.log(`Using roleIndex fallback for ${ref}: ${refData.role}.nth(${refData.roleIndex})`);
      return this.page.getByRole(refData.role as any).nth(refData.roleIndex);
    };

    const sourceElement = getLocator(sourceData, sourceRef);
    const targetElement = getLocator(targetData, targetRef);

    // Get bounding boxes
    const sourceBox = await sourceElement.boundingBox();
    const targetBox = await targetElement.boundingBox();

    if (!sourceBox) {
      throw new Error(`Source element ${sourceRef} not visible`);
    }
    if (!targetBox) {
      throw new Error(`Target element ${targetRef} not visible`);
    }

    // Find grip icon coordinates within source element
    const gripCoords = await this.page.evaluate((box) => {
      // Find the button element containing the workout
      const buttons = Array.from(document.querySelectorAll('button'));
      const workoutButton = buttons.find(btn => {
        const rect = btn.getBoundingClientRect();
        return Math.abs(rect.x - box.x) < 5 && Math.abs(rect.y - box.y) < 5;
      });

      if (!workoutButton) {
        return { x: box.x + 10, y: box.y + box.height / 2, found: false };
      }

      // Find grip icon (svg or img) within button
      const gripIcon = workoutButton.querySelector('svg') || workoutButton.querySelector('img');
      if (gripIcon) {
        const rect = gripIcon.getBoundingClientRect();
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          found: true
        };
      }

      // Fallback to left edge of button (where grip usually is)
      return { x: box.x + 10, y: box.y + box.height / 2, found: false };
    }, sourceBox);

    const targetCenterX = targetBox.x + targetBox.width / 2;
    const targetCenterY = targetBox.y + targetBox.height / 2;

    this.log(`Grip icon ${gripCoords.found ? 'found' : 'not found (using left edge)'} at (${Math.round(gripCoords.x)}, ${Math.round(gripCoords.y)})`);
    this.log(`CDP drag from (${Math.round(gripCoords.x)}, ${Math.round(gripCoords.y)}) to (${Math.round(targetCenterX)}, ${Math.round(targetCenterY)})`);

    // Get CDP session
    const client = await this.page.context().newCDPSession(this.page);

    try {
      // Move to source position (grip icon)
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseMoved',
        x: gripCoords.x,
        y: gripCoords.y,
        button: 'left',
        clickCount: 0
      });

      await this.page.waitForTimeout(100);

      // Mouse down (press and hold on grip icon)
      await client.send('Input.dispatchMouseEvent', {
        type: 'mousePressed',
        x: gripCoords.x,
        y: gripCoords.y,
        button: 'left',
        clickCount: 1
      });

      await this.page.waitForTimeout(150);

      // Move to target with intermediate steps
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        const currentX = gripCoords.x + (targetCenterX - gripCoords.x) * progress;
        const currentY = gripCoords.y + (targetCenterY - gripCoords.y) * progress;

        await client.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: currentX,
          y: currentY,
          button: 'left',
          clickCount: 0
        });

        await this.page.waitForTimeout(20);
      }

      await this.page.waitForTimeout(100);

      // Mouse up (release)
      await client.send('Input.dispatchMouseEvent', {
        type: 'mouseReleased',
        x: targetCenterX,
        y: targetCenterY,
        button: 'left',
        clickCount: 1
      });

      await this.page.waitForTimeout(200);

      // Detach CDP session
      await client.detach();

      const sourceSelector = sourceData.cssSelector || sourceData.roleSelector;
      const targetSelector = targetData.cssSelector || targetData.roleSelector;

      return {
        status: 'ok',
        data: {
          sourceRef,
          targetRef,
          sourceSelector,
          targetSelector,
          method: 'cdp',
          gripFound: gripCoords.found,
          coordinates: {
            from: { x: Math.round(gripCoords.x), y: Math.round(gripCoords.y) },
            to: { x: Math.round(targetCenterX), y: Math.round(targetCenterY) }
          }
        },
        code: `// CDP raw input with grip detection\nconst client = await page.context().newCDPSession(page);\nawait client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: ${Math.round(gripCoords.x)}, y: ${Math.round(gripCoords.y)}, button: 'left' });\n// ... mouseMoved events ...\nawait client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: ${Math.round(targetCenterX)}, y: ${Math.round(targetCenterY)}, button: 'left' });`
      };
    } catch (error: any) {
      // Ensure we detach even on error
      try {
        await client.detach();
      } catch {}
      throw error;
    }
  }
}
