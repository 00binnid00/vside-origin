"use client";

import React, { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { useSelector, useDispatch } from "react-redux";
import { setIsPreviewVisible } from "@/store/slices/uiSlice";
import {
  VscClose,
  VscGlobe,
  VscRefresh,
  VscChromeMinimize,
  VscChromeRestore,
  VscChromeMaximize,
} from "react-icons/vsc";
import { buildProxiedPreviewUrl } from "@/lib/ide/previewUrl";

const PREVIEW_HOST = process.env.NEXT_PUBLIC_PREVIEW_HOST || "";
const PREVIEW_PROTOCOL = process.env.NEXT_PUBLIC_PREVIEW_PROTOCOL || "http";

const hasProtocol = (url) => /^https?:\/\//i.test(String(url || ""));

const getCurrentBrowserHost = () => {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
};

const normalizePreviewUrl = (rawUrl) => {
  if (!rawUrl) return "";

  const trimmedUrl = String(rawUrl).trim();

  const withProtocol = hasProtocol(trimmedUrl)
    ? trimmedUrl
    : `${PREVIEW_PROTOCOL}://${trimmedUrl}`;

  try {
    const url = new URL(withProtocol);

    const isLocalPreviewHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (isLocalPreviewHost) {
      // https 배포에서는 임시 포트에 직접 붙지 못한다. 서버를 거치는 주소로 바꾼다.
      // 주소창에 localhost:포트 를 직접 쳤을 때도 여기를 지난다.
      const proxiedUrl = url.port
        ? buildProxiedPreviewUrl(url.port, `${url.pathname}${url.search}${url.hash}`)
        : null;

      if (proxiedUrl) return proxiedUrl;

      const replacementHost = PREVIEW_HOST || getCurrentBrowserHost();

      if (replacementHost) {
        url.protocol = `${PREVIEW_PROTOCOL}:`;
        url.hostname = replacementHost;
      }
    }

    return url.toString();
  } catch {
    return withProtocol;
  }
};

export default function WebPreview() {
  const dispatch = useDispatch();

  const {
    isPreviewVisible,
    previewUrl: reduxPreviewUrl,
    guiPreviewUrl,
    isGuiAppReady,
    isRunning,
  } = useSelector((state) => state.ui);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const [inputUrl, setInputUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");

  // 창(Swing)을 쓰는 프로그램을 실행했을 때만 탭이 생긴다. "app" = 앱 화면, "api" = API 서버.
  // 창을 안 쓰는 실행에서는 guiPreviewUrl 이 비어 있어 예전 화면과 똑같다.
  //
  // "API 서버 탭을 골랐다"를 어느 실행의 앱 화면에서 골랐는지와 함께 기억한다. 실행마다
  // 주소(포트)가 달라지므로, 새로 실행하면 따로 되돌리지 않아도 앱 화면 탭부터 보인다.
  const [apiTabChosenFor, setApiTabChosenFor] = useState("");
  const appScreenUrl = guiPreviewUrl ? normalizePreviewUrl(guiPreviewUrl) : "";
  const hasAppScreen = Boolean(appScreenUrl);
  const activeTab = apiTabChosenFor === guiPreviewUrl ? "api" : "app";
  const isAppTab = hasAppScreen && activeTab === "app";

  const [rndState, setRndState] = useState({
    width: 600,
    height: 450,
    x: 0,
    y: 0,
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    setRndState((prev) => ({
      ...prev,
      x: Math.max(window.innerWidth - 650, 20),
      y: 50,
    }));
  }, []);

  useEffect(() => {
    if (!reduxPreviewUrl) return;

    const normalizedUrl = normalizePreviewUrl(reduxPreviewUrl);

    setInputUrl(normalizedUrl);
    setActiveUrl(normalizedUrl);
    setRefreshKey((prev) => prev + 1);
  }, [reduxPreviewUrl]);

  const handleUrlSubmit = (e) => {
    if (e.key !== "Enter") return;

    const normalizedUrl = normalizePreviewUrl(inputUrl);

    setInputUrl(normalizedUrl);
    setActiveUrl(normalizedUrl);
    setRefreshKey((prev) => prev + 1);
  };

  const handleMinimize = (e) => {
    e.stopPropagation();

    setIsMinimized((prev) => {
      const next = !prev;

      if (next) {
        setIsMaximized(false);
      }

      return next;
    });
  };

  const handleMaximize = (e) => {
    e.stopPropagation();

    setIsMaximized((prev) => {
      const next = !prev;

      if (next) {
        setIsMinimized(false);
      }

      return next;
    });
  };

  const handleClose = (e) => {
    e.stopPropagation();
    dispatch(setIsPreviewVisible(false));
  };

  if (!isPreviewVisible || !isMounted) return null;

  const currentSize = isMinimized
    ? { width: 300, height: 44 }
    : isMaximized
      ? { width: window.innerWidth * 0.85, height: window.innerHeight * 0.85 }
      : { width: rndState.width, height: rndState.height };

  const currentPosition = isMaximized
    ? { x: window.innerWidth * 0.075, y: window.innerHeight * 0.075 }
    : { x: rndState.x, y: rndState.y };

  return (
    <Rnd
      size={currentSize}
      position={currentPosition}
      onDragStop={(e, d) => {
        if (!isMaximized) {
          setRndState((prev) => ({
            ...prev,
            x: d.x,
            y: d.y,
          }));
        }
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (isMaximized || isMinimized) return;

        setRndState({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        });
      }}
      minWidth={300}
      minHeight={44}
      disableDragging={isMaximized}
      enableResizing={!isMaximized && !isMinimized}
      dragHandleClassName="preview-header"
      bounds="window"
      className="z-[9999]"
      style={{
        transition: isMaximized ? "all 0.25s ease-in-out" : "none",
      }}
    >
      <div
        className={`w-full h-full bg-[#f3f4f6] border border-gray-300 shadow-2xl flex flex-col overflow-hidden ${
          isMinimized ? "rounded-lg" : "rounded-xl"
        }`}
      >
        <div className="preview-header bg-gray-200 px-4 py-2.5 flex items-center justify-between cursor-move select-none border-b border-gray-300 h-[44px] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500"></div>
            </div>

            <div className="ml-3 flex items-center gap-1.5 text-gray-600 min-w-0">
              <VscGlobe size={14} className="text-blue-500 shrink-0" />
              <span className="text-[12px] font-bold tracking-tight truncate">
                웹 미리보기
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMinimize}
              className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500"
              title={isMinimized ? "복원" : "최소화"}
            >
              {isMinimized ? (
                <VscChromeRestore size={16} />
              ) : (
                <VscChromeMinimize size={16} />
              )}
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMaximize}
              className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500 disabled:opacity-40"
              title={isMaximized ? "복원" : "최대화"}
              disabled={isMinimized}
            >
              {isMaximized ? (
                <VscChromeRestore size={16} />
              ) : (
                <VscChromeMaximize size={16} />
              )}
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500"
              title="닫기"
            >
              <VscClose size={16} strokeWidth={1} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-b border-gray-300 shrink-0">
              <button
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                title="새로고침"
              >
                <VscRefresh size={16} />
              </button>

              {hasAppScreen && (
                <div className="flex shrink-0 rounded-md border border-gray-300 bg-white p-0.5 text-[12px] font-bold">
                  {[
                    { id: "app", label: "앱 화면" },
                    { id: "api", label: "API 서버" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setApiTabChosenFor(tab.id === "api" ? guiPreviewUrl : "")
                      }
                      className={`px-2.5 py-1 rounded transition-colors ${
                        activeTab === tab.id
                          ? "bg-blue-500 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 앱 화면에는 사용자가 칠 주소가 없다. 주소창은 API 서버 탭에서만 보인다. */}
              {isAppTab ? (
                <span className="flex-1 truncate text-[12px] text-gray-500">
                  내 프로그램이 띄운 창이에요. 클릭하고 입력할 수 있어요.
                </span>
              ) : (
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={handleUrlSubmit}
                  placeholder="http://IP:포트 입력 후 엔터"
                  className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-[12px] text-gray-700 font-mono shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              )}
            </div>

            <div className="flex-1 bg-white relative">
              {/* 탭을 오가도 화면이 다시 연결되지 않게 둘 다 붙여 두고 가리기만 한다. */}
              {hasAppScreen && (
                <div
                  className={`absolute inset-0 z-10 bg-[#1f2937] ${
                    isAppTab ? "block" : "hidden"
                  }`}
                >
                  <iframe
                    key={`app-${appScreenUrl}-${refreshKey}`}
                    src={appScreenUrl}
                    className="absolute inset-0 w-full h-full border-none"
                    title="App Screen"
                  />

                  {/* 앱이 켜지기 전에는 빈 화면만 보인다. 고장으로 오해하지 않게 덮어 둔다. */}
                  {!isGuiAppReady && isRunning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                      <p className="text-[13px] font-bold">앱이 켜지는 중이에요…</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        다 켜지면 여기에 창이 나타나요.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeUrl ? (
                <iframe
                  key={refreshKey}
                  src={activeUrl}
                  className="absolute inset-0 w-full h-full border-none bg-white"
                  title="Web Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <VscGlobe
                    size={48}
                    className="mb-3 opacity-30 text-blue-500"
                  />
                  <p className="text-[13px] font-bold">
                    서버 실행 로그를 기다리는 중입니다...
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    localhost 미리보기 주소를 현재 시연 IP로 자동 변환합니다.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
}
