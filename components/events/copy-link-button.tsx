"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    setStatus(ok ? "copied" : "error");
    window.setTimeout(() => setStatus("idle"), 2000);
  }

  const label = status === "copied" ? "Copied!" : status === "error" ? "Couldn't copy" : "Copy link";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:border-zinc-300"
    >
      {label}
    </button>
  );
}
