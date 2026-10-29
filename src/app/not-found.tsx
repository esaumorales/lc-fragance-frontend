import Link from "next/link";
import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { Icon } from "@/components/atoms/Icon";

export default function NoEncontrada() {
  return (
    <CatalogLayout>
      <section className="pantalla-de-aviso">
        <p className="pantalla-de-aviso-codigo">404</p>
        <h1>Esta página no existe</h1>
        <p className="pantalla-de-aviso-texto">
          Puede que la dirección esté mal escrita, o que lo que buscabas ya no esté en el catálogo.
        </p>

        <div className="pantalla-de-aviso-acciones">
          <Link href="/" className="editorial-cta">
            Volver al inicio
            <Icon icon="mdi:arrow-top-right" className="h-4 w-4" />
          </Link>
          <Link href="/perfumes" className="editorial-link">
            Ver la colección <span>↗</span>
          </Link>
        </div>
      </section>
    </CatalogLayout>
  );
}
