import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ACCOUNT_TYPES } from "@/types/database";

interface AccountRow {
  id: string;
  name: string;
  type: string;
  location: string | null;
  contact_person: string | null;
  phone: string | null;
  status: "prospect" | "active";
  rep: { full_name: string | null } | null;
}

function typeLabel(value: string) {
  return ACCOUNT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, name, type, location, contact_person, phone, status, rep:profiles!assigned_rep(full_name)"
    )
    .order("created_at", { ascending: false });

  const accounts = (data as unknown as AccountRow[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Dealers, contractors, RMC plants, and project sites.
          </p>
        </div>
        <Button asChild>
          <Link href="/accounts/new">New account</Link>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned rep</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id} className="cursor-pointer">
                <TableCell className="font-medium p-0">
                  <Link href={`/accounts/${account.id}`} className="block px-2 py-2">
                    {account.name}
                  </Link>
                </TableCell>
                <TableCell>{typeLabel(account.type)}</TableCell>
                <TableCell>{account.location ?? "—"}</TableCell>
                <TableCell>{account.contact_person ?? "—"}</TableCell>
                <TableCell>{account.phone ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={account.status === "prospect" ? "outline" : "secondary"}>
                    {account.status}
                  </Badge>
                </TableCell>
                <TableCell>{account.rep?.full_name ?? "Unassigned"}</TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No accounts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
