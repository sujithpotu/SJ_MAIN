import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/accounts/account-form";
import { createAccount } from "../actions";

export default async function NewAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).single()
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New account</h1>
      <AccountForm
        isManager={profile?.role === "manager"}
        currentUserId={user?.id ?? ""}
        currentUserName={profile?.full_name ?? user?.email ?? "You"}
        submitLabel="Create account"
        onSubmit={createAccount}
      />
    </div>
  );
}
