import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

window.Pusher = Pusher;

/**
 * Inisialisasi Laravel Echo untuk WebSocket via Laravel Reverb.
 * Dipanggil sekali setelah user login berhasil.
 */
export function initEcho(token: string): Echo {
  if (window.Echo) return window.Echo;

  window.Echo = new Echo({
    broadcaster: "reverb",
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST ?? "127.0.0.1",
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "http") === "https",
    enabledTransports: ["ws", "wss"],
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return window.Echo;
}

export function destroyEcho(): void {
  if (window.Echo) {
    window.Echo.disconnect();
    // @ts-ignore
    delete window.Echo;
  }
}
