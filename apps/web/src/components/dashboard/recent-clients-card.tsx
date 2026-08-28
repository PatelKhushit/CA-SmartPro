"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useClients } from "@/hooks/use-clients";
import { SERVICE_CATEGORY_LABELS } from "@/lib/types/client";

export function RecentClientsCard() {
  const { data, isLoading } = useClients({ pageSize: 5 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent clients</CardTitle>
        <Link href="/clients" className="text-xs font-medium text-brand-600 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {!isLoading && (!data || data.items.length === 0) && (
          <EmptyState icon={Users} title="No clients yet." description="Add your first client to see them here." />
        )}
        {!isLoading && data && data.items.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {data.items.map((client) => {
              const categories = [...new Set(client.services.map((s) => s.category))].slice(0, 3);
              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 hover:bg-muted-surface/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{client.displayName}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {categories.length > 0 ? (
                        categories.map((c) => (
                          <Badge key={c} variant="neutral">
                            {SERVICE_CATEGORY_LABELS[c]}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted">No services yet</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{client._count.tasks} tasks</span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
