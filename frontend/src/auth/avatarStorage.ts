const PROFILE_DATABASE_NAME = "ecoplaza-profile";
const PROFILE_DATABASE_VERSION = 1;
const AVATAR_STORE_NAME = "avatars";

function openProfileDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      reject(new Error("IndexedDB is not available."));
      return;
    }

    const request = indexedDB.open(PROFILE_DATABASE_NAME, PROFILE_DATABASE_VERSION);
    let blocked = false;

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(AVATAR_STORE_NAME)) {
        database.createObjectStore(AVATAR_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }

      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open profile storage."));
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Profile storage is blocked."));
    };
  });
}

export async function readProfileAvatar(userId: string): Promise<Blob | null> {
  let database: IDBDatabase | null = null;

  try {
    database = await openProfileDatabase();

    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database!.transaction(AVATAR_STORE_NAME, "readonly");
      const request = transaction.objectStore(AVATAR_STORE_NAME).get(userId);

      request.onsuccess = () => {
        const storedAvatar = request.result;
        const isSupportedBlob =
          storedAvatar instanceof Blob &&
          storedAvatar.size > 0 &&
          (storedAvatar.type === "image/webp" || storedAvatar.type === "image/png");

        resolve(isSupportedBlob ? storedAvatar : null);
      };
      request.onerror = () => reject(request.error ?? new Error("Could not read profile photo."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Profile photo read was aborted."));
    });
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

export async function storeProfileAvatar(userId: string, avatar: Blob): Promise<boolean> {
  let database: IDBDatabase | null = null;

  try {
    database = await openProfileDatabase();

    return await new Promise<boolean>((resolve) => {
      const transaction = database!.transaction(AVATAR_STORE_NAME, "readwrite");

      transaction.objectStore(AVATAR_STORE_NAME).put(avatar, userId);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    });
  } catch {
    return false;
  } finally {
    database?.close();
  }
}

export async function removeProfileAvatar(userId: string): Promise<boolean> {
  let database: IDBDatabase | null = null;

  try {
    database = await openProfileDatabase();

    return await new Promise<boolean>((resolve) => {
      const transaction = database!.transaction(AVATAR_STORE_NAME, "readwrite");

      transaction.objectStore(AVATAR_STORE_NAME).delete(userId);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    });
  } catch {
    return false;
  } finally {
    database?.close();
  }
}
