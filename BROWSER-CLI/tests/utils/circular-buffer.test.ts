import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../../SCRIPTS/utils/circular-buffer';

describe('CircularBuffer', () => {
  describe('Basic operations', () => {
    it('should push items and return them in correct order via toArray', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should track size correctly', () => {
      const buffer = new CircularBuffer<string>(10);
      expect(buffer.size).toBe(0);

      buffer.push('a');
      expect(buffer.size).toBe(1);

      buffer.push('b');
      buffer.push('c');
      expect(buffer.size).toBe(3);
    });

    it('should return correct capacity', () => {
      const buffer = new CircularBuffer<number>(100);
      expect(buffer.capacity).toBe(100);
    });

    it('should throw on invalid capacity (<=0)', () => {
      expect(() => new CircularBuffer<number>(0)).toThrow('Capacity must be greater than 0');
      expect(() => new CircularBuffer<number>(-1)).toThrow('Capacity must be greater than 0');
      expect(() => new CircularBuffer<number>(-100)).toThrow('Capacity must be greater than 0');
    });
  });

  describe('Overflow behavior', () => {
    it('should overwrite oldest items when pushing beyond capacity', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1

      expect(buffer.toArray()).toEqual([2, 3, 4]);
      expect(buffer.size).toBe(3);
    });

    it('should increment overflowCount correctly', () => {
      const buffer = new CircularBuffer<number>(2);
      expect(buffer.overflowCount).toBe(0);

      buffer.push(1);
      buffer.push(2);
      expect(buffer.overflowCount).toBe(0);

      buffer.push(3); // First overflow
      expect(buffer.overflowCount).toBe(1);

      buffer.push(4); // Second overflow
      expect(buffer.overflowCount).toBe(2);

      buffer.push(5); // Third overflow
      expect(buffer.overflowCount).toBe(3);
    });

    it('should return correct order after multiple overflows', () => {
      const buffer = new CircularBuffer<number>(3);
      // Push 1-7, capacity is 3
      for (let i = 1; i <= 7; i++) {
        buffer.push(i);
      }

      expect(buffer.toArray()).toEqual([5, 6, 7]);
      expect(buffer.overflowCount).toBe(4);
    });
  });

  describe('clear()', () => {
    it('should reset size to 0', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.clear();
      expect(buffer.size).toBe(0);
    });

    it('should reset overflowCount to 0', () => {
      const buffer = new CircularBuffer<number>(2);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.overflowCount).toBe(1);

      buffer.clear();
      expect(buffer.overflowCount).toBe(0);
    });

    it('should return empty array after clear', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);

      buffer.clear();
      expect(buffer.toArray()).toEqual([]);
    });
  });

  describe('setCapacity()', () => {
    it('should preserve all items when growing capacity', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.setCapacity(5);
      expect(buffer.capacity).toBe(5);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
      expect(buffer.size).toBe(3);
    });

    it('should preserve newest items when shrinking capacity', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      buffer.setCapacity(3);
      expect(buffer.capacity).toBe(3);
      expect(buffer.toArray()).toEqual([3, 4, 5]); // Keeps newest 3
      expect(buffer.size).toBe(3);
    });

    it('should throw on invalid capacity (<=0)', () => {
      const buffer = new CircularBuffer<number>(5);
      expect(() => buffer.setCapacity(0)).toThrow('Capacity must be greater than 0');
      expect(() => buffer.setCapacity(-1)).toThrow('Capacity must be greater than 0');
    });

    it('should reset overflowCount after setCapacity', () => {
      const buffer = new CircularBuffer<number>(2);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.overflowCount).toBe(1);

      buffer.setCapacity(5);
      expect(buffer.overflowCount).toBe(0);
    });
  });

  describe('peek() and peekLast()', () => {
    it('should return undefined on empty buffer for peek', () => {
      const buffer = new CircularBuffer<number>(5);
      expect(buffer.peek()).toBeUndefined();
    });

    it('should return undefined on empty buffer for peekLast', () => {
      const buffer = new CircularBuffer<number>(5);
      expect(buffer.peekLast()).toBeUndefined();
    });

    it('should return oldest item with peek', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      expect(buffer.peek()).toBe(10);
    });

    it('should return newest item with peekLast', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      expect(buffer.peekLast()).toBe(30);
    });

    it('should return correct items after overflow', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1

      expect(buffer.peek()).toBe(2); // Oldest
      expect(buffer.peekLast()).toBe(4); // Newest
    });
  });

  describe('slice(count)', () => {
    it('should return last N items (newest)', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.slice(2)).toEqual([4, 5]);
      expect(buffer.slice(3)).toEqual([3, 4, 5]);
    });

    it('should handle count > size', () => {
      const buffer = new CircularBuffer<number>(10);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.slice(10)).toEqual([1, 2, 3]);
    });

    it('should handle count = 0', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);

      expect(buffer.slice(0)).toEqual([]);
    });

    it('should handle negative count', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);

      expect(buffer.slice(-1)).toEqual([]);
    });

    it('should return empty array on empty buffer', () => {
      const buffer = new CircularBuffer<number>(5);
      expect(buffer.slice(3)).toEqual([]);
    });

    it('should work correctly after overflow', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.slice(2)).toEqual([4, 5]);
    });
  });

  describe('find() and filter()', () => {
    it('should return first match with find', () => {
      const buffer = new CircularBuffer<{ id: number; name: string }>(5);
      buffer.push({ id: 1, name: 'a' });
      buffer.push({ id: 2, name: 'b' });
      buffer.push({ id: 3, name: 'b' });

      const result = buffer.find((item) => item.name === 'b');
      expect(result).toEqual({ id: 2, name: 'b' });
    });

    it('should return undefined if not found with find', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.find((n) => n > 10)).toBeUndefined();
    });

    it('should return all matches with filter', () => {
      const buffer = new CircularBuffer<number>(10);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      const evens = buffer.filter((n) => n % 2 === 0);
      expect(evens).toEqual([2, 4]);
    });

    it('should return empty array if none match with filter', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(3);
      buffer.push(5);

      const evens = buffer.filter((n) => n % 2 === 0);
      expect(evens).toEqual([]);
    });

    it('should work correctly after overflow', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);

      expect(buffer.find((n) => n === 3)).toBe(3);
      expect(buffer.find((n) => n === 1)).toBeUndefined(); // 1 was overwritten
      expect(buffer.filter((n) => n > 3)).toEqual([4, 5]);
    });
  });

  describe('Edge cases', () => {
    it('should handle single item buffer', () => {
      const buffer = new CircularBuffer<string>(1);
      buffer.push('a');

      expect(buffer.size).toBe(1);
      expect(buffer.toArray()).toEqual(['a']);
      expect(buffer.peek()).toBe('a');
      expect(buffer.peekLast()).toBe('a');
    });

    it('should handle single item buffer with overflow', () => {
      const buffer = new CircularBuffer<string>(1);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.size).toBe(1);
      expect(buffer.toArray()).toEqual(['c']);
      expect(buffer.overflowCount).toBe(2);
    });

    it('should handle push immediately after clear', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.clear();
      buffer.push(100);

      expect(buffer.size).toBe(1);
      expect(buffer.toArray()).toEqual([100]);
      expect(buffer.peek()).toBe(100);
      expect(buffer.peekLast()).toBe(100);
    });

    it('should handle capacity = 1 behavior correctly', () => {
      const buffer = new CircularBuffer<number>(1);

      buffer.push(1);
      expect(buffer.toArray()).toEqual([1]);

      buffer.push(2);
      expect(buffer.toArray()).toEqual([2]);
      expect(buffer.overflowCount).toBe(1);

      buffer.clear();
      expect(buffer.size).toBe(0);
      expect(buffer.overflowCount).toBe(0);

      buffer.push(3);
      expect(buffer.toArray()).toEqual([3]);
    });

    it('should handle setCapacity to 1 from larger buffer', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      buffer.setCapacity(1);
      expect(buffer.capacity).toBe(1);
      expect(buffer.toArray()).toEqual([3]); // Only newest preserved
    });

    it('should handle complex type objects', () => {
      interface TestObj {
        id: number;
        data: { nested: string };
      }

      const buffer = new CircularBuffer<TestObj>(3);
      buffer.push({ id: 1, data: { nested: 'first' } });
      buffer.push({ id: 2, data: { nested: 'second' } });

      const found = buffer.find((item) => item.data.nested === 'second');
      expect(found?.id).toBe(2);
    });
  });

  describe('Performance', () => {
    it('should handle 100k inserts in reasonable time', () => {
      const buffer = new CircularBuffer<number>(1000);
      const startTime = Date.now();

      for (let i = 0; i < 100000; i++) {
        buffer.push(i);
      }

      const duration = Date.now() - startTime;

      // Should complete in under 1 second (typically < 50ms)
      expect(duration).toBeLessThan(1000);
      expect(buffer.size).toBe(1000);
      expect(buffer.overflowCount).toBe(99000);

      // Verify last items are correct
      const last = buffer.slice(5);
      expect(last).toEqual([99995, 99996, 99997, 99998, 99999]);
    });

    it('should handle rapid clear and refill cycles', () => {
      const buffer = new CircularBuffer<number>(100);
      const startTime = Date.now();

      for (let cycle = 0; cycle < 1000; cycle++) {
        for (let i = 0; i < 100; i++) {
          buffer.push(i);
        }
        buffer.clear();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
      expect(buffer.size).toBe(0);
    });
  });
});
