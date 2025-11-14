// app.js - socket-enabled frontend API helpers
// CHANGE API_BASE if your backend is at a different host/port
const API_BASE = "https://0ba6d91694c2.ngrok-free.app/api"; // adjust if needed
const SOCKET_IO_SRC = "https://cdn.socket.io/4.7.2/socket.io.min.js"; // CDN for socket.io client

// dynamically load socket.io client script
function loadSocketIoClient(callback) {
  if (window.io) return callback();
  const s = document.createElement('script');
  s.src = SOCKET_IO_SRC;
  s.onload = callback;
  s.onerror = () => console.error("Failed to load socket.io client");
  document.head.appendChild(s);
}

// helper to do fetch + json + error handling (used for REST fallbacks)
async function apiFetch(path, opts = {}) {
  const url = (path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/')? path : '/' + path}`);
  const res = await fetch(url, opts);
  const json = await res.json().catch(()=> ({}));
  return { ok: res.ok, status: res.status, data: json };
}

// small helper to format timestamp (basic)
function fmtTime(ts) {
  return ts;
}

// Socket wrapper (singleton)
const SocketClient = (function(){
  let socket = null;
  let connected = false;
  const listeners = {};

  function init(onConnect) {
    return new Promise((resolve, reject) => {
      loadSocketIoClient(() => {
        try {
          socket = io("https://0ba6d91694c2.ngrok-free.app", {
            path: "/socket.io/",
            transports: ["websocket", "polling"]
          });

          socket.on("connect", () => {
            connected = true;
            console.log("socket connected", socket.id);
            if (onConnect) onConnect();
            resolve(socket);
          });

          socket.on("disconnect", () => {
            connected = false;
            console.log("socket disconnected");
          });

          socket.on("receive_message", (data) => {
            // forward to registered listeners
            (listeners["receive_message"] || []).forEach(fn => fn(data));
          });

          socket.on("user_online", (data) => {
            (listeners["user_online"] || []).forEach(fn => fn(data));
          });
          socket.on("user_offline", (data) => {
            (listeners["user_offline"] || []).forEach(fn => fn(data));
          });
          socket.on("online_list", (data) => {
            (listeners["online_list"] || []).forEach(fn => fn(data));
          });

          socket.on("error", (d) => {
            console.error("socket error:", d);
          });
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  function on(event, fn) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(fn);
  }

  function emit(event, payload) {
    if (!socket) {
      console.warn("socket not initialized; falling back to REST for send_message");
      return;
    }
    socket.emit(event, payload);
  }

  function getSocket() { return socket; }
  function isConnected() { return connected; }

  return { init, on, emit, getSocket, isConnected };
})();

// export
window.apiFetch = apiFetch;
window.fmtTime = fmtTime;
window.SocketClient = SocketClient;
window.API_BASE = API_BASE;
