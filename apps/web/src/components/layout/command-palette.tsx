"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Plus, Settings, Sparkles, Users } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { NAV_GROUPS } from "@/lib/nav";
import { useAuth } from "@/lib/auth-context";
import { useQuickCreate } from "@/lib/quick-create-context";
import { useCommandPalette } from "@/lib/command-palette-context";
import { useGlobalSearch } from "@/hooks/use-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

/**
 * Ctrl+K (or clicking the topbar search box) opens this — a real command
 * list (navigation + quick actions), with live client/task search results
 * blended in as the user types. Extensible for future AI commands: add
 * another CommandGroup here.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const [term, setTerm] = React.useState("");
  const router = useRouter();
  const { hasPermission } = useAuth();
  const quickCreate = useQuickCreate();
  const debouncedTerm = useDebouncedValue(term, 250);
  const { data: searchResults } = useGlobalSearch(debouncedTerm);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setTerm("");
  };

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const hasSearchResults = !!searchResults && (searchResults.clients.length > 0 || searchResults.tasks.length > 0);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <CommandInput placeholder="Search clients, tasks, or jump to a page…" value={term} onValueChange={setTerm} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {hasSearchResults && (
          <>
            {searchResults!.clients.length > 0 && (
              <CommandGroup heading="Clients">
                {searchResults!.clients.map((c) => (
                  <CommandItem key={c.id} value={`client-${c.id}-${c.title}`} onSelect={() => go(`/clients/${c.id}`)}>
                    <Users className="h-4 w-4 text-muted" />
                    <span className="flex-1 truncate">{c.title}</span>
                    {c.subtitle && <span className="ml-2 shrink-0 text-xs text-muted">{c.subtitle}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searchResults!.tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {searchResults!.tasks.map((t) => (
                  <CommandItem key={t.id} value={`task-${t.id}-${t.title}`} onSelect={() => go(`/tasks/${t.id}`)}>
                    <ListChecks className="h-4 w-4 text-muted" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted">{t.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}

        <CommandGroup heading="Quick actions">
          {hasPermission("clients.create") && (
            <CommandItem
              value="add client"
              onSelect={() => {
                handleOpenChange(false);
                quickCreate.setNewClientOpen(true);
              }}
            >
              <Plus className="h-4 w-4 text-muted" /> Add client
            </CommandItem>
          )}
          {hasPermission("tasks.create") && (
            <CommandItem
              value="add task"
              onSelect={() => {
                handleOpenChange(false);
                quickCreate.setNewTaskOpen(true);
              }}
            >
              <Plus className="h-4 w-4 text-muted" /> Add task
            </CommandItem>
          )}
          <CommandItem value="ai assistant copilot" onSelect={() => go("/copilot")}>
            <Sparkles className="h-4 w-4 text-muted" /> Open AI Assistant
          </CommandItem>
          <CommandItem value="settings" onSelect={() => go("/settings")}>
            <Settings className="h-4 w-4 text-muted" /> Open Settings
          </CommandItem>
        </CommandGroup>

        {NAV_GROUPS.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => (
              <CommandItem key={item.href} value={`go to ${item.label}`} onSelect={() => go(item.href)}>
                <item.icon className="h-4 w-4 text-muted" />
                Go to {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
