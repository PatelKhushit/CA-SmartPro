"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { useClient, useAddContact, useRemoveContact, useAddService, useRemoveService } from "@/hooks/use-clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUSINESS_TYPE_LABELS, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/types/client";
import { ApiClientError } from "@/lib/api-client";
import { ClientDocumentsPanel } from "@/components/documents/client-documents-panel";
import { ClientDocumentRequestsPanel } from "@/components/document-requests/client-document-requests-panel";

const STATUS_VARIANT = { ACTIVE: "completed", INACTIVE: "upcoming", ARCHIVED: "cancelled" } as const;
const SERVICE_STATUS_VARIANT = { ACTIVE: "completed", PAUSED: "attention", ENDED: "cancelled" } as const;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: client, isLoading, isError, refetch } = useClient(params.id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !client) {
    return (
      <ErrorState
        title="We couldn't load this client."
        description="It may have been removed, or you may not have access. Please check your connection and try again."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/clients")} className="mb-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Clients
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{client.displayName}</h1>
          <Badge variant={STATUS_VARIANT[client.status]}>{client.status}</Badge>
        </div>
        <p className="text-sm text-muted">
          {client.clientCode} · {BUSINESS_TYPE_LABELS[client.businessType]}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="requests">Document Requests</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="Legal name" value={client.legalName} />
                <InfoRow label="Business type" value={BUSINESS_TYPE_LABELS[client.businessType]} />
                <InfoRow label="Email" value={client.email} />
                <InfoRow label="Phone" value={client.phone} />
                <InfoRow label="Assigned CA" value={client.assignedUser?.fullName} />
                <InfoRow label="Added by" value={client.createdBy.fullName} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <InfoRow label="PAN" value={client.pan} />
                <InfoRow label="GSTIN" value={client.gstin} />
                <InfoRow label="TAN" value={client.tan} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Coming soon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {["Tasks", "Compliance", "Payments", "Communication timeline", "AI summary"].map(
                    (label) => (
                      <Badge key={label} variant="neutral">
                        {label} — Phase 2
                      </Badge>
                    ),
                  )}
                </div>
                <p className="mt-2 text-xs text-muted">
                  These modules are built next; nothing here is faked in the meantime.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab clientId={client.id} contacts={client.contacts} />
        </TabsContent>

        <TabsContent value="services">
          <ServicesTab clientId={client.id} services={client.services} />
        </TabsContent>

        <TabsContent value="documents">
          <ClientDocumentsPanel clientId={client.id} />
        </TabsContent>

        <TabsContent value="requests">
          <ClientDocumentRequestsPanel clientId={client.id} />
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6 text-sm text-foreground">
              {client.notes || <span className="text-muted">No notes yet.</span>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ContactsTab({ clientId, contacts }: { clientId: string; contacts: import("@/lib/types/client").ClientContact[] }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const addContact = useAddContact(clientId);
  const removeContact = useRemoveContact(clientId);

  const submit = async () => {
    try {
      await addContact.mutateAsync({ name, email: email || undefined, phone: phone || undefined });
      toast.success("Contact added.");
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this contact.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Add contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a contact</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-email">Email</Label>
                <Input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input id="contact-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!name || addContact.isPending} onClick={submit}>
                {addContact.isPending ? "Saving…" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <EmptyState title="No contacts yet." description="Add the people you coordinate with at this client." />
      ) : (
        <div className="flex flex-col gap-3">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium text-foreground">
                    {contact.name} {contact.isPrimary && <Badge variant="brand">Primary</Badge>}
                  </p>
                  <div className="mt-1 flex gap-4 text-xs text-muted">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {contact.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeContact.mutate(contact.id)}
                  aria-label={`Remove ${contact.name}`}
                >
                  <Trash2 className="h-4 w-4 text-status-overdue" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ServicesTab({ clientId, services }: { clientId: string; services: import("@/lib/types/client").ClientService[] }) {
  const [open, setOpen] = React.useState(false);
  const [category, setCategory] = React.useState<ServiceCategory>("GST");
  const [name, setName] = React.useState("");
  const addService = useAddService(clientId);
  const removeService = useRemoveService(clientId);

  const submit = async () => {
    try {
      await addService.mutateAsync({ category, name });
      toast.success("Service added.");
      setOpen(false);
      setName("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't add this service.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Add service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a service</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ServiceCategory)}>
                  <SelectTrigger id="service-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-name">Name</Label>
                <Input
                  id="service-name"
                  placeholder="Monthly GST Filing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!name || addService.isPending} onClick={submit}>
                {addService.isPending ? "Saving…" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <EmptyState title="No services yet." description="Add the services your firm provides to this client." />
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="font-medium text-foreground">{service.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <Badge variant="neutral">{SERVICE_CATEGORY_LABELS[service.category]}</Badge>
                    <Badge variant={SERVICE_STATUS_VARIANT[service.status]}>{service.status}</Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeService.mutate(service.id)}
                  aria-label={`Remove ${service.name}`}
                >
                  <Trash2 className="h-4 w-4 text-status-overdue" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
