// API/Connection.ts

let socket: WebSocket | null = null;
let onMessageCallback: ((msg: any) => void) | null = null;
let reconnectTimer: number | null = null;

const messageQueue: any[] = [];
const MAX_QUEUE_SIZE = 50;

let currentToken: string | null = null;

export function connectSocket(
  token: string,
  onMessage: (msg: any) => void
) {
  // Reconnect if token changed
  if (socket && currentToken === token) return;

  disconnectSocket(); // safely close previous socket

  currentToken = token;
  onMessageCallback = onMessage;

  const url = `ws://localhost:8000/ws/chat?token=${encodeURIComponent(token)}`;
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log("WebSocket connected");

    // Only send messages if socket is valid
    while (messageQueue.length > 0 && socket?.readyState === WebSocket.OPEN) {
      const msg = messageQueue.shift();
      if (msg) socket.send(JSON.stringify(msg));
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessageCallback?.(data);
    } catch {
      onMessageCallback?.({ type: "text", content: event.data });
    }
  };

  socket.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  socket.onclose = () => {
    console.warn("WebSocket closed");
    socket = null;

    // Auto-reconnect
    reconnectTimer = window.setTimeout(() => {
      if (currentToken && onMessageCallback) {
        connectSocket(currentToken, onMessageCallback);
      }
    }, 2000);
  };
}


export function sendMessage(payload: object) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    if (messageQueue.length < MAX_QUEUE_SIZE) {
      messageQueue.push(payload);
    }
    return;
  }

  socket.send(JSON.stringify(payload));
}

export function disconnectSocket() {
  reconnectTimer && clearTimeout(reconnectTimer);
  reconnectTimer = null;

  socket?.close();
  socket = null;
  onMessageCallback = null;
  currentToken = null;
  messageQueue.length = 0;
}
