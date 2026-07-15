import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export async function LeadTimeline({ leadId }: { leadId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_stage_history")
    .select("id, stage, changed_at, comment, changed_by:profiles(full_name)")
    .eq("lead_id", leadId)
    .order("changed_at", { ascending: true });

  const history = (data as any[]) ?? [];
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Stage timeline</h3>
      <div className="flex flex-col gap-3 border-l pl-4">
        {history.map((entry) => (
          <div key={entry.id}>
            <p className="text-sm font-medium">{entry.stage}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(entry.changed_at)}
              {entry.changed_by?.full_name ? ` · ${entry.changed_by.full_name}` : ""}
            </p>
            {entry.comment && <p className="mt-1 text-sm italic">{entry.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
