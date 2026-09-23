import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { CartView } from "@/components/organisms/CartView";

export default function CartPage() {
  return (
    <CatalogLayout>
      <div className="catalog-heading"><p className="eyebrow">TU SELECCIÓN PERSONAL</p><h1 className="font-serif font-light text-foreground">
        Tu carrito
      </h1></div>
      <CartView />
    </CatalogLayout>
  );
}

