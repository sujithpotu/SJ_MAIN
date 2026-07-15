import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/accounts/account-form";
import { ConvertToLeadButton, DeleteAccountButton } from "@/components/accounts/account-actions";
import { Badge } from "@/components/ui/badge";
import { updateAccount } from "../actions";
import type { Account } from "@/types/database";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  const { data: account, error } = await supabase
    .from("accounts")
    .select("*, rep:profiles!assigned_rep(full_name)")
    .eq("id", id)
    .single();

  if (error || !account) {
    return <p className="text-sm text-destructive">{error?.message ?? "Account not found."}</p>;
  }

  const isManager = profile?.role === "manager";
  const updateWithId = updateAccount.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{account.name}</h1>
        {account.status === "prospect" && (
          <Badge variant="outline" className="border-amber-400 text-amber-700">
            Prospect
          </Badge>
        )}
      </div>

      {account.status === "prospect" && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            This is a prospect — not yet an active account.
          </p>
          <ConvertToLeadButton accountId={account.id} />
        </div>
      )}

      <AccountForm
        initial={{ ...(account as Account), repName: (account as any).rep?.full_name }}
        isManager={isManager}
        currentUserId={user?.id ?? ""}
        currentUserName={profile?.full_name ?? user?.email ?? "You"}
        submitLabel="Save changes"
        onSubmit={updateWithId}
      />

      <Link href="/leads" className="text-sm text-primary hover:underline w-fit">
        View leads for this account →
      </Link>

      {isManager && (
        <div className="border-t pt-4">
          <DeleteAccountButton accountId={account.id} />
        </div>
      )}
    </div>
  );
}
