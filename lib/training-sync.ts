import { emptyData, parseTraining, STORAGE_KEY, type TrainingData } from './machine-training';

export type SyncStatus = 'device' | 'loading' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'error';
export type TrainingSnapshot = { data: TrainingData; loaded: boolean; canSave: boolean; status: SyncStatus; message: string };
type Cache = { data: TrainingData; revision: number; dirty: boolean };
class CacheError extends Error {}
export type TrainingRemote = { load(): Promise<{ data: unknown; revision: number } | null>; save(data: TrainingData, revision: number): Promise<number> };

// The controller owns one user scope for its lifetime. It never copies guest
// data into an account, and acknowledges only the exact snapshot sent remotely.
export class TrainingSync {
  snapshot: TrainingSnapshot = { data: emptyData, loaded: false, canSave: true, status: 'loading', message: '' };
  private cache: Cache = { data: emptyData, revision: 0, dirty: false };
  private connected = false;
  private running = false;
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor(private key: string, private storage: Pick<Storage, 'getItem' | 'setItem'>, private guestLoad: () => TrainingData, private remote: TrainingRemote | null, private emit: (snapshot: TrainingSnapshot) => void) {}

  private publish(update: Partial<TrainingSnapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...update };
    this.emit(this.snapshot);
  }
  private persist() {
    try { this.storage.setItem(this.key, JSON.stringify(this.remote ? this.cache : this.cache.data)); }
    catch { throw new CacheError('Could not save the local cache'); }
  }
  async start() {
    try {
      if (this.remote) {
        const raw = this.storage.getItem(this.key);
        if (raw) {
          const cached = JSON.parse(raw) as Cache;
          if (!Number.isSafeInteger(cached.revision) || cached.revision < 0 || typeof cached.dirty !== 'boolean') throw new Error('Invalid cache');
          this.cache = { ...cached, data: parseTraining(cached.data) };
        }
      } else this.cache.data = this.guestLoad();
      this.publish({ data: this.cache.data, loaded: true, status: this.remote ? 'loading' : 'device' });
    } catch {
      this.publish({ loaded: true, canSave: false, status: 'error', message: 'Saved data could not be loaded. Your previous storage has been kept.' });
      return;
    }
    if (this.remote) await this.sync();
  }
  update(updater: TrainingData | ((data: TrainingData) => TrainingData)) {
    if (!this.snapshot.loaded || !this.snapshot.canSave || this.disposed) return;
    const next = typeof updater === 'function' ? updater(this.cache.data) : updater;
    if (JSON.stringify(next) === JSON.stringify(this.cache.data)) return;
    this.cache = { ...this.cache, data: next, dirty: Boolean(this.remote) };
    try { this.persist(); }
    catch { this.publish({ data: next, canSave: false, status: 'error', message: 'Your browser could not save this change. Export your data to keep a copy.' }); return; }
    this.publish({ data: next, status: this.snapshot.status === 'conflict' ? 'conflict' : this.remote ? 'syncing' : 'device' });
    if (this.remote && this.snapshot.status !== 'conflict') {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => void this.sync(), 800);
    }
  }
  async sync() {
    if (!this.remote || this.running || this.disposed || !this.snapshot.canSave || this.snapshot.status === 'conflict') return;
    this.running = true;
    try {
      if (!this.connected) {
        const row = await this.remote.load();
        if (this.disposed) return;
        const revision = row?.revision ?? 0;
        if (this.cache.dirty && revision !== this.cache.revision) {
          this.publish({ status: 'conflict', message: 'Your account changed on another device. Export this device’s copy before loading your account copy.' }); return;
        }
        if (!this.cache.dirty) {
          this.cache = { data: row ? parseTraining(row.data) : this.cache.data, revision, dirty: false };
          this.persist(); this.publish({ data: this.cache.data });
        }
        this.connected = true;
      }
      while (this.cache.dirty && !this.disposed) {
        this.publish({ status: 'syncing', message: '' });
        const sent = JSON.stringify(this.cache.data);
        const revision = await this.remote.save(JSON.parse(sent) as TrainingData, this.cache.revision);
        if (this.disposed) return;
        if (revision === 0) {
          this.publish({ status: 'conflict', message: 'Your account changed on another device. Export this device’s copy before loading your account copy.' }); return;
        }
        this.cache.revision = revision;
        this.cache.dirty = JSON.stringify(this.cache.data) !== sent;
        this.persist();
      }
      this.publish({ status: 'synced', message: '' });
    } catch (error) {
      if (error instanceof CacheError) this.publish({ data: this.cache.data, canSave: false, status: 'error', message: 'Your browser could not keep a local copy. Export your data before closing this page.' });
      else this.publish({ status: 'offline', message: 'Your workouts are saved on this device. Account sync is unavailable. Retry when you’re online.' });
    } finally { this.running = false; }
  }
  async loadAccountCopy() {
    if (!this.remote || this.running || this.disposed) return;
    this.running = true;
    try {
      const row = await this.remote.load();
      if (this.disposed) return;
      const next = row ? parseTraining(row.data) : { ...emptyData };
      // Preserve the full unsynced version before replacing local data.
      this.storage.setItem(`${this.key}:backup:${Date.now()}`, JSON.stringify(this.cache));
      this.cache = { data: next, revision: row?.revision ?? 0, dirty: false };
      this.persist(); this.connected = true;
      this.publish({ data: next, status: 'synced', message: '' });
    } catch { this.publish({ message: 'Could not load your account copy. Your device copy is still kept.' }); }
    finally { this.running = false; }
  }
  dispose() { this.disposed = true; clearTimeout(this.timer); }
}

export const trainingKey = (userId: string | null) => userId ? `${STORAGE_KEY}:account:${userId}` : STORAGE_KEY;
