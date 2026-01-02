import { randomUUID } from 'crypto';

export interface RefLifecycle {
  snapshotId: string;
  generatedAt: number;
  cssValidated: boolean;
}

export interface RefValidation {
  fresh: boolean;
  age: number;
  snapshotId: string;
  warning?: string;
}

export class RefVersionManager {
  private currentSnapshotId: string = '';
  private snapshotTimestamp: number = 0;

  generateSnapshotId(): string {
    this.currentSnapshotId = randomUUID().slice(0, 8);
    this.snapshotTimestamp = Date.now();
    return this.currentSnapshotId;
  }

  getSnapshotId(): string {
    return this.currentSnapshotId;
  }

  getSnapshotAge(): number {
    return Date.now() - this.snapshotTimestamp;
  }

  markSnapshotTaken(): void {
    this.generateSnapshotId();
  }

  validateRefFreshness(maxAge: number = 30000): RefValidation {
    const age = this.getSnapshotAge();
    const fresh = age < maxAge;
    return {
      fresh,
      age,
      snapshotId: this.currentSnapshotId,
      warning: fresh ? undefined :
        `Stale ref warning: snapshot ${this.currentSnapshotId} is ${Math.round(age/1000)}s old (TTL: ${maxAge/1000}s). Take a fresh snapshot.`
    };
  }

  isRefFromCurrentSnapshot(refSnapshotId: string): boolean {
    return refSnapshotId === this.currentSnapshotId;
  }
}
