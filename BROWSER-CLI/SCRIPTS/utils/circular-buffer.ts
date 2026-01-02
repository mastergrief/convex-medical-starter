/**
 * Generic CircularBuffer with O(1) insert/remove operations.
 * Uses fixed-size array with head/tail pointers for efficient memory usage.
 */
export class CircularBuffer<T> {
  private _buffer: (T | undefined)[];
  private _head: number = 0; // Read position (oldest item)
  private _tail: number = 0; // Write position (next insert)
  private _size: number = 0;
  private _capacity: number;
  private _overflowCount: number = 0;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be greater than 0');
    }
    this._capacity = capacity;
    this._buffer = new Array(capacity);
  }

  /**
   * Current number of items in the buffer.
   */
  get size(): number {
    return this._size;
  }

  /**
   * Maximum number of items the buffer can hold.
   */
  get capacity(): number {
    return this._capacity;
  }

  /**
   * Number of items that were overwritten due to overflow.
   */
  get overflowCount(): number {
    return this._overflowCount;
  }

  /**
   * O(1) push operation. Overwrites oldest item on overflow.
   */
  push(item: T): void {
    if (this._size === this._capacity) {
      // Buffer is full, overwrite oldest
      this._overflowCount++;
      this._head = (this._head + 1) % this._capacity;
    } else {
      this._size++;
    }

    this._buffer[this._tail] = item;
    this._tail = (this._tail + 1) % this._capacity;
  }

  /**
   * O(n) conversion to array, returning items in order (oldest to newest).
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      const index = (this._head + i) % this._capacity;
      result.push(this._buffer[index] as T);
    }
    return result;
  }

  /**
   * O(1) clear operation, resets all pointers and overflow count.
   */
  clear(): void {
    this._head = 0;
    this._tail = 0;
    this._size = 0;
    this._overflowCount = 0;
    this._buffer = new Array(this._capacity);
  }

  /**
   * Resize the buffer capacity at runtime.
   * Preserves existing items up to the new capacity (oldest items discarded if shrinking).
   */
  setCapacity(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('Capacity must be greater than 0');
    }

    const items = this.toArray();
    this._capacity = newCapacity;
    this._buffer = new Array(newCapacity);
    this._head = 0;
    this._tail = 0;
    this._size = 0;

    // If shrinking, discard oldest items
    const startIndex = Math.max(0, items.length - newCapacity);
    for (let i = startIndex; i < items.length; i++) {
      this.push(items[i]);
    }

    // Reset overflow count since we've restructured
    this._overflowCount = 0;
  }

  /**
   * O(1) peek at the oldest item without removing it.
   * Returns undefined if buffer is empty.
   */
  peek(): T | undefined {
    if (this._size === 0) {
      return undefined;
    }
    return this._buffer[this._head];
  }

  /**
   * O(1) peek at the newest item without removing it.
   * Returns undefined if buffer is empty.
   */
  peekLast(): T | undefined {
    if (this._size === 0) {
      return undefined;
    }
    const lastIndex = (this._tail - 1 + this._capacity) % this._capacity;
    return this._buffer[lastIndex];
  }

  /**
   * O(count) slice returning the last `count` items (newest items).
   */
  slice(count: number): T[] {
    if (count <= 0 || this._size === 0) {
      return [];
    }

    const actualCount = Math.min(count, this._size);
    const result: T[] = [];
    const startOffset = this._size - actualCount;

    for (let i = 0; i < actualCount; i++) {
      const index = (this._head + startOffset + i) % this._capacity;
      result.push(this._buffer[index] as T);
    }

    return result;
  }

  /**
   * O(n) find the first item matching the predicate.
   * Returns undefined if no match found.
   */
  find(predicate: (item: T) => boolean): T | undefined {
    for (let i = 0; i < this._size; i++) {
      const index = (this._head + i) % this._capacity;
      const item = this._buffer[index] as T;
      if (predicate(item)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * O(n) filter returning all items matching the predicate.
   */
  filter(predicate: (item: T) => boolean): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      const index = (this._head + i) % this._capacity;
      const item = this._buffer[index] as T;
      if (predicate(item)) {
        result.push(item);
      }
    }
    return result;
  }
}
