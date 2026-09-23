"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { esSuperadmin } from "@/lib/roles";
import { authorizedFetch } from "@/lib/authorized-fetch";
type Summary = { products: number; categories: number; lowStock: number; pendingOrders: number; recentProducts: { id: string; name: string; sku: string; stock: number; price: string }[] };
export default function AdminHomePage() {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    authorizedFetch<Summary>(accessToken, "/api/admin/summary").then(result => { if(active) { setData(result); setError(false); } }).catch(() => { if(active) setError(true); });
    return () => { active = false; };
  }, [accessToken, attempt]);
  return <div className="flex flex-col gap-8">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-7"><div><p className="caps text-primary">LC FRAGANCE · ADMINISTRACIÓN</p><h1 className="mt-3 font-serif text-4xl">Hola, {user?.name.split(" ")[0] ?? "administrador"}</h1><p className="mt-2 text-sm text-muted-foreground">Así está tu tienda hoy.</p></div><Link href="/admin/productos" className="gold-button px-5 py-3 text-xs">Gestionar productos ↗</Link></div>
    {error ? <div role="alert" className="surface p-5 text-sm">No pudimos cargar el resumen. <button className="text-primary underline" onClick={() => setAttempt(n => n + 1)}>Reintentar</button></div> : <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[{ label:"Productos activos", value:data?.products }, {label:"Categorías", value:data?.categories}, {label:"Stock bajo (≤ 5)", value:data?.lowStock}, {label:"Pedidos pendientes", value:data?.pendingOrders}].map((stat, index) => <div key={stat.label} className="surface p-5"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{stat.label}</p><p className={`mt-4 font-serif text-4xl ${index === 2 ? "text-primary" : "text-foreground"}`}>{stat.value ?? "—"}</p></div>)}</div>}
    <section className="surface overflow-hidden"><div className="flex items-center justify-between border-b border-hairline p-5"><h2 className="font-serif text-2xl">Últimas actualizaciones</h2><Link href="/admin/productos" className="text-xs text-primary">Ver inventario ↗</Link></div><div className="overflow-x-auto"><table className="text-left text-sm"><thead className="text-muted-foreground"><tr><th>Producto</th><th>Precio</th><th>Stock</th></tr></thead><tbody>{data?.recentProducts.map(product => <tr key={product.id} className="border-t border-hairline"><td><p>{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.sku}</p></td><td>${product.price}</td><td><span className={`rounded-full px-3 py-1 text-xs ${product.stock <= 5 ? "bg-primary/10 text-primary" : "bg-secondary text-foreground"}`}>{product.stock === 0 ? "Agotado" : `${product.stock} unidades`}</span></td></tr>)}</tbody></table></div>{!data && !error && <p role="status" className="p-5 text-sm text-muted-foreground">Cargando actividad…</p>}{data?.recentProducts.length === 0 && <p className="p-5 text-sm text-muted-foreground">Tu catálogo está listo para su primer producto.</p>}</section>
    {esSuperadmin(user?.role) && <Link href="/admin/administradores" className="surface flex items-center justify-between p-6"><div><h2 className="font-serif text-2xl">Administradores</h2><p className="mt-2 text-sm text-muted-foreground">Quién entra al panel: invitar, suspender o quitar el acceso.</p></div><span className="text-primary">↗</span></Link>}
    <Link href="/admin/categorias" className="surface flex items-center justify-between p-6"><div><h2 className="font-serif text-2xl">Organiza tu colección</h2><p className="mt-2 text-sm text-muted-foreground">Gestiona las categorías de perfumes y tecnología.</p></div><span className="text-primary">↗</span></Link>
  </div>;
}
