"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ListChecks } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGlobalSearch, type SearchResultClient, type SearchResultTask } from "@/hooks/use-search";

type FlatResult =
  | { kind: "client"; href: string; data: SearchResultClient }
  | { kind: "task"; href: string; data: SearchResultTask };

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debouncedTerm = useDebouncedValue(term, 250);
  const { data, isFetching } = useGlobalSearch(debouncedTerm);

  const results: FlatResult[] = React.useMemo(() => {
    if (!data) return [];
    return [
      ...data.clients.map((c): FlatResult => ({ kind: "client", href: `/clients/${c.id}`, data: c })),
      ...data.tasks.map((t): FlatResult => ({ kind: "task", href: `/tasks/${t.id}`, data: t })),
    ];
  }, [data]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goTo(result: FlatResult) {
    router.push(result.href);
    setOpen(false);
    setTerm("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const active = results[activeIndex];
      if (active) goTo(active);
    }
  }

  const showPanel = open && debouncedTerm.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-sm sm:block">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          ref={inputRef}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search clients, tasks…"
          className="h-9 pl-9 pr-14"
          aria-label="Global search"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted-surface px-1.5 py-0.5 text-[10px] font-medium text-muted sm:block">
          Ctrl K
        </kbd>
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
          {isFetching && results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted">No results for &quot;{debouncedTerm}&quot;.</p>
          ) : (
            results.map((result, index) => {
              const isActive = index === activeIndex;
              const Icon = result.kind === "client" ? Users : ListChecks;
              return (
                <button
                  key={`${result.kind}-${result.data.id}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => goTo(result)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
                    isActive ? "bg-muted-surface" : "hover:bg-muted-surface",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{result.data.title}</span>
                    <span className="block truncate text-xs text-muted">{result.data.subtitle ?? "—"}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted">
                    {result.kind === "client" ? "Client" : "Task"}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
