"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { convertToLead, deleteAccount } from "@/app/(dashboard)/accounts/actions";

export function ConvertToLeadButton({ accountId }: { accountId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => { void convertToLead(accountId); })}
    >
      {pending ? "Converting…" : "Convert to lead"}
    </Button>
  );
}

export function DeleteAccountButton({ accountId }: { accountId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this account? This will also delete its leads. This cannot be undone.")) return;
        startTransition(() => { void deleteAccount(accountId); });
      }}
    >
      {pending ? "Deleting…" : "Delete account"}
    </Button>
  );
}
