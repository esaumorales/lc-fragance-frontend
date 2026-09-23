import type { ReactNode } from "react";
import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { AdminGuard } from "@/components/organisms/AdminGuard";
import { AdminSidebar } from "@/components/organisms/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <CatalogLayout>
      <AdminGuard>
        <div className="admin-shell grid gap-8 md:grid-cols-[200px_minmax(0,1fr)]">
          <AdminSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </AdminGuard>
    </CatalogLayout>
  );
}

