import { createClient } from "@/lib/supabase/client";

const BUCKET = "complaint-attachments";

export async function uploadComplaintAttachment(file: File, complaintId: string): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${complaintId}/${Date.now()}-${safeName}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });

  if (error) throw error;
  return path;
}

export async function getComplaintAttachmentUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}
