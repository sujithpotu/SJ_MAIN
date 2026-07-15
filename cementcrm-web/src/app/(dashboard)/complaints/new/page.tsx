import { ComplaintForm } from "@/components/complaints/complaint-form";
import { createComplaint } from "../actions";

export default function NewComplaintPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">New complaint</h1>
      <ComplaintForm submitLabel="Create complaint" onSubmit={createComplaint} />
    </div>
  );
}
