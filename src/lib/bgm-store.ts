import { useEffect, useSyncExternalStore } from "react";

const BGM_DB_NAME = "akinator_bgm_db";
const BGM_DB_VERSION = 1;
const BGM_STORE_NAME = "tracks";
const BGM_TRACK_KEY = "custom";

export type CustomBgmSnapshot = {
  url: string | null;
  fileName: string | null;
};

type StoredBgmRecord = {
  blob: Blob;
  fileName: string;
};

const EMPTY_SNAPSHOT: CustomBgmSnapshot = {
  url: null,
  fileName: null,
};

let currentSnapshot: CustomBgmSnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;
let mutationVersion = 0;

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function revokeObjectUrl(url: string | null) {
  if (url && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

function applyRecord(record: StoredBgmRecord | null) {
  revokeObjectUrl(currentSnapshot.url);

  if (record && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    currentSnapshot = {
      url: URL.createObjectURL(record.blob),
      fileName: record.fileName,
    };
  } else {
    currentSnapshot = EMPTY_SNAPSHOT;
  }

  notifyListeners();
}

function openBgmDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(BGM_DB_NAME, BGM_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BGM_STORE_NAME)) {
          db.createObjectStore(BGM_STORE_NAME);
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };

      request.onblocked = () => {
        resolve(null);
      };
    } catch {
      // Private browsing modes or restricted environments may throw synchronously.
      resolve(null);
    }
  });
}

function isStoredBgmRecord(value: unknown): value is StoredBgmRecord {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<StoredBgmRecord>;
  return candidate.blob instanceof Blob && typeof candidate.fileName === "string";
}

async function readStoredBgm(): Promise<StoredBgmRecord | null> {
  const db = await openBgmDb();
  if (!db) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(BGM_STORE_NAME, "readonly");
      const store = tx.objectStore(BGM_STORE_NAME);
      const request = store.get(BGM_TRACK_KEY);
      let result: StoredBgmRecord | null = null;

      request.onsuccess = () => {
        if (isStoredBgmRecord(request.result)) {
          result = request.result;
        }
      };

      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };

      tx.onerror = () => {
        db.close();
        resolve(null);
      };

      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

function ensureLoaded(): Promise<void> {
  if (loadPromise) {
    return loadPromise;
  }

  const versionAtStart = mutationVersion;
  loadPromise = readStoredBgm()
    .then((record) => {
      // Avoid overwriting a newer in-memory save/clear that occurred while reading IndexedDB.
      if (mutationVersion === versionAtStart && record) {
        applyRecord(record);
      }
    })
    .catch(() => {
      // Gracefully fall back to default BGM if IndexedDB read fails.
    });

  return loadPromise;
}

/** Saves a user-selected audio file to IndexedDB and updates active BGM subscribers. */
export async function saveCustomBgm(file: File): Promise<void> {
  mutationVersion += 1;
  const record: StoredBgmRecord = {
    blob: file,
    fileName: file.name,
  };

  const db = await openBgmDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(BGM_STORE_NAME, "readwrite");
        const store = tx.objectStore(BGM_STORE_NAME);
        store.put(record, BGM_TRACK_KEY);

        tx.oncomplete = () => {
          db.close();
          resolve();
        };

        tx.onerror = () => {
          db.close();
          resolve();
        };

        tx.onabort = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  applyRecord(record);
}

/** Removes any persisted custom BGM from IndexedDB and reverts subscribers to the default track. */
export async function clearCustomBgm(): Promise<void> {
  mutationVersion += 1;

  const db = await openBgmDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(BGM_STORE_NAME, "readwrite");
        const store = tx.objectStore(BGM_STORE_NAME);
        store.delete(BGM_TRACK_KEY);

        tx.oncomplete = () => {
          db.close();
          resolve();
        };

        tx.onerror = () => {
          db.close();
          resolve();
        };

        tx.onabort = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    });
  }

  applyRecord(null);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CustomBgmSnapshot {
  return currentSnapshot;
}

function getServerSnapshot(): CustomBgmSnapshot {
  return EMPTY_SNAPSHOT;
}

/** Subscribes to the active custom BGM object URL and file name stored in IndexedDB. */
export function useCustomBgm(): CustomBgmSnapshot {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void ensureLoaded();
  }, []);

  return snapshot;
}
