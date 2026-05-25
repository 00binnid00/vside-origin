"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  Clock,
  Timer,
  Link2,
} from "lucide-react";

const API_BASE = "http://localhost:8080";

type HttpMethod = "GET" | "POST" | "PUT" | "DEL";

interface Param {
  key: string;
  value: string;
  desc: string;
  enabled: boolean;
}

interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
}

interface SavedTestItem {
  id: string | number;
  title: string;
  method: HttpMethod;
  url: string;
  params: Param[];
  headers: HeaderItem[];
  body: string;
}

interface ResponseState {
  status: number | string;
  data: any;
  time: number;
}

interface HistoryItem {
  id: string | number;
  method: string;
  url: string;
  success: boolean;
  time: string;
  rawTime?: string;
  status?: number | string;
  durationMs?: number;
  responseData?: any;
}

function toUiMethod(method: string): HttpMethod {
  if (method === "DELETE") return "DEL";
  if (method === "POST") return "POST";
  if (method === "PUT") return "PUT";
  return "GET";
}

function toRequestMethod(method: HttpMethod) {
  return method === "DEL" ? "DELETE" : method;
}

function formatTimeAgo(input: string | number | Date) {
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return "";

  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 10) return "방금 전";
  if (sec < 60) return `${sec}초 전`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}

function formatDateTime(input?: string | number | Date) {
  if (!input) return "—";

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMethodBadgeClass(method: string) {
  const normalized = method === "DELETE" ? "DEL" : method;

  switch (normalized) {
    case "GET":
      return "border-green-500 text-green-600 bg-green-50";
    case "POST":
      return "border-blue-500 text-blue-600 bg-blue-50";
    case "PUT":
      return "border-indigo-500 text-indigo-600 bg-indigo-50";
    case "DEL":
    case "DELETE":
      return "border-red-500 text-red-600 bg-red-50";
    default:
      return "border-slate-400 text-slate-600 bg-slate-50";
  }
}

function getStatusClass(status?: number | string) {
  if (status === undefined || status === null) {
    return "bg-slate-100 text-slate-500";
  }

  if (status === "ERR") {
    return "bg-red-50 text-red-600";
  }

  const numericStatus = Number(status);

  if (Number.isNaN(numericStatus)) {
    return "bg-slate-100 text-slate-500";
  }

  if (numericStatus >= 200 && numericStatus < 300) {
    return "bg-green-50 text-green-600";
  }

  if (numericStatus >= 300 && numericStatus < 400) {
    return "bg-blue-50 text-blue-600";
  }

  if (numericStatus >= 400) {
    return "bg-red-50 text-red-600";
  }

  return "bg-slate-100 text-slate-500";
}

function shortUrl(url: string) {
  return String(url ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\?.*$/, "");
}

function getPreviewText(data: any) {
  if (data === undefined || data === null) {
    return "응답 본문이 저장되어 있지 않습니다.";
  }

  if (typeof data === "string") {
    return data.length > 120 ? `${data.slice(0, 120)}...` : data;
  }

  try {
    const json = JSON.stringify(data);
    return json.length > 120 ? `${json.slice(0, 120)}...` : json;
  } catch {
    return "응답 미리보기를 표시할 수 없습니다.";
  }
}

function normalizeHistoryItem(h: any): HistoryItem {
  const status = h.status;

  let responseData: any = undefined;

  if (h.responseBody) {
    try {
      responseData = JSON.parse(h.responseBody);
    } catch {
      responseData = h.responseBody;
    }
  } else {
    responseData =
      h.responseData ??
      h.response ??
      h.data ??
      h.result ??
      undefined;
  }

  const numericStatus = Number(status);
  const success =
    typeof h.success === "boolean"
      ? h.success
      : !Number.isNaN(numericStatus)
        ? numericStatus >= 200 && numericStatus < 400
        : false;

  return {
    id: h.id ?? `${h.method}-${h.url}-${h.createdAt ?? Math.random()}`,
    method: h.method ?? "GET",
    url: h.url ?? "",
    success,
    time: h.createdAt ? formatTimeAgo(h.createdAt) : "—",
    rawTime: h.createdAt,
    status,
    durationMs: h.durationMs,
    responseData,
  };
}

export default function ApiTesterPage() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("http://localhost:8080/api/history");
  const [activeTab, setActiveTab] = useState("Params");

  const [params, setParams] = useState<Param[]>([
    { key: "page", value: "1", desc: "Page number", enabled: true },
    { key: "limit", value: "10", desc: "Items per page", enabled: true },
  ]);

  const [headers, setHeaders] = useState<HeaderItem[]>([
    { key: "", value: "", enabled: true },
  ]);

  const [authType, setAuthType] = useState<"none" | "bearer">("none");
  const [bearerToken, setBearerToken] = useState("");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTests, setSavedTests] = useState<SavedTestItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<
    string | number | null
  >(null);

  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [testsRes, histRes] = await Promise.all([
          fetch(`${API_BASE}/api/test`, { cache: "no-store" }),
          fetch(`${API_BASE}/api/history?limit=20`, { cache: "no-store" }),
        ]);

        if (!testsRes.ok) {
          const t = await testsRes.text().catch(() => "");
          throw new Error(`GET /api/test failed: ${testsRes.status} ${t}`);
        }

        if (!histRes.ok) {
          const t = await histRes.text().catch(() => "");
          throw new Error(`GET /api/history failed: ${histRes.status} ${t}`);
        }

        const tests = await testsRes.json();
        const hist = await histRes.json();

        setSavedTests(
          (Array.isArray(tests) ? tests : []).map((t: any) => ({
            id: t.id,
            title: t.title,
            method: toUiMethod(t.method),
            url: t.url,
            params: t.params ?? [],
            headers: t.headers ?? [],
            body: t.body ?? "",
          })),
        );

        setHistory((hist ?? []).map(normalizeHistoryItem));
      } catch (e) {
        console.error("initial load failed:", e);
      }
    };

    load();
  }, []);

  const handleSelectSavedTest = (test: SavedTestItem) => {
    setMethod(toUiMethod(test.method));
    setUrl(test.url);
    setParams(test.params ?? []);
    setHeaders(test.headers ?? [{ key: "", value: "", enabled: true }]);
    setBody(test.body ?? "");
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);

    setMethod(toUiMethod(item.method));
    setUrl(item.url);

    setResponse({
      status: item.status ?? "—",
      time: item.durationMs ?? 0,
      data:
        item.responseData ??
        "이 히스토리에는 응답 본문이 저장되어 있지 않습니다. 현재 백엔드 history 저장값에 response body가 없다면 status, url, duration만 확인할 수 있습니다.",
    });
  };

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);
    setSelectedHistoryId(null);

    const start = performance.now();

    try {
      const activeParams = params.filter((p) => p.enabled && p.key);
      const query = activeParams.length
        ? `?${new URLSearchParams(
            activeParams.reduce(
              (acc, p) => ({ ...acc, [p.key]: p.value }),
              {} as Record<string, string>,
            ),
          ).toString()}`
        : "";

      const targetFullUrl = `${url}${query}`;
      const normalizedMethod = toRequestMethod(method);

      const headersObj = headers
        .filter((h) => h.enabled && h.key?.trim())
        .reduce(
          (acc, h) => {
            acc[h.key.trim()] = h.value ?? "";
            return acc;
          },
          {} as Record<string, string>,
        );

      if (authType === "bearer" && bearerToken.trim()) {
        headersObj.Authorization = `Bearer ${bearerToken.trim()}`;
      }

      const hasContentType = Object.keys(headersObj).some(
        (k) => k.toLowerCase() === "content-type",
      );

      const willSendBody = !["GET", "HEAD"].includes(normalizedMethod);

      if (willSendBody && body && !hasContentType) {
        headersObj["Content-Type"] = "application/json";
      }

      const res = await fetch(`${API_BASE}/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetFullUrl,
          method: normalizedMethod,
          headers: headersObj,
          body: willSendBody ? body : null,
        }),
      });

      let data: any = null;

      try {
        data = await res.json();
      } catch {
        data = await res.text().catch(() => "");
      }

      const time = Math.round(performance.now() - start);

      const normalizedStatus =
        typeof data?.status === "number" ? data.status : res.status;

      const normalizedPayload =
        data && typeof data === "object" && "data" in data ? data.data : data;

      const nextResponse = {
        status: normalizedStatus,
        data: normalizedPayload,
        time,
      };

      setResponse(nextResponse);

      try {
      await fetch(`${API_BASE}/api/history`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: normalizedMethod,
    url: targetFullUrl,
    status: normalizedStatus,
    success:
      typeof normalizedStatus === "number"
        ? normalizedStatus >= 200 && normalizedStatus < 400
        : false,
    durationMs: time,
    responseBody:
      typeof normalizedPayload === "string"
        ? normalizedPayload
        : JSON.stringify(normalizedPayload),
  }),
});

        const histRes = await fetch(`${API_BASE}/api/history?limit=20`, {
          cache: "no-store",
        });

        const hist = await histRes.json();

        const mappedHistory = (hist ?? []).map(normalizeHistoryItem);

        const localFirstItem: HistoryItem = {
          id: `local-${Date.now()}`,
          method: normalizedMethod,
          url: targetFullUrl,
          success:
            typeof normalizedStatus === "number"
              ? normalizedStatus >= 200 && normalizedStatus < 400
              : false,
          time: "방금 전",
          rawTime: new Date().toISOString(),
          status: normalizedStatus,
          durationMs: time,
          responseData: normalizedPayload,
        };

        const hasSameLatest = mappedHistory.some(
          (h: HistoryItem) =>
            h.url === localFirstItem.url &&
            String(h.status) === String(localFirstItem.status),
        );

        const nextHistory = hasSameLatest
          ? mappedHistory.map((h: HistoryItem, index: number) =>
              index === 0 && h.responseData === undefined
                ? { ...h, responseData: normalizedPayload }
                : h,
            )
          : [localFirstItem, ...mappedHistory];

        setHistory(nextHistory.slice(0, 20));
        setSelectedHistoryId(nextHistory[0]?.id ?? null);
      } catch (e) {
        console.error("history save failed", e);

        const localItem: HistoryItem = {
          id: `local-${Date.now()}`,
          method: normalizedMethod,
          url: targetFullUrl,
          success:
            typeof normalizedStatus === "number"
              ? normalizedStatus >= 200 && normalizedStatus < 400
              : false,
          time: "방금 전",
          rawTime: new Date().toISOString(),
          status: normalizedStatus,
          durationMs: time,
          responseData: normalizedPayload,
        };

        setHistory((prev) => [localItem, ...prev].slice(0, 20));
        setSelectedHistoryId(localItem.id);
      }
    } catch (e) {
      const errorResponse = {
        status: "ERR",
        data: "연결 실패",
        time: 0,
      };

      setResponse(errorResponse);

      const localItem: HistoryItem = {
        id: `local-error-${Date.now()}`,
        method: toRequestMethod(method),
        url,
        success: false,
        time: "방금 전",
        rawTime: new Date().toISOString(),
        status: "ERR",
        durationMs: 0,
        responseData: "연결 실패",
      };

      setHistory((prev) => [localItem, ...prev].slice(0, 20));
      setSelectedHistoryId(localItem.id);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const title = prompt("저장할 테스트 이름을 입력하세요", "New API Test");
    if (!title) return;

    try {
      const res = await fetch(`${API_BASE}/api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          method: toRequestMethod(method),
          url,
          params,
          headers,
          body,
        }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`save failed: ${res.status} ${t}`);
      }

      const saved = await res.json();

      const newItem: SavedTestItem = {
        id: saved.id,
        title: saved.title,
        method: toUiMethod(saved.method),
        url: saved.url,
        params: saved.params ?? [],
        headers: saved.headers ?? [],
        body: saved.body ?? "",
      };

      setSavedTests((prev) => [newItem, ...prev]);
    } catch (e) {
      alert("저장 실패: 백엔드가 실행 중인지 확인하세요");
      console.error(e);
    }
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-white font-sans">
      {/* 왼쪽 패널 */}
      <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800">API 테스트</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              저장 테스트와 실행 기록
            </p>
          </div>

          {/* <button className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
            <Plus size={15} />
          </button> */}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                저장된 테스트
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {savedTests.length}
              </span>
            </div>

            <div className="space-y-2">
              {savedTests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
                  저장된 테스트가 없습니다.
                </div>
              ) : (
                savedTests.map((test) => (
                  <button
                    key={test.id}
                    onClick={() => handleSelectSavedTest(test)}
                    className="group w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition hover:border-blue-100 hover:bg-blue-50/30"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`min-w-[42px] rounded-md border px-2 py-0.5 text-center text-[10px] font-bold ${getMethodBadgeClass(
                          test.method,
                        )}`}
                      >
                        {test.method}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">
                        {test.title}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-[11px] text-slate-400">
                      {test.url}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                테스트 히스토리
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {history.length}
              </span>
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400">
                  아직 실행한 테스트가 없습니다.
                </div>
              ) : (
                history.map((h) => {
                  const isSelected = selectedHistoryId === h.id;

                  return (
                    <button
                      key={h.id}
                      onClick={() => handleSelectHistory(h)}
                      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                        isSelected
                          ? "border-blue-300 ring-2 ring-blue-100"
                          : "border-slate-100 hover:border-blue-100 hover:bg-blue-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${getMethodBadgeClass(
                                h.method,
                              )}`}
                            >
                              {h.method === "DELETE" ? "DEL" : h.method}
                            </span>

                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusClass(
                                h.status,
                              )}`}
                            >
                              {h.status ?? "—"}
                            </span>
                          </div>

                          <p
                            className="truncate text-[13px] font-bold text-slate-700"
                            title={h.url}
                          >
                            {shortUrl(h.url)}
                          </p>

                          <p
                            className="mt-1 truncate text-[11px] text-slate-400"
                            title={h.url}
                          >
                            {h.url}
                          </p>
                        </div>

                        {h.success ? (
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <XCircle className="mt-1 h-4 w-4 shrink-0 text-red-500" />
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
                          <Clock size={13} className="text-slate-400" />
                          <span className="truncate text-[11px] font-medium text-slate-500">
                            {h.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
                          <Timer size={13} className="text-slate-400" />
                          <span className="truncate text-[11px] font-medium text-slate-500">
                            {h.durationMs ?? 0}ms
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                        <p className="line-clamp-2 break-all text-[11px] leading-5 text-slate-500">
                          {getPreviewText(h.responseData)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </aside>

      {/* 중앙 패널 */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-5xl p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-xl font-bold text-slate-900">
                Mini API Tester
              </h1>
              <p className="text-xs font-medium text-slate-400">
                API 엔드포인트를 테스트하고 응답을 확인하세요
              </p>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Save size={14} />
              Save Test
            </button>
          </div>

          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex gap-2">
              <div className="relative shrink-0">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="cursor-pointer appearance-none rounded-xl border-none bg-slate-100 px-5 py-3 pr-10 text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DEL">DEL</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-4 text-slate-400"
                />
              </div>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 rounded-xl border-none bg-slate-100 px-5 py-3 text-sm font-medium text-slate-600 outline-none"
                placeholder="http://localhost:8080/api/example"
              />

              <button
                onClick={handleSend}
                disabled={isLoading}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>

            <div className="mb-6 flex w-fit gap-2 rounded-xl bg-slate-100 p-1">
              {["Params", "Body", "Headers", "Auth"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                    activeTab === tab
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "Params" && (
              <div className="space-y-3">
                {params.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.key}
                      onChange={(e) => {
                        const next = [...params];
                        next[i].key = e.target.value;
                        setParams(next);
                      }}
                      placeholder="Key"
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                    />

                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => {
                        const next = [...params];
                        next[i].value = e.target.value;
                        setParams(next);
                      }}
                      placeholder="Value"
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                    />

                    <input
                      type="text"
                      value={p.desc}
                      onChange={(e) => {
                        const next = [...params];
                        next[i].desc = e.target.value;
                        setParams(next);
                      }}
                      placeholder="Description"
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-400 outline-none"
                    />

                    <button
                      onClick={() =>
                        setParams(params.filter((_, idx) => idx !== i))
                      }
                      className="p-2 text-slate-300 hover:text-slate-900"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setParams([
                      ...params,
                      { key: "", value: "", desc: "", enabled: true },
                    ])
                  }
                  className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Parameter
                </button>
              </div>
            )}

            {activeTab === "Body" && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-40 w-full rounded-xl border-none bg-slate-50 p-4 font-mono text-xs text-slate-600 outline-none"
                placeholder='{ "key": "value" }'
              />
            )}

            {activeTab === "Headers" && (
              <div className="space-y-3">
                {headers.map((h, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                      placeholder="Key"
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index].key = e.target.value;
                        setHeaders(copy);
                      }}
                    />

                    <input
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index].value = e.target.value;
                        setHeaders(copy);
                      }}
                    />

                    <button
                      onClick={() =>
                        setHeaders(headers.filter((_, i) => i !== index))
                      }
                      className="p-2 text-slate-300 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setHeaders([
                      ...headers,
                      { key: "", value: "", enabled: true },
                    ])
                  }
                  className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Header
                </button>
              </div>
            )}

            {activeTab === "Auth" && (
              <div className="space-y-4">
                <select
                  value={authType}
                  onChange={(e) =>
                    setAuthType(e.target.value as "none" | "bearer")
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none"
                >
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                </select>

                {authType === "bearer" && (
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none"
                    placeholder="Enter Bearer Token"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          <section className="mb-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Response</h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Send 결과 또는 왼쪽 히스토리에서 선택한 응답을 확인할 수 있습니다.
                </p>
              </div>

              {selectedHistory && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
                  <Link2 size={13} />
                  <span className="max-w-[340px] truncate">
                    {selectedHistory.url}
                  </span>
                </div>
              )}
            </div>

            <div className="relative h-[360px] w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {response ? (
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider">
                      <span
                        className={`rounded-md px-2 py-1 ${getStatusClass(
                          response.status,
                        )}`}
                      >
                        Status: {response.status}
                      </span>

                      <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-500">
                        Time: {response.time}ms
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      {selectedHistory?.rawTime
                        ? formatDateTime(selectedHistory.rawTime)
                        : "Current response"}
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto p-6">
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-600">
                      {typeof response.data === "string"
                        ? response.data
                        : JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">
                  Click 'Send' to see response...
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}