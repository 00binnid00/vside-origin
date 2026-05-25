"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getAccessToken } from "@/lib/auth/tokenStore";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080";

const normalizeId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

export function useWorkspacePresence({ workspaceId, enabled = true, user }) {
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [connected, setConnected] = useState(false);

  const clientRef = useRef(null);
  const workspaceIdRef = useRef(workspaceId);

  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  const publish = useCallback((type) => {
    const client = clientRef.current;
    const currentWorkspaceId = workspaceIdRef.current;

    if (!client || !client.connected || !currentWorkspaceId) {
      return false;
    }

    client.publish({
      destination: `/app/presence/${currentWorkspaceId}`,
      body: JSON.stringify({
        type,
        workspaceId: currentWorkspaceId,
      }),
    });

    return true;
  }, []);

  useEffect(() => {
    if (!enabled || !workspaceId || !user?.id) {
      setOnlineMembers([]);
      setConnected(false);
      return undefined;
    }

    const accessToken = getAccessToken();

    if (!accessToken) {
      setOnlineMembers([]);
      setConnected(false);
      return undefined;
    }

    let cancelled = false;
    let heartbeatTimerId = null;

    const client = new Client({
      brokerURL: `${WS_BASE_URL}/ws/presence`,
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        if (cancelled) {
          client.deactivate().catch(() => {});
          return;
        }

        setConnected(true);

        client.subscribe(
          `/topic/workspace/${workspaceId}/presence`,
          (stompMessage) => {
            try {
              const message = JSON.parse(stompMessage.body);

              if (message.type === "STATE" && Array.isArray(message.members)) {
                setOnlineMembers(message.members);
              }

              if (message.type === "ERROR") {
                console.warn("[Presence ERROR]", message.errorMessage);
              }
            } catch (error) {
              console.error("Presence 메시지 파싱 실패:", error);
            }
          },
        );

        client.publish({
          destination: `/app/presence/${workspaceId}`,
          body: JSON.stringify({
            type: "JOIN",
            workspaceId,
          }),
        });

        heartbeatTimerId = window.setInterval(() => {
          if (!client.connected) return;

          client.publish({
            destination: `/app/presence/${workspaceId}`,
            body: JSON.stringify({
              type: "HEARTBEAT",
              workspaceId,
            }),
          });
        }, 25000);
      },
      onDisconnect: () => {
        setConnected(false);
      },
      onWebSocketClose: () => {
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("Presence STOMP 에러:", frame);
      },
    });

    clientRef.current = client;
    client.activate();

    const handleBeforeUnload = () => {
      publish("LEAVE");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;

      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (heartbeatTimerId) {
        window.clearInterval(heartbeatTimerId);
      }

      publish("LEAVE");

      if (clientRef.current) {
        clientRef.current.deactivate().catch(() => {});
        clientRef.current = null;
      }

      setConnected(false);
      setOnlineMembers([]);
    };
  }, [enabled, workspaceId, user?.id, publish]);

  const onlineUserIdSet = useMemo(() => {
    return new Set(
      onlineMembers
        .map((member) => normalizeId(member.userId ?? member.id))
        .filter(Boolean),
    );
  }, [onlineMembers]);

  return {
    connected,
    onlineMembers,
    onlineUserIdSet,
    onlineCount: onlineMembers.length,
    isOnline: (userId) => onlineUserIdSet.has(normalizeId(userId)),
  };
}

export default useWorkspacePresence;
