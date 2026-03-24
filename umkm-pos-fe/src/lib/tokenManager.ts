/**
 * TokenManager — jembatan antara authStore dan axios
 * tanpa circular dependency.
 *
 * Flow:
 * 1. authStore.login() → tokenManager.set(token)
 * 2. axios interceptor → tokenManager.get() → inject ke header
 * 3. authStore.logout() → tokenManager.clear()
 *
 * Kenapa tidak pakai localStorage langsung?
 * Zustand persist menulis ke localStorage secara async (microtask),
 * sehingga token belum ada di localStorage saat request pertama dikirim
 * tepat setelah login. TokenManager menyimpan token di memory (sync).
 */

let _token: string | null = null;

const tokenManager = {
  get: () => _token,
  set: (t: string) => {
    _token = t;
  },
  clear: () => {
    _token = null;
  },
};

export default tokenManager;
