const database = 'tabi-pronunciation';
const store = 'clips';
const maxBytes = 25_000_000;
const maxClips = 60;
const lifetime = 30 * 24 * 60 * 60 * 1000;
type Clip = { key: string; blob: Blob; bytes: number; createdAt: number };

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      clearTimeout(timeout);
      resolve(db);
    };
    const timeout = setTimeout(() => finish(null), 2000);
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(store))
        db.createObjectStore(store, { keyPath: 'key' });
    };
    request.onerror = () => finish(null);
    request.onblocked = () => finish(null);
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      finish(request.result);
    };
  });
}
export function validClip(clip: Clip | undefined, now: number): clip is Clip {
  return (
    !!clip &&
    clip.blob instanceof Blob &&
    clip.bytes === clip.blob.size &&
    clip.bytes > 0 &&
    clip.bytes <= 5_000_000 &&
    now >= clip.createdAt &&
    now - clip.createdAt < lifetime
  );
}
export async function readAudioClip(key: string): Promise<Blob | null> {
  let db: IDBDatabase | null = null;
  try {
    db = await open();
    if (!db) return null;
    return await new Promise((resolve) => {
      const request = db!
        .transaction(store, 'readonly')
        .objectStore(store)
        .get(key);
      request.onsuccess = () =>
        resolve(
          validClip(request.result, Date.now()) ? request.result.blob : null,
        );
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db?.close();
  }
}
export async function saveAudioClip(key: string, blob: Blob): Promise<void> {
  if (!blob.size || blob.size > 5_000_000 || !blob.type.startsWith('audio/'))
    return;
  let db: IDBDatabase | null = null;
  try {
    db = await open();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const transaction = db!.transaction(store, 'readwrite');
      const objects = transaction.objectStore(store);
      objects.put({
        key,
        blob,
        bytes: blob.size,
        createdAt: Date.now(),
      } satisfies Clip);
      const request = objects.getAll();
      request.onsuccess = () => {
        const records: Clip[] = request.result;
        records.sort((a, b) => b.createdAt - a.createdAt);
        let bytes = 0,
          count = 0;
        for (const clip of records) {
          if (
            !validClip(clip, Date.now()) ||
            count >= maxClips ||
            bytes + clip.bytes > maxBytes
          )
            objects.delete(clip.key);
          else {
            count++;
            bytes += clip.bytes;
          }
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  } catch {
    /* Storage failures must not prevent pronunciation. */
  } finally {
    db?.close();
  }
}
export async function clearAudioClips(): Promise<boolean> {
  let db: IDBDatabase | null = null;
  try {
    db = await open();
    if (!db) return false;
    return await new Promise((resolve) => {
      const transaction = db!.transaction(store, 'readwrite');
      transaction.objectStore(store).clear();
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    });
  } catch {
    return false;
  } finally {
    db?.close();
  }
}
