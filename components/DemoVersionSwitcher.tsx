"use client";

import Link from "next/link";
import { DEMO_VERSIONS, SHOW_DEMO_SWITCHER } from "@/lib/demo-config";

/**
 * Preview-only control. Deliberately styled unlike the site so it reads as
 * demo tooling. Remove by setting SHOW_DEMO_SWITCHER = false in demo-config.
 */
export function DemoVersionSwitcher({ activeId }: { activeId: string }) {
  if (!SHOW_DEMO_SWITCHER) return null;
  return (
    <div className="fixed right-4 bottom-4 z-[90] flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 font-mono text-[11px] shadow-lg backdrop-blur-md">
      <span className="px-2 text-white/40 select-none">demo</span>
      {Object.values(DEMO_VERSIONS).map((v) => (
        <Link
          key={v.id}
          href={`/${v.id}`}
          className={`rounded-full px-3 py-1.5 transition-colors ${
            v.id === activeId
              ? "bg-white text-black"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {v.label.replace("Version ", "")}
        </Link>
      ))}
    </div>
  );
}
