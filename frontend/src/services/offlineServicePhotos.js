const DATABASE_NAME = 'cleaning-service-photo-queue';
const STORE_NAME = 'photos';
const MAX_QUEUED_PER_RUN = 25;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function openQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('ownerRun', ['ownerId', 'runId']);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Device photo storage is unavailable'));
  });
}

async function transact(mode, action) {
  const database = await openQueue();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let value;
    try { action(store, result => { value = result; }); }
    catch (error) { transaction.abort(); database.close(); reject(error); return; }
    transaction.oncomplete = () => { database.close(); resolve(value); };
    transaction.onerror = () => { database.close(); reject(transaction.error || new Error('Device photo storage failed')); };
    transaction.onabort = () => { database.close(); reject(transaction.error || new Error('Device photo storage was cancelled')); };
  });
}

export async function listQueuedPhotos(ownerId, runId) {
  if (!ownerId || !runId) return [];
  return transact('readonly', (store, done) => {
    const request = store.index('ownerRun').getAll([String(ownerId), runId]);
    request.onsuccess = () => done(request.result.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)));
  });
}

export async function queueServicePhoto(ownerId, runId, file, note) {
  if (!ownerId || !runId) throw new Error('Sign in and select a service run before saving a photo');
  if (!file || file.size < 1 || file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo up to 8 MB');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG, or WebP photo');
  if ((await listQueuedPhotos(ownerId, runId)).length >= MAX_QUEUED_PER_RUN) throw new Error('Sync or discard a queued photo before saving another');
  const item = {
    id: crypto.randomUUID(), ownerId: String(ownerId), runId, file,
    fileName: file.name || 'service-photo', note: String(note || '').trim(), capturedAt: new Date().toISOString(),
  };
  await transact('readwrite', store => { store.put(item); });
  return item;
}

export async function discardQueuedPhoto(id) {
  await transact('readwrite', store => { store.delete(id); });
}
