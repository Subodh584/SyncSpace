"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on the client.
 *
 * Disabled in development so the SW cache never interferes with HMR; Next.js
 * also doesn't emit a stable build to cache while running `next dev`.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });
    };

    // Wait until the page has loaded so registration doesn't compete with
    // first-paint resources.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
