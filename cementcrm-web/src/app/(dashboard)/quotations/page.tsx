import { createClient } from "@/lib/supabase/server";
import { ApprovalQueue, type QuotationRow } from "@/components/quotations/approval-queue";

interface RawQuotation {
  id: string;
  status: QuotationRow["status"];
  notes: string | null;
  created_at: string;
  lead: {
    id: string;
    expected_order_date: string | null;
    account: {
      name: string;
      location: string | null;
      contact_person: string | null;
      phone: string | null;
    } | null;
  } | null;
  quotation_items: {
    id: string;
    quantity: number;
    unit_price: number;
    product: { name: string } | null;
  }[];
}

export default async function QuotationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profileRes, quotationsRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("role").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotations")
      .select(
        "id, status, notes, created_at, lead:leads(id, expected_order_date, account:accounts(name, location, contact_person, phone)), quotation_items(id, quantity, unit_price, product:products(name))"
      )
      .order("created_at", { ascending: false }),
  ]);

  const isManager = profileRes.data?.role === "manager";
  const raw = (quotationsRes.data as unknown as RawQuotation[]) ?? [];

  const quotations: QuotationRow[] = raw.map((q) => ({
    id: q.id,
    leadId: q.lead?.id ?? "",
    status: q.status,
    notes: q.notes,
    created_at: q.created_at,
    accountName: q.lead?.account?.name ?? "Unknown account",
    accountLocation: q.lead?.account?.location ?? null,
    accountContact: q.lead?.account?.contact_person ?? null,
    accountPhone: q.lead?.account?.phone ?? null,
    expectedOrderDate: q.lead?.expected_order_date ?? null,
    items: q.quotation_items.map((item) => ({
      id: item.id,
      productName: item.product?.name ?? "Unknown product",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
    })),
  }));

  const pending = quotations.filter((q) => q.status === "pending_approval");
  const rest = quotations.filter((q) => q.status !== "pending_approval");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Quotations</h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "Review and approve discounted quotations across your whole team."
            : "Quotations for your accounts."}
        </p>
      </div>

      {quotationsRes.error && (
        <p className="text-sm text-destructive">{quotationsRes.error.message}</p>
      )}

      {pending.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Needs review ({pending.length})
          </h2>
          <ApprovalQueue quotations={pending} isManager={isManager} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">All quotations</h2>
        <ApprovalQueue quotations={rest} isManager={isManager} />
      </section>
    </div>
  );
}
