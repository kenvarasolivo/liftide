// Activate and reload only at an idle boundary, including workers already waiting
// when the app opens. Keep the current workout and unsaved forms in memory.
export function automaticUpdates(
  registration: ServiceWorkerRegistration,
  container: ServiceWorkerContainer,
  canUpdate: () => boolean,
  reload: () => void,
) {
  let controlled = !!container.controller;
  let changed = false;
  let reloading = false;
  let requested: ServiceWorker | null = null;
  const watched = new Set<ServiceWorker>();
  const check = () => {
    if (reloading || !canUpdate()) return;
    if (changed) { reloading = true; reload(); return; }
    const worker = registration.waiting;
    if (worker && requested !== worker) {
      requested = worker;
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  };
  const onControllerChange = () => {
    // Initial installation claims the page too; it needs no reload.
    if (controlled) changed = true;
    controlled = true;
    check();
  };
  const onUpdate = () => {
    const worker = registration.installing;
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', check);
    check();
  };
  container.addEventListener('controllerchange', onControllerChange);
  registration.addEventListener('updatefound', onUpdate);
  onUpdate();
  check();
  return {
    check,
    dispose() {
      registration.removeEventListener('updatefound', onUpdate);
      container.removeEventListener('controllerchange', onControllerChange);
      watched.forEach(worker => worker.removeEventListener('statechange', check));
    },
  };
}
