import { createClient } from "@/lib/supabase/server";
import { LeadForm } from "@/components/leads/lead-form";
import { LeadItemsEditor } from "@/components/leads/lead-items-editor";
import { LeadQuotations } from "@/components/leads/lead-quotations";
import { LeadTimeline } from "@/components/leads/lead-timeline";
import { DeleteLeadButton } from "@/components/leads/lead-actions";
import type { QuotationRow } from "@/components/quotations/approval-queue";
import { updateLead } from "../actions";
import type { Lead } from "@/types/database";

interface RawQuotation {
  id: string;
  status: QuotationRow["status"];
  notes: string | null;
  created_at: string;
  quotation_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product: { name: string } | null;
  }[];
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, leadRes, itemsRes, quotationsRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("leads").select("*, account:accounts(name)").eq("id", id).single(),
    supabase
      .from("lead_items")
      .select("id, product_id, quantity, unit_price, product:products(name)")
      .eq("lead_id", id),
    supabase
      .from("quotations")
      .select(
        "id, status, notes, created_at, quotation_items(id, quantity, unit_price, product:products(name))"
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const lead = leadRes.data as (Lead & { account: { name: string } | null }) | null;

  if (leadRes.error || !lead) {
    return (
      <p className="text-sm text-destructive">
        {leadRes.error?.message ?? "Lead not found."}
      </p>
    );
  }

  const isManager = profileRes.data?.role === "manager";
  const locked = lead.stage === "Won" || lead.stage === "Lost";

  const items = ((itemsRes.data as any[]) ?? []).map((item) => ({
    id: item.id as string,
    product_id: item.product_id as string | null,
    quantity: String(item.quantity),
    unit_price: String(item.unit_price),
    productName: item.product?.name ?? "Unknown product",
  }));

  const quotations: QuotationRow[] = ((quotationsRes.data as unknown as RawQuotation[]) ?? []).map(
    (q) => ({
      id: q.id,
      leadId: id,
      status: q.status,
      notes: q.notes,
      created_at: q.created_at,
      accountName: lead.account?.name ?? "Unknown account",
      items: q.quotation_items.map((item) => ({
        id: item.id,
        productName: item.product?.name ?? "Unknown product",
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
      })),
    })
  );

  const hasPendingApproval = quotations.some((q) => q.status === "pending_approval");
  const updateWithId = updateLead.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{lead.account?.name ?? "Lead"}</h1>
        <p className="text-sm text-muted-foreground">{lead.stage}</p>
      </div>

      <LeadForm
        initial={lead}
        initialAccountName={lead.account?.name}
        submitLabel="Save changes"
        onSubmit={updateWithId}
      />

      <LeadItemsEditor leadId={id} initialItems={items} locked={locked} />

      <LeadQuotations
        leadId={id}
        quotations={quotations}
        isManager={isManager}
        hasPendingApproval={hasPendingApproval}
        locked={locked}
      />

      <LeadTimeline leadId={id} />

      {isManager && (
        <div className="border-t pt-4">
          <DeleteLeadButton leadId={id} />
        </div>
      )}
    </div>
  );
}
