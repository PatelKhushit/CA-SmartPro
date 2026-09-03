"use client";

import * as React from "react";

interface QuickCreateContextValue {
  newClientOpen: boolean;
  setNewClientOpen: (open: boolean) => void;
  newTaskOpen: boolean;
  setNewTaskOpen: (open: boolean) => void;
}

const QuickCreateContext = React.createContext<QuickCreateContextValue | null>(null);

/**
 * Lets a "New Client"/"New Task" trigger anywhere in the app (topbar quick-create,
 * command palette) open the same dialogs a page's own "+ New" button opens —
 * without prop-drilling or duplicating the dialog markup. Pages that render
 * <NewClientDialog /> uncontrolled keep working exactly as before; this only
 * backs the one extra headless instance mounted in the app shell.
 */
export function QuickCreateProvider({ children }: { children: React.ReactNode }) {
  const [newClientOpen, setNewClientOpen] = React.useState(false);
  const [newTaskOpen, setNewTaskOpen] = React.useState(false);

  const value = React.useMemo(
    () => ({ newClientOpen, setNewClientOpen, newTaskOpen, setNewTaskOpen }),
    [newClientOpen, newTaskOpen],
  );

  return <QuickCreateContext.Provider value={value}>{children}</QuickCreateContext.Provider>;
}

export function useQuickCreate() {
  const ctx = React.useContext(QuickCreateContext);
  if (!ctx) throw new Error("useQuickCreate must be used within a QuickCreateProvider");
  return ctx;
}
