export type NotificationRest = { exerciseId: string; endAt: number | null; paused: number | null; complete: boolean };
export const restNotificationTag = 'liftide-rest';
type RestNotificationOptions = NotificationOptions & { renotify?: boolean };

export interface RestNotificationTarget {
  show(title: string, options: RestNotificationOptions): Promise<void>;
  close(): Promise<void>;
}

// Only notify at completion. Replacing a browser notification every second can
// create repeated banners even when the notification uses the same tag.
export class RestNotifications {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private rest: NotificationRest | null = null;
  private name = '';
  private completed = false;
  private queue = Promise.resolve();
  private revision = 0;

  constructor(private target: RestNotificationTarget, private onError: () => void = () => {}) {}

  private write(action: () => Promise<void>) {
    this.queue = this.queue.then(action).catch(() => this.onError());
  }

  update(rest: NotificationRest | null, name: string) {
    const previous = this.rest;
    clearTimeout(this.timer);
    // The UI can acknowledge expiry before the queued alert has been shown.
    if (!(rest?.complete && this.completed && previous?.exerciseId === rest.exerciseId)) this.revision++;
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
    this.write(() => this.target.close());
    if (rest.endAt !== null && rest.endAt <= Date.now()) {
      this.finish();
      return;
    }
    if (rest.paused === null && rest.endAt !== null) {
      this.timer = setTimeout(() => this.finish(), Math.max(0, rest.endAt - Date.now()));
    }
  }

  private finish() {
    if (this.completed) return;
    this.completed = true;
    const revision = ++this.revision;
    const name = this.name;
    this.write(async () => {
      if (revision !== this.revision) return;
      await this.target.show('Rest complete. Your next set is ready.', {
        body: name, tag: restNotificationTag, icon: '/icons/liftide-192.png',
        requireInteraction: true, renotify: true, data: { url: '/train' },
      });
    });
  }

  dispose() {
    clearTimeout(this.timer);
    this.revision++;
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
