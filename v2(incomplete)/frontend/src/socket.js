/**
 * socket.js — NetVision V2
 * Socket.IO client singleton
 */

import { io } from "socket.io-client";

// Connect to backend port 3001 (or relative via Vite dev proxy)
const BACKEND_URL = window.location.port === "5173" ? "http://localhost:3001" : window.location.origin;

export const socket = io(BACKEND_URL, {
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"]
});

export default socket;
