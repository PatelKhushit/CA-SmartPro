"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Users } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useClients, type ClientSortField } from "@/hooks/use-clients";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { BUSINESS_TYPE_LABELS } from "@/lib/types/client";
import { useLanguage } from "@/lib/i18n/language-context";

const STATUS_VARIANT = {
  ACTIVE: "completed",
  INACTIVE: "upcoming",
  ARCHIVED: "cancelled",
} as const;

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

function SortableHead({
  field,
  label,
  sortBy,
  sortDir,
  onSort,
}: {
  field: ClientSortField;
  label: string;
  sortBy: ClientSortField;
  sortDir: "asc" | "desc";
  onSort: (field: ClientSortField) => void;
}) {
  const active = sortBy === field;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="flex items-center gap-1 text-left hover:text-foreground"
      >
        {label}
        {active && (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
      </button>
    </TableHead>
  );
}

export default function ClientsPage() {
  const { t } = useLanguage();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [sortBy, setSortBy] = React.useState<ClientSortField>("createdAt");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const pageSize = 20;

  const { data, isLoading, isError, refetch } = useClients({
    search: debouncedSearch,
    status: status === "ALL" ? undefined : status,
    sortBy,
    sortDir,
    page,
    pageSize,
  });

  // Page resets alongside whichever filter/sort control the user just
  // touched, right in the same event handler — not via a useEffect, so
  // there's no extra render cascade from committing two state updates.
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const toggleSort = (field: ClientSortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("pages.clients.title")}</h1>
          <p className="text-sm text-muted">{t("pages.clients.description")}</p>
        </div>
        <NewClientDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name, code, PAN, or GSTIN…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && <ErrorState description="We couldn't load your clients. Please check your connection and try again." onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          icon={Users}
          title={search || status !== "ALL" ? "No clients match these filters." : "No clients yet."}
          description={
            search || status !== "ALL"
              ? "Try a different search term or status filter."
              : "Add your first client to start assigning work."
          }
          action={!search && status === "ALL" ? <NewClientDialog /> : undefined}
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead field="displayName" label="Client" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TableHead>Type</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Assigned to</TableHead>
              <SortableHead field="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <SortableHead field="taskCount" label="Tasks" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <Link href={`/clients/${client.id}`} className="font-medium text-brand-700 hover:underline">
                    {client.displayName}
                  </Link>
                  <p className="text-xs text-muted">{client.clientCode}</p>
                </TableCell>
                <TableCell>{BUSINESS_TYPE_LABELS[client.businessType]}</TableCell>
                <TableCell className="text-muted">{client.gstin ?? "—"}</TableCell>
                <TableCell className="text-muted">{client.assignedUser?.fullName ?? "Unassigned"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[client.status]}>{client.status}</Badge>
                </TableCell>
                <TableCell className="text-muted">{client._count.tasks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!isLoading && !isError && data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <p>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)} of {data.total} clients
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
