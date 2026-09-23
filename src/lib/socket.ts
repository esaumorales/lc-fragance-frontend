import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

let socket: Socket | null = null;

// Un solo socket compartido por pestaña, creado recién cuando algún
// componente lo necesita (evita conectar en cada render).
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true });
  }
  return socket;
}
