import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/api-base";

let socket: Socket | null = null;

// Un solo socket compartido por pestaña, creado recién cuando algún
// componente lo necesita (evita conectar en cada render).
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}
