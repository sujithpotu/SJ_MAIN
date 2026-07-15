import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { type LeadStage } from "@/types/database";

interface LeadRow {
  id: string;
  stage: LeadStage;
  expected_order_date: string | null;
  account: { name: string } | null;
  lead_items: { quantity: number; unit_price: number }[];
}

const STAGE_VARIANT: Record<LeadStage, "default" | "secondary" | "outline" | "destructive"> = {
  "New Lead": "outline",
  "Site Visit": "secondary",
  "Quotation Sent": "secondary",
  Negotiation: "default",
  Won: "default",
  Lost: "destructive",
};

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, stage, expected_order_date, account:accounts(name), lead_items(quantity, unit_price)"
    )
    .order("created_at", { ascending: false });

  const leads = (data as unknown as LeadRow[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Full pipeline from New Lead through Won/Lost.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Expected order date</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const total = lead.lead_items.reduce(
                (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
                0
              );
              return (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.account?.name ?? "Unknown account"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STAGE_VARIANT[lead.stage]}>{lead.stage}</Badge>
                  </TableCell>
                  <TableCell>
                    {lead.expected_order_date ? formatDate(lead.expected_order_date) : "—"}
                  </TableCell>
                  <TableCell>{total > 0 ? formatCurrency(total) : "—"}</TableCell>
                </TableRow>
              );
            })}
            {leads.length === 0 && !error && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No leads yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
