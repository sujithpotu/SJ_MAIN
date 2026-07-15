import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LEAD_STAGES, type LeadStage } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [accountsRes, leadsRes, pendingQuotationsRes, ordersRes, openComplaintsRes] =
    await Promise.all([
      supabase.from("accounts").select("status"),
      supabase.from("leads").select("stage"),
      supabase.from("quotations").select("id", { count: "exact", head: true }).eq(
        "status",
        "pending_approval"
      ),
      supabase.from("sales_orders").select("status"),
      supabase
        .from("complaints")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "in_progress"]),
    ]);

  const accounts = accountsRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const orders = ordersRes.data ?? [];

  const prospectCount = accounts.filter((a) => a.status === "prospect").length;
  const activeCount = accounts.filter((a) => a.status === "active").length;

  const leadsByStage = LEAD_STAGES.reduce<Record<LeadStage, number>>((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage).length;
    return acc;
  }, {} as Record<LeadStage, number>);

  const openLeads = leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost").length;

  const ordersInFlight = orders.filter(
    (o) => o.status !== "delivered"
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live snapshot of your pipeline, scoped to what you can see (rep: your accounts,
          manager: everyone).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{accounts.length}</p>
            <p className="text-xs text-muted-foreground">
              {activeCount} active · {prospectCount} prospects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openLeads}</p>
            <p className="text-xs text-muted-foreground">{leads.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotations pending approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingQuotationsRes.count ?? 0}</p>
            <Link href="/quotations" className="text-xs text-primary hover:underline">
              Review queue →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Orders in flight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{ordersInFlight}</p>
            <p className="text-xs text-muted-foreground">{orders.length} total orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open complaints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{openComplaintsRes.count ?? 0}</p>
            <Link href="/complaints" className="text-xs text-primary hover:underline">
              View complaints →
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead pipeline by stage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {LEAD_STAGES.map((stage) => (
              <div
                key={stage}
                className="flex min-w-32 flex-1 flex-col gap-1 rounded-lg border p-3"
              >
                <span className="text-xs text-muted-foreground">{stage}</span>
                <span className="text-xl font-semibold">{leadsByStage[stage]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(pendingQuotationsRes.count ?? 0) > 0 && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              Action needed
              <Badge variant="secondary">{pendingQuotationsRes.count} pending</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {pendingQuotationsRes.count} quotation(s) are waiting for approval.{" "}
              <Link href="/quotations" className="underline">
                Go to the approval queue
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
