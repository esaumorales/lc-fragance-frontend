import type { ReactNode } from "react";
import { Navbar } from "@/components/organisms/Navbar";
import { Footer } from "@/components/organisms/Footer";

type CatalogLayoutProps = {
  children: ReactNode;
  hero?: ReactNode;
};

export function CatalogLayout({ children, hero }: CatalogLayoutProps) {
  return (
    <div className="veil flex min-h-screen flex-col bg-background">
      <Navbar />
      {hero}
      <main className="site-main mx-auto w-full flex-1">{children}</main>
      <Footer />
    </div>
  );
}

