import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
});

socket.on("connect", () => {
  console.log("[socket] connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("[socket] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("[socket] connection error:", err.message);
});

export default socket;
