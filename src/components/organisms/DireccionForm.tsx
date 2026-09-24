"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { guardarDireccionRequest, verDireccionRequest } from "@/lib/auth-api";
import type { Direccion } from "@/lib/types";
import { Input } from "@/components/atoms/Input";
import { Button } from "@/components/atoms/Button";
import { Icon } from "@/components/atoms/Icon";
import { MapaDireccion } from "@/components/organisms/MapaDireccion";

const VACIA = {
  recipient: "",
  phone: "",
  street: "",
  reference: "",
  district: "",
  city: "",
  region: "",
  postalCode: "",
};

type Punto = { latitude: number; longitude: number } | null;

function desdeDireccion(direccion: Direccion) {
  return {
    recipient: direccion.recipient ?? "",
    phone: direccion.phone ?? "",
    street: direccion.street,
    reference: direccion.reference ?? "",
    district: direccion.district,
    city: direccion.city,
    region: direccion.region ?? "",
    postalCode: direccion.postalCode ?? "",
  };
}

export function DireccionForm({ accessToken }: { accessToken: string }) {
  const [form, setForm] = useState(VACIA);
  // El punto va aparte de los campos de texto: es opcional y lo maneja el mapa.
  const [punto, setPunto] = useState<Punto>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(() => {
    verDireccionRequest(accessToken)
      .then(({ direccion }) => {
        if (!direccion) return;
        setForm(desdeDireccion(direccion));
        if (direccion.latitude !== null && direccion.longitude !== null) {
          setPunto({ latitude: direccion.latitude, longitude: direccion.longitude });
        }
      })
      .catch(() => setError("No se pudo cargar tu dirección"))
      .finally(() => setCargando(false));
  }, [accessToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function campo(clave: keyof typeof VACIA) {
    return {
      value: form[clave],
      onChange: (e: { target: { value: string } }) => setForm({ ...form, [clave]: e.target.value }),
    };
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      const { direccion } = await guardarDireccionRequest(accessToken, {
        ...form,
        latitude: punto?.latitude ?? null,
        longitude: punto?.longitude ?? null,
      });
      setForm(desdeDireccion(direccion));
      setAviso("Dirección guardada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la dirección");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-primary" />
        Cargando…
      </p>
    );
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Sirve para coordinar el envío. El pedido se cierra por WhatsApp, así que el teléfono y la
        referencia son lo que más ayuda a encontrarte.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="auth-label">
          Quién recibe
          <Input {...campo("recipient")} placeholder="Si no sos vos" maxLength={120} className="w-full" />
        </label>
        <label className="auth-label">
          Teléfono
          <Input {...campo("phone")} type="tel" placeholder="999 888 777" maxLength={30} className="w-full" />
        </label>
      </div>

      <label className="auth-label">
        Calle y número
        <Input {...campo("street")} placeholder="Av. Siempre Viva 742" minLength={3} maxLength={160} required className="w-full" />
      </label>

      <label className="auth-label">
        Referencia
        <Input {...campo("reference")} placeholder="Portón negro, frente al parque" maxLength={200} className="w-full" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="auth-label">
          Distrito
          <Input {...campo("district")} placeholder="Miraflores" minLength={2} maxLength={120} required className="w-full" />
        </label>
        <label className="auth-label">
          Ciudad
          <Input {...campo("city")} placeholder="Lima" minLength={2} maxLength={120} required className="w-full" />
        </label>
        <label className="auth-label">
          Región
          <Input {...campo("region")} placeholder="Lima" maxLength={120} className="w-full" />
        </label>
        <label className="auth-label">
          Código postal
          <Input {...campo("postalCode")} placeholder="15074" maxLength={20} className="w-full" />
        </label>
      </div>

      <MapaDireccion
        latitude={punto?.latitude ?? null}
        longitude={punto?.longitude ?? null}
        onCambio={setPunto}
      />

      {error ? (
        <p role="alert" className="border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p className="flex items-center gap-2 text-sm text-primary">
          <Icon icon="mdi:check-circle-outline" className="h-4 w-4" />
          {aviso}
        </p>
      ) : null}

      <Button type="submit" disabled={guardando} className="w-fit">
        {guardando ? "Guardando…" : "Guardar dirección"}
      </Button>
    </form>
  );
}
