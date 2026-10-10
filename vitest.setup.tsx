import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Iconify busca cada icono por red y, cuando contesta, el entorno de jsdom ya
// se desmontó: ese setState tardío tira "window is not defined" y pone toda la
// corrida en rojo aunque no falle ninguna prueba. De un icono no hay nada que
// verificar más allá de cuál se pidió.
vi.mock("@iconify/react", () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-icon={icon} className={className} />
  ),
}));

afterEach(() => {
  cleanup();
});
