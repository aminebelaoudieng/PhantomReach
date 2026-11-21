export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/dashboard/sidebar";
import { requireCurrentUser } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();

  return (
    <div className="flex h-screen">
      <Sidebar
        hosted={process.env.PHANTOM_DB_BACKEND === "supabase"}
        linked={!!user.auth_user_id}
        user={{
          name: user.name,
          email: user.email,
        }}
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
