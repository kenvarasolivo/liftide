import { emptyData, parseTraining, STORAGE_KEY, type TrainingData } from './machine-training';

export type SyncStatus = 'preview' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';
export type TrainingSnapshot = { data: TrainingData; loaded: boolean; canSave: boolean; pending: boolean; status: SyncStatus; message: string };
export type TrainingRemote = { load(): Promise<{ data: unknown; revision: number } | null>; save(data: TrainingData, revision: number): Promise<number> };
type Change = { id: string; apply: (data: TrainingData) => TrainingData; resolve: (saved: boolean) => void };
const persistent = (data: TrainingData): TrainingData => ({ ...data, selectedId: null, drafts: {} });

// The database is the only durable training store. UI drafts and unacknowledged
// changes exist in memory only. Revision retries replay changes, never stale records.
export class TrainingSync {
  snapshot: TrainingSnapshot = { data: structuredClone(emptyData), loaded: false, canSave: false, pending: false, status: 'loading', message: '' };
  private committed = structuredClone(emptyData);
  private selectedId: string | null = null;
  private drafts: TrainingData['drafts'] = {};
  private changes: Change[] = [];
  private running: Promise<void> | null = null;
  private disposed = false;
  constructor(private remote: TrainingRemote | null, private emit: (snapshot: TrainingSnapshot) => void) {}

  private publish(update: Partial<TrainingSnapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...update };
    this.emit(this.snapshot);
  }
  private view(data: TrainingData) { return { ...data, selectedId: this.selectedId, drafts: this.drafts }; }
  private acknowledge(data: TrainingData) {
    const receipts = new Set(data.appliedChanges ?? []);
    this.changes = this.changes.filter(change => {
      if (!receipts.has(change.id)) return true;
      change.resolve(true);
      return false;
    });
  }
  private optimistic() {
    return this.view(this.changes.reduce((data, change) => persistent(change.apply(this.view(data))), this.committed));
  }
  async start() {
    if (!this.remote) {
      this.publish({ loaded: true, status: 'preview' });
      return;
    }
    await this.sync();
  }
  update(updater: TrainingData | ((data: TrainingData) => TrainingData)): Promise<boolean> {
    if (!this.snapshot.loaded || this.disposed) return Promise.resolve(false);
    const apply = typeof updater === 'function' ? updater : () => updater;
    const next = apply(this.snapshot.data);
    this.selectedId = next.selectedId;
    this.drafts = next.drafts;
    if (!this.remote) {
      this.publish({ data: this.view(this.committed) });
      return Promise.resolve(false);
    }
    if (JSON.stringify(persistent(next)) === JSON.stringify(persistent(this.snapshot.data))) {
      this.publish({ data: this.view(this.snapshot.data) });
      return this.changes.length ? this.sync().then(() => !this.snapshot.pending && this.snapshot.canSave) : Promise.resolve(true);
    }
    if (!this.snapshot.canSave) return Promise.resolve(false);
    const result = new Promise<boolean>(resolve => this.changes.push({ id: crypto.randomUUID(), apply, resolve }));
    this.publish({ data: next, pending: true, status: 'syncing', message: '' });
    void this.sync();
    return result.then(async saved => { await this.running; return saved; });
  }
  sync(): Promise<void> {
    if (!this.remote || this.disposed) return Promise.resolve();
    if (this.running) return this.running;
    // Defer the work by one microtask so every caller shares the running promise.
    this.running = Promise.resolve().then(() => this.flush()).finally(() => { this.running = null; });
    return this.running;
  }
  private async flush() {
    if (!this.remote) return;
    try {
      let conflicts = 0;
      // Refresh even when idle, so another device's confirmed changes appear here.
      let row = await this.remote.load();
      if (this.disposed) return;
      this.committed = row ? parseTraining(row.data) : structuredClone(emptyData);
      this.acknowledge(this.committed);
      while (this.changes.length && !this.disposed) {
        const batch = this.changes.slice(0, 128);
        let next = batch.reduce((data, change) => persistent(change.apply(this.view(data))), this.committed);
        next = { ...next, appliedChanges: [...(this.committed.appliedChanges ?? []), ...batch.map(change => change.id)].slice(-256) };
        this.publish({ data: this.view(next), loaded: true, pending: true, status: 'syncing', message: '' });
        const revision = await this.remote.save(next, row?.revision ?? 0);
        if (this.disposed) return;
        if (!revision) {
          if (++conflicts >= 5) throw new Error('Concurrent updates');
          row = await this.remote.load();
          if (this.disposed) return;
          this.committed = row ? parseTraining(row.data) : structuredClone(emptyData);
          this.acknowledge(this.committed);
          continue;
        }
        conflicts = 0;
        this.committed = next;
        row = { data: next, revision };
        this.acknowledge(next);
        this.publish({ data: this.optimistic(), pending: this.changes.length > 0 });
      }
      this.publish({ data: this.view(this.committed), loaded: true, pending: false, canSave: true, status: 'synced', message: '' });
    } catch {
      if (this.disposed) return;
      // Never claim an unacknowledged write is saved or persist it on the device.
      for (const change of this.changes) change.resolve(false);
      this.publish({ loaded: true, canSave: false, pending: this.changes.length > 0, status: 'offline', message: this.changes.length
        ? 'Not saved to the database yet. Keep this page open and reconnect; saving will retry automatically.'
        : 'Connect to the internet to load your training and save sets to the database.' });
    }
  }
  dispose() { this.disposed = true; for (const change of this.changes) change.resolve(false); }
}

// Only used to locate old records for legacy recovery and export.
export const trainingKey = (userId: string | null) => userId ? `${STORAGE_KEY}:account:${userId}` : STORAGE_KEY;
