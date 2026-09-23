import { ElegirContrasena } from "@/components/organisms/ElegirContrasena";

// El token llega por la URL del correo y se lee en el servidor: asi no hace
// falta useSearchParams ni el Suspense que arrastra.
type PageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const valor = Array.isArray(token) ? token[0] : token;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-4 py-16">
      <ElegirContrasena token={valor} variante="invitacion" />
    </main>
  );
}
