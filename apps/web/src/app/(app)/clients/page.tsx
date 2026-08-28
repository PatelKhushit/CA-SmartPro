"use client";

import * as React from "react";
import Link from "next/link";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useClients } from "@/hooks/use-clients";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { BUSINESS_TYPE_LABELS } from "@/lib/types/client";
import { Users } from "lucide-react";

const STATUS_VARIANT = {
  ACTIVE: "completed",
  INACTIVE: "upcoming",
  ARCHIVED: "cancelled",
} as const;

export default function ClientsPage() {
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError, refetch } = useClients({ search: debouncedSearch });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted">Every client your firm serves, in one place.</p>
        </div>
        <NewClientDialog />
      </div>

      <Input
        placeholder="Search by name, code, PAN, or GSTIN…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

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
          title={search ? "No clients match your search." : "No clients yet."}
          description={search ? "Try a different name, code, PAN, or GSTIN." : "Add your first client to start assigning work."}
          action={!search ? <NewClientDialog /> : undefined}
        />
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>GSTIN</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tasks</TableHead>
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
    </div>
  );
}
