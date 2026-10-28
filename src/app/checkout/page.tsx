import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { CheckoutView } from "@/components/organisms/CheckoutView";

export default function CheckoutPage() {
  return (
    <CatalogLayout>
      <div className="catalog-heading">
        <p className="eyebrow">ÚLTIMO PASO</p>
        <h1 className="font-serif font-light text-foreground">Tu pedido</h1>
      </div>
      <CheckoutView />
    </CatalogLayout>
  );
}

// El checkout lee los medios de pago de la tienda en cada visita: si el admin
// los cambia, no puede quedar una version vieja cacheada cobrando a otra cuenta.
export const dynamic = "force-dynamic";
