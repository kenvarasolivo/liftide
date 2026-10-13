function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const request = indexedDB.open('liftide-photos',1);
    request.onupgradeneeded = () => request.result.createObjectStore('photos');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function loadPhotos(scope = ''): Promise<Record<string,string>> {
  if (!scope) return {};
  const db = await openDatabase();
  return new Promise((resolve,reject) => {
    const transaction = db.transaction('photos','readonly');
    const photos: Record<string,string> = {};
    const cursor = transaction.objectStore('photos').openCursor();
    cursor.onsuccess = () => { const item = cursor.result; if(item) { const key = String(item.key); const prefix = `account:${scope}:`; if(scope ? key.startsWith(prefix) : !key.startsWith('account:')) photos[scope ? key.slice(prefix.length) : key] = item.value; item.continue(); } };
    transaction.oncomplete = () => { db.close(); resolve(photos); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}
export async function storePhoto(id:string, photo:string | null, scope = '') {
  if (!scope) throw new Error('Log in to save equipment photos.');
  const db = await openDatabase();
  return new Promise<void>((resolve,reject) => {
    const transaction = db.transaction('photos','readwrite');
    const store = transaction.objectStore('photos');
    const key = scope ? `account:${scope}:${id}` : id;
    if(photo === null) store.delete(key); else store.put(photo,key);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}
export async function readPhoto(file: File): Promise<string> {
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)) throw new Error('Choose a JPG, PNG, WebP or AVIF photo.');
  if(file.size > 10 * 1024 * 1024) throw new Error('Choose a photo smaller than 10 MB.');
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('This photo could not be read. Please try another.'));
    reader.readAsDataURL(file);
  });
}
