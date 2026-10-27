import type { ReactNode } from "react";
import { Navbar } from "@/components/organisms/Navbar";
import { Footer } from "@/components/organisms/Footer";
import { fetchCategories } from "@/lib/api";
import { enlacesDeCategorias } from "@/lib/menu-categorias";
import type { EnlaceDeCategoria } from "@/lib/menu-categorias";

type CatalogLayoutProps = {
  children: ReactNode;
  hero?: ReactNode;
};

/**
 * Si el backend no contesta se sigue sin secciones.
 *
 * Es preferible a adivinar: los enlaces que se mostrarian apuntan a paginas
 * que tampoco cargarian, y el resto del sitio funciona igual sin ellos.
 */
async function enlacesDelMenu(): Promise<EnlaceDeCategoria[]> {
  try {
    return enlacesDeCategorias(await fetchCategories());
  } catch {
    return [];
  }
}

export async function CatalogLayout({ children, hero }: CatalogLayoutProps) {
  const enlaces = await enlacesDelMenu();

  return (
    <div className="veil flex min-h-screen flex-col bg-background">
      <Navbar enlaces={enlaces} />
      {hero}
      <main className="site-main mx-auto w-full flex-1">{children}</main>
      <Footer enlaces={enlaces} />
    </div>
  );
}
