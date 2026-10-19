"use client";

let socket = null;

export const RunSocket = {
  connectAndRun: (url, payload, onMessage, onError, onClose) => {
    if (socket) {
      socket.onclose = null;
      socket.close();
    }

    const ws = new WebSocket(url);
    socket = ws;

    ws.onopen = () => {
      console.log("[RunSocket] Connected");
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      }
    };

    ws.onmessage = (e) => {
      if (onMessage) onMessage(e.data);
    };

    ws.onerror = (e) => {
      if (onError) onError(e);
    };

    ws.onclose = () => {
      if (socket === ws) {
        socket = null;
        if (onClose) onClose();
      }
    };
  },

  sendInput: (input) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "INPUT", input }));
    }
  },

  // 앱 화면(Swing)에 한글을 대신 쳐 달라고 한다. 서버가 실행 컨테이너에서 xdotool 로 친다.
  sendGuiText: (text) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "GUI_TYPE", text }));
    }
  },

  stop: () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "STOP" }));
    }
  },

  disconnect: () => {
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  },
};
