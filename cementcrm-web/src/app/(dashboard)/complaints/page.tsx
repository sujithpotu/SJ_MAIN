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
import { formatDate } from "@/lib/format";
import { COMPLAINT_STATUS_LABELS, type ComplaintSeverity, type ComplaintStatus } from "@/types/database";

interface ComplaintRow {
  id: string;
  complaint_number: string;
  type: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  created_at: string;
  account: { name: string } | null;
}

const STATUS_VARIANT: Record<ComplaintStatus, "default" | "secondary" | "outline" | "destructive"> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  closed: "outline",
};

const SEVERITY_VARIANT: Record<ComplaintSeverity, "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

export default async function ComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status && FILTERS.some((f) => f.value === status) ? status : "open";

  const supabase = await createClient();
  let query = supabase
    .from("complaints")
    .select("id, complaint_number, type, severity, status, created_at, account:accounts(name)")
    .order("created_at", { ascending: false });

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data, error } = await query;
  const complaints = (data as unknown as ComplaintRow[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Complaints</h1>
          <p className="text-sm text-muted-foreground">
            Quality, delivery, billing and sales complaints.
          </p>
        </div>
        <Button asChild>
          <Link href="/complaints/new">New complaint</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "open" ? "/complaints" : `/complaints?status=${f.value}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              activeFilter === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Complaint #</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell className="font-medium p-0">
                  <Link href={`/complaints/${c.id}`} className="block px-2 py-2">
                    {c.complaint_number}
                  </Link>
                </TableCell>
                <TableCell>{c.account?.name ?? "Unknown account"}</TableCell>
                <TableCell className="capitalize">{c.type}</TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Badge>
                </TableCell>
                <TableCell>{formatDate(c.created_at)}</TableCell>
              </TableRow>
            ))}
            {complaints.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No complaints here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
