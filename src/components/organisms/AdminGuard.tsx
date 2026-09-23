"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@/components/atoms/Icon";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "ADMIN") {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || user?.role !== "ADMIN") {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
        Verificando acceso…
      </div>
    );
  }

  return <>{children}</>;
}
