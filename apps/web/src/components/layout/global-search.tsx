"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/lib/command-palette-context";

/** Opens the shared command palette (same one Ctrl+K opens) rather than running its own search UI. */
export function GlobalSearch() {
  const { setOpen } = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="hidden w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-muted hover:bg-muted-surface sm:flex"
      aria-label="Open search and command palette"
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1">Search clients, tasks…</span>
      <kbd className="shrink-0 rounded border border-border bg-muted-surface px-1.5 py-0.5 text-[10px] font-medium">
        Ctrl K
      </kbd>
    </button>
  );
}
