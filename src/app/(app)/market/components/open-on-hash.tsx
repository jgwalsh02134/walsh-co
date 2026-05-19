"use client";

/**
 * Small client island that opens a <details> element when the URL hash
 * matches its id. Used so the "Data source settings" anchor link in the
 * page header lands the user on an open, usable settings section rather
 * than a closed disclosure they then have to click again.
 *
 * Native <details> does not auto-open on :target navigation, so this
 * tiny effect bridges that gap. It also handles hashchange events so
 * subsequent clicks inside the page re-open the section if the user
 * collapsed it.
 */

import { useEffect } from "react";

export function OpenOnHash({ targetId }: { targetId: string }) {
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash;
      if (!hash) return;
      const id = hash.startsWith("#") ? hash.slice(1) : hash;
      if (id !== targetId) return;
      const el = document.getElementById(targetId);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [targetId]);
  return null;
}
