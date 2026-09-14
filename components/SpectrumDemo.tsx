"use client";

import { useState } from "react";

const STOPS = [
  { key: "non_ai", label: "Non-AI digital" },
  { key: "hybrid", label: "Hybrid" },
  { key: "ai", label: "AI solution" },
] as const;

/** Decorative spectrum in the hero illustration: the highlight follows the
 * mouse across the three stops and settles back on Hybrid. */
export function SpectrumDemo() {
  const [active, setActive] = useState<string>("hybrid");

  return (
    <div
      className="mt-4 flex overflow-hidden rounded-[10px] border border-washline text-center text-[11px] font-semibold"
      onMouseLeave={() => setActive("hybrid")}
    >
      {STOPS.map((s, i) => (
        <div
          key={s.key}
          onMouseEnter={() => setActive(s.key)}
          className={`flex-1 cursor-pointer px-2 py-2 transition-colors duration-200 ${
            i === 1 ? "border-x border-washline" : ""
          } ${
            active === s.key
              ? "bg-heritage text-white"
              : "bg-white text-ink-muted"
          }`}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}
