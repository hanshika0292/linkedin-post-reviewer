"use client";

import { useSyncExternalStore } from "react";

// Reviewer's display name, remembered per browser so clients type it once.
const KEY = "post-reviewer:name";
const EVENT = "post-reviewer:name-change";

function read() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useStoredName(): [string, (v: string) => void] {
  const name = useSyncExternalStore(subscribe, read, () => "");
  const setName = (v: string) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [name, setName];
}
