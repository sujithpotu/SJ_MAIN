import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";
import type { Profile } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data as Profile | null;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-muted/30 p-4 sm:flex sm:flex-col">
        <div className="mb-6 flex items-center gap-2 px-1">
          <Image src="/logo.webp" alt="SPCC" width={32} height={32} className="rounded" />
          <span className="text-sm font-semibold">SPCC CRM</span>
        </div>
        <SidebarNav />
        <div className="mt-auto pt-4 border-t">
          <p className="px-1 text-xs text-muted-foreground truncate">
            {profile?.full_name ?? user?.email}
          </p>
          <p className="px-1 text-xs text-muted-foreground capitalize">{profile?.role}</p>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-6 sm:hidden">
          <span className="text-sm font-semibold">SPCC CRM</span>
        </header>
        <header className="hidden h-14 items-center justify-end border-b px-6 sm:flex">
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
