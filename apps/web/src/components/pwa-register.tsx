"use client";

import { useEffect } from "react";

/**
 * Registered only in production — under Turbopack dev, a service worker
 * caching hashed chunk URLs actively fights HMR (stale chunks, phantom
 * reloads). A production build is also the only build where /_next/static
 * asset hashes are stable enough for the cache-first strategy to make sense.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure (unsupported browser, blocked by policy, etc.)
      // should never break the app — the site works fully without it.
    });
  }, []);

  return null;
}
