import { CatalogLayout } from "@/components/templates/CatalogLayout";
import { AuthModal } from "@/components/organisms/AuthModal";
export default function AuthPage() { return <CatalogLayout><div className="min-h-[60vh]" /><AuthModal initialVariant="login" /></CatalogLayout>; }
