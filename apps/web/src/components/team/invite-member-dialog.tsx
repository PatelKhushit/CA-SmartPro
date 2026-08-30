"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInviteMember, useTeamRoles } from "@/hooks/use-team";
import { ApiClientError } from "@/lib/api-client";

export function InviteMemberDialog() {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [roleKey, setRoleKey] = React.useState("");
  const [result, setResult] = React.useState<{ message: string; devOnlyInviteToken?: string } | null>(null);

  const { data: roles } = useTeamRoles();
  const inviteMember = useInviteMember();

  const reset = () => {
    setEmail("");
    setFullName("");
    setRoleKey("");
    setResult(null);
  };

  const valid = email.trim() && fullName.trim() && roleKey;

  const submit = async () => {
    try {
      const res = await inviteMember.mutateAsync({ email: email.trim().toLowerCase(), fullName: fullName.trim(), roleKey });
      setResult({ message: res.message, devOnlyInviteToken: res.devOnlyInviteToken });
      toast.success("Invitation created.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "We couldn't invite this member.");
    }
  };

  const inviteLink = result?.devOnlyInviteToken
    ? `${window.location.origin}/reset-password?token=${result.devOnlyInviteToken}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4" /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-name">Full name</Label>
              <Input id="inv-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-role">Role</Label>
              <Select value={roleKey} onValueChange={setRoleKey}>
                <SelectTrigger id="inv-role"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles?.map((r) => <SelectItem key={r.id} value={r.key}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">{result.message}</p>
            {inviteLink && (
              <div className="flex flex-col gap-1.5">
                <Label>Invite link (email delivery not configured — share this manually)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={inviteLink} className="font-mono text-xs" />
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Copy invite link"
                    onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copied."); }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button disabled={!valid || inviteMember.isPending} onClick={submit}>
                {inviteMember.isPending ? "Inviting…" : "Send invite"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpen(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
