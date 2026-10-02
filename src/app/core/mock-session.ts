// Temporary tab-scoped mock storage. This is not authentication or an API authority.
export function readMock<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`atlas.mock.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeMock<T>(key: string, value: T) {
  try {
    sessionStorage.setItem(`atlas.mock.${key}`, JSON.stringify(value));
  } catch {
    /* The demo still works in memory when storage is unavailable. */
  }
}
