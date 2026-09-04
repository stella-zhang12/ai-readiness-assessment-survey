"use client";

import { useState } from "react";

export function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (older browser / http) - the code is visible anyway.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy invite code"
      className="inline-flex items-center gap-2 rounded-md border border-washline bg-wash px-3 py-1.5 text-sm transition-colors hover:border-spirit"
    >
      <span className="text-ink-muted">Invite code</span>
      <span className="font-mono font-bold tracking-widest text-heritage">
        {code}
      </span>
      <span className="text-xs font-semibold text-spirit-dark">
        {copied ? "Copied ✓" : "Copy"}
      </span>
    </button>
  );
}
