"use client";

import { useState } from "react";

// Two-click confirm instead of window.confirm().
export function ConfirmButton({ action, label, confirmLabel = "Click again to confirm", className }: {
  action: () => Promise<void>;
  label: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      onBlur={() => setArmed(false)}
      onClick={() => (armed ? action() : setArmed(true))}
      className={`${className ?? ""} ${armed ? "!text-red-600 font-semibold" : ""}`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
