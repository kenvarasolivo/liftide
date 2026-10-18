export type NotificationRest = { exerciseId: string; endAt: number | null; paused: number | null; complete: boolean };
export const restNotificationTag = 'liftide-rest';
type RestNotificationOptions = NotificationOptions & { renotify?: boolean };

export interface RestNotificationTarget {
  show(title: string, options: RestNotificationOptions): Promise<void>;
  close(): Promise<void>;
}

// Keep notification writes in order: a slow show must never overwrite a later
// pause, cancellation, or completion. Deadlines use wall time, like the UI.
export class RestNotifications {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private rest: NotificationRest | null = null;
  private name = '';
  private completed = false;
  private queue = Promise.resolve();

  constructor(private target: RestNotificationTarget, private onError: () => void = () => {}) {}

  private write(action: () => Promise<void>) {
    this.queue = this.queue.then(action).catch(() => this.onError());
  }

  update(rest: NotificationRest | null, name: string) {
    const previous = this.rest;
    clearTimeout(this.timer);
    this.rest = rest;
    this.name = name;
    if (!rest || rest.complete) {
      if (rest?.complete && previous && !previous.complete && previous.endAt !== null && Date.now() >= previous.endAt) {
        this.finish();
      } else if (!this.completed || !rest) {
        this.write(() => this.target.close());
      }
      return;
    }
    this.completed = false;
    if (rest.endAt !== null && rest.endAt <= Date.now()) {
      this.finish();
      return;
    }
    const body = rest.paused !== null
      ? `${name} · ${Math.floor(rest.paused / 60)}:${String(rest.paused % 60).padStart(2, '0')} remaining. Open Liftide to resume.`
      : `${name} · Rest ends at ${new Date(rest.endAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`;
    this.write(() => this.target.show(rest.paused !== null ? 'Rest paused' : 'Rest timer running', {
      body, tag: restNotificationTag, icon: '/icons/liftide-192.png',
      silent: true, requireInteraction: true, data: { url: '/train' },
    }));
    if (rest.endAt !== null) this.timer = setTimeout(() => this.finish(), Math.max(0, rest.endAt - Date.now()));
  }

  private finish() {
    if (this.completed) return;
    this.completed = true;
    this.write(() => this.target.show('Rest complete. Your next set is ready.', {
      body: this.name, tag: restNotificationTag, icon: '/icons/liftide-192.png',
      requireInteraction: true, renotify: true, data: { url: '/train' },
    }));
  }

  dispose() {
    clearTimeout(this.timer);
    this.write(() => this.target.close());
  }
}

export function browserNotificationTarget(): RestNotificationTarget {
  let fallback: Notification | undefined;
  async function registration() {
    if (!('serviceWorker' in navigator)) return undefined;
    const worker = await navigator.serviceWorker.getRegistration('/');
    // Do not wait indefinitely on serviceWorker.ready in development or in
    // browsers where offline setup failed. Desktop has a direct fallback.
    return worker?.active ? worker : undefined;
  }
  return {
    async show(title, options) {
      if (Notification.permission !== 'granted') return;
      const worker = await registration();
      if (worker) await worker.showNotification(title, options);
      else {
        fallback?.close();
        fallback = new Notification(title, options);
        fallback.onclick = () => { window.focus(); fallback?.close(); };
      }
    },
    async close() {
      fallback?.close();
      const worker = await registration();
      if (worker) for (const notification of await worker.getNotifications({ tag: restNotificationTag })) notification.close();
    },
  };
}
