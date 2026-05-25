"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

import {
  VscAdd,
  VscCheck,
  VscDatabase,
  VscGlobe,
  VscKey,
  VscSave,
  VscSearch,
  VscServer,
  VscTrash,
} from "react-icons/vsc";

import {
  ArrowRight,
  ChevronRight,
  Download,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  UserRound,
  Users,
} from "lucide-react";

import { getMyWorkspacesByTokenApi } from "@/lib/ide/api";
import {
  createWorkspaceApiSpecApi,
  createWorkspaceRequirementApi,
  deleteApiSpecApi,
  deleteRequirementApi,
  fetchWorkspaceApiSpecsApi,
  fetchWorkspaceDesignDocumentApi,
  fetchWorkspaceRequirementsApi,
  saveWorkspaceDesignDocumentApi,
  updateApiSpecApi,
  updateRequirementApi,
} from "@/lib/design/api";

import { v4 as uuidv4 } from "uuid";

const METHOD_OPTIONS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

const COLUMN_TYPES = [
  "VARCHAR",
  "TEXT",
  "INT",
  "BIGINT",
  "BOOLEAN",
  "DATETIME",
  "DATE",
  "DECIMAL",
];

const TAB_ITEMS = [
  {
    id: "requirements",
    label: "요구사항",
    description: "기능 범위 정리",
  },
  {
    id: "erd",
    label: "ERD",
    description: "DB 구조 설계",
  },
  {
    id: "flow",
    label: "데이터 플로우",
    description: "처리 흐름 정리",
  },
  {
    id: "api",
    label: "API 명세서",
    description: "요청/응답 정리",
  },
];


const DESIGN_PDF_SECTION_ITEMS = [
  {
    id: "requirements",
    label: "요구사항",
    printTitle: "요구사항 정의",
  },
  {
    id: "api",
    label: "API 명세",
    printTitle: "API 명세",
  },
  {
    id: "erd",
    label: "ERD",
    printTitle: "ERD",
  },
  {
    id: "flow",
    label: "데이터 플로우",
    printTitle: "데이터 플로우",
  },
];

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function normalizeWorkspaceId(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ? String(value) : "";
}

function getWorkspaceTitle(workspace) {
  return workspace?.name?.trim() || "이름 없는 프로젝트";
}

function getWorkspaceSubProjectCount(workspace) {
  return Array.isArray(workspace?.projects) ? workspace.projects.length : 0;
}

function getWorkspaceSubText(workspace) {
  return `하위 ${getWorkspaceSubProjectCount(workspace)}개`;
}

function getWorkspaceModeLabel(mode) {
  return mode === "team" ? "팀" : "개인";
}

/**
 * 설계단계 페이지 라우트가 다르면 이 함수의 경로만 프로젝트 경로에 맞게 바꿔주세요.
 * 예: `/design/${workspace.id}?mode=${workspace.mode}`
 * 예: `/ide/${workspace.mode}/${workspace.id}/design`
 */
function getDesignHref(workspace) {
  return `/design?workspaceId=${encodeURIComponent(
    workspace.id,
  )}&mode=${encodeURIComponent(workspace.mode)}`;
}

const createRequirement = () => ({
  id: uuidv4(),
  category: "기본",
  name: "새로운 요구사항",
  description: "",
});

const createApiSpec = () => ({
  id: uuidv4(),
  method: "GET",
  endpoint: "/api/example",
  description: "",
  request: "",
  response: "",
});

const createTableNode = () => ({
  id: uuidv4(),
  type: "tableNode",
  position: {
    x: 180 + Math.floor(Math.random() * 160),
    y: 140 + Math.floor(Math.random() * 120),
  },
  data: {
    name: "NEW_TABLE",
    columns: [
      {
        id: uuidv4(),
        name: "id",
        type: "BIGINT",
        isPk: true,
        isFk: false,
      },
    ],
  },
});

const createFlowNode = (type = "server") => ({
  id: uuidv4(),
  type: "systemNode",
  position: {
    x: 180 + Math.floor(Math.random() * 220),
    y: 160 + Math.floor(Math.random() * 140),
  },
  data: {
    label:
      type === "client"
        ? "화면"
        : type === "db"
          ? "Database"
          : type === "external"
            ? "외부 서비스"
            : "Backend API",
    type,
    techStack:
      type === "client"
        ? "React"
        : type === "db"
          ? "MySQL"
          : type === "external"
            ? "GitHub / AI API"
            : "Spring Boot",
  },
});

function parseJsonArray(value, fallback = []) {
  if (!value || typeof value !== "string") return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlWithLineBreaks(value) {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function getPrintDateLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function formatApiPayload(value) {
  if (!value || !String(value).trim()) return "-";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return String(value);
  }
}

function getNodeData(node) {
  const data = node?.data;

  return typeof data === "object" && data !== null && !Array.isArray(data)
    ? data
    : {};
}

function getNodeLabel(node, fallback) {
  const data = getNodeData(node);
  const label = data.label ?? data.name ?? node?.label ?? node?.name;

  return typeof label === "string" && label.trim() ? label.trim() : fallback;
}

function getNodeSubText(node) {
  const data = getNodeData(node);
  const type = data.type;
  const techStack = data.techStack;

  const typeLabel =
    type === "client"
      ? "화면"
      : type === "server"
        ? "서버/API"
        : type === "db"
          ? "DB"
          : type === "external"
            ? "외부 서비스"
            : typeof type === "string" && type.trim()
              ? type.trim()
              : "설계 노드";

  const techText =
    typeof techStack === "string" && techStack.trim()
      ? techStack.trim()
      : "설명 없음";

  return `${typeLabel} · ${techText}`;
}

function getNodeColumns(node) {
  const data = getNodeData(node);
  const columns = data.columns;

  return Array.isArray(columns)
    ? columns.filter(
        (column) =>
          typeof column === "object" &&
          column !== null &&
          !Array.isArray(column),
      )
    : [];
}

function getNodePosition(node, index) {
  const position = node?.position;

  if (
    typeof position === "object" &&
    position !== null &&
    !Array.isArray(position)
  ) {
    const x = Number(position.x);
    const y = Number(position.y);

    return {
      x: Number.isFinite(x) ? x : 120 + (index % 3) * 280,
      y: Number.isFinite(y) ? y : 100 + Math.floor(index / 3) * 190,
    };
  }

  return {
    x: 120 + (index % 3) * 280,
    y: 100 + Math.floor(index / 3) * 190,
  };
}

function getEdgeSourceTarget(edge) {
  const source = edge?.source;
  const target = edge?.target;

  return {
    source: typeof source === "string" ? source : "",
    target: typeof target === "string" ? target : "",
  };
}

function buildSvgPath(sourceX, sourceY, targetX, targetY) {
  const midX = (sourceX + targetX) / 2;

  return `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
}

function normalizeDiagramNodes(nodes, type) {
  return nodes.map((node, index) => {
    const position = getNodePosition(node, index);

    return {
      id: String(node.id ?? `node-${index}`),
      label: getNodeLabel(
        node,
        type === "erd" ? `TABLE_${index + 1}` : `NODE_${index + 1}`,
      ),
      x: position.x,
      y: position.y,
      columns: getNodeColumns(node),
      subText: getNodeSubText(node),
    };
  });
}

function getDiagramLayout(nodes, type) {
  const nodeWidth = type === "erd" ? 220 : 270;
  const nodeHeight = type === "erd" ? 138 : 92;
  const padding = 80;

  if (nodes.length === 0) {
    return {
      nodes: [],
      width: 760,
      height: 420,
      nodeWidth,
      nodeHeight,
    };
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const maxY = Math.max(...nodes.map((node) => node.y));

  const offsetX = padding - minX;
  const offsetY = padding - minY;

  return {
    nodes: nodes.map((node) => ({
      ...node,
      x: node.x + offsetX,
      y: node.y + offsetY,
    })),
    width: Math.max(860, maxX - minX + nodeWidth + padding * 2),
    height: Math.max(460, maxY - minY + nodeHeight + padding * 2),
    nodeWidth,
    nodeHeight,
  };
}

function buildPrintDiagramSvg({ nodes, edges, type }) {
  if (!nodes.length) {
    return `<div class="empty small-empty">표시할 다이어그램이 없습니다.</div>`;
  }

  const layout = getDiagramLayout(normalizeDiagramNodes(nodes, type), type);
  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));
  const strokeColor = type === "erd" ? "#2563eb" : "#7c3aed";

  const edgeSvg = edges
    .map((edge) => {
      const { source, target } = getEdgeSourceTarget(edge);
      const sourceNode = nodeMap.get(source);
      const targetNode = nodeMap.get(target);

      if (!sourceNode || !targetNode) return "";

      const sourceX = sourceNode.x + layout.nodeWidth;
      const sourceY = sourceNode.y + layout.nodeHeight / 2;
      const targetX = targetNode.x;
      const targetY = targetNode.y + layout.nodeHeight / 2;

      return `
        <path
          d="${buildSvgPath(sourceX, sourceY, targetX, targetY)}"
          fill="none"
          stroke="${strokeColor}"
          stroke-width="2"
          stroke-dasharray="${type === "flow" ? "6 5" : "0"}"
          marker-end="url(#arrow-${type})"
        />
      `;
    })
    .join("");

  const nodeSvg = layout.nodes
    .map((node) => {
      if (type === "erd") {
        const columnRows = node.columns.length
          ? node.columns
              .slice(0, 4)
              .map((column, columnIndex) => {
                const columnName =
                  typeof column.name === "string" ? column.name : "column";
                const columnType =
                  typeof column.type === "string" ? column.type : "TYPE";

                return `
                  <text x="${node.x + 16}" y="${node.y + 74 + columnIndex * 18}" class="diagram-column">
                    ${escapeHtml(columnName)} · ${escapeHtml(columnType)}
                  </text>
                `;
              })
              .join("")
          : `<text x="${node.x + 16}" y="${node.y + 78}" class="diagram-muted">컬럼 없음</text>`;

        return `
          <g>
            <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="${layout.nodeHeight}" rx="14" fill="#ffffff" stroke="#bfdbfe" />
            <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="42" rx="14" fill="#020617" />
            <text x="${node.x + 16}" y="${node.y + 27}" class="diagram-title diagram-white">${escapeHtml(node.label)}</text>
            ${columnRows}
          </g>
        `;
      }

      return `
        <g>
          <rect x="${node.x}" y="${node.y}" width="${layout.nodeWidth}" height="${layout.nodeHeight}" rx="16" fill="#eff6ff" stroke="#bfdbfe" />
          <circle cx="${node.x + 28}" cy="${node.y + 32}" r="14" fill="#ffffff" stroke="#dbeafe" />
          <text x="${node.x + 52}" y="${node.y + 33}" class="diagram-title">${escapeHtml(node.label)}</text>
          <text x="${node.x + 52}" y="${node.y + 58}" class="diagram-muted">${escapeHtml(node.subText)}</text>
        </g>
      `;
    })
    .join("");

  return `
    <div class="diagram-wrap">
      <svg viewBox="0 0 ${layout.width} ${layout.height}" class="diagram-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-${type}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="${strokeColor}" />
          </marker>
          <pattern id="dot-grid-${type}" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#dbeafe" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="#f8fbff" />
        <rect width="100%" height="100%" fill="url(#dot-grid-${type})" />
        ${edgeSvg}
        ${nodeSvg}
      </svg>
    </div>
  `;
}


function FieldInput({ value, onChange, placeholder, className = "" }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full min-w-0 rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${className}`}
    />
  );
}

function FieldTextarea({
  value,
  onChange,
  placeholder,
  rows = 1,
  className = "",
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full min-w-0 resize-none rounded-xl border border-transparent bg-transparent px-3 py-2 text-sm font-medium leading-6 text-slate-700 outline-none transition focus:border-indigo-200 focus:bg-white focus:ring-2 focus:ring-indigo-100 ${className}`}
    />
  );
}

function SimpleSelect({ value, onChange, options, className = "" }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${className}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="flex h-9 w-[240px] items-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
      <VscSearch className="mr-2 shrink-0 text-slate-400" size={15} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, buttonText, onClick }) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white px-8 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon size={28} />
      </div>

      <h3 className="mb-2 text-lg font-extrabold text-slate-900">{title}</h3>

      <p className="mb-5 max-w-md text-sm font-medium leading-6 text-slate-500">
        {description}
      </p>

      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
      >
        <VscAdd size={15} />
        {buttonText}
      </button>
    </div>
  );
}

function TableNode({ id, data }) {
  const { setNodes } = useReactFlow();

  const updateTableName = (name) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                name,
              },
            }
          : node,
      ),
    );
  };

  const addColumn = () => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                columns: [
                  ...(node.data.columns || []),
                  {
                    id: uuidv4(),
                    name: "new_column",
                    type: "VARCHAR",
                    isPk: false,
                    isFk: false,
                  },
                ],
              },
            }
          : node,
      ),
    );
  };

  const updateColumn = (columnId, field, value) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                columns: (node.data.columns || []).map((column) =>
                  column.id === columnId
                    ? {
                        ...column,
                        [field]: value,
                      }
                    : column,
                ),
              },
            }
          : node,
      ),
    );
  };

  const deleteColumn = (columnId) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                columns: (node.data.columns || []).filter(
                  (column) => column.id !== columnId,
                ),
              },
            }
          : node,
      ),
    );
  };

  const deleteTable = () => {
    if (!window.confirm("이 테이블을 삭제할까요?")) return;
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <div className="w-[292px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.13)]">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-indigo-500"
      />

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-indigo-500"
      />

      <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
          <VscDatabase size={17} />
        </div>

        <input
          value={data.name || ""}
          onChange={(event) => updateTableName(event.target.value)}
          className="nodrag min-w-0 flex-1 bg-transparent text-sm font-extrabold uppercase tracking-wide text-white outline-none"
          placeholder="TABLE_NAME"
        />

        <button
          type="button"
          onClick={deleteTable}
          className="nodrag rounded-xl p-1.5 text-slate-400 transition hover:bg-red-500/15 hover:text-red-300"
          title="테이블 삭제"
        >
          <VscTrash size={16} />
        </button>
      </div>

      <div className="max-h-[280px] overflow-y-auto">
        {(data.columns || []).map((column) => (
          <div
            key={column.id}
            className="group flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
          >
            <button
              type="button"
              onClick={() => updateColumn(column.id, "isPk", !column.isPk)}
              className={`nodrag rounded-lg p-1.5 transition ${
                column.isPk
                  ? "bg-amber-100 text-amber-600"
                  : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
              }`}
              title="PK"
            >
              <VscKey size={13} />
            </button>

            <button
              type="button"
              onClick={() => updateColumn(column.id, "isFk", !column.isFk)}
              className={`nodrag rounded-lg p-1.5 transition ${
                column.isFk
                  ? "bg-blue-100 text-indigo-600"
                  : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
              }`}
              title="FK"
            >
              <VscKey size={13} className="rotate-180" />
            </button>

            <input
              value={column.name || ""}
              onChange={(event) =>
                updateColumn(column.id, "name", event.target.value)
              }
              className="nodrag min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none"
              placeholder="column_name"
            />

            <select
              value={column.type || "VARCHAR"}
              onChange={(event) =>
                updateColumn(column.id, "type", event.target.value)
              }
              className="nodrag w-[86px] rounded-lg bg-slate-50 px-1.5 py-1 text-[10px] font-extrabold text-indigo-600 outline-none"
            >
              {COLUMN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => deleteColumn(column.id)}
              className="nodrag rounded-lg p-1 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
              title="컬럼 삭제"
            >
              <VscTrash size={13} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addColumn}
        className="nodrag flex w-full items-center justify-center gap-1.5 bg-slate-50 px-3 py-2.5 text-xs font-extrabold text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
      >
        <VscAdd size={14} />
        컬럼 추가
      </button>
    </div>
  );
}

function SystemNode({ id, data }) {
  const { setNodes } = useReactFlow();

  const updateNode = (field, value) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                [field]: value,
              },
            }
          : node,
      ),
    );
  };

  const deleteNode = () => {
    if (!window.confirm("이 노드를 삭제할까요?")) return;
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const styleMap = {
    client: {
      icon: <VscGlobe size={18} />,
      box: "border-blue-200 bg-indigo-50 text-blue-900",
      iconBox: "bg-white text-indigo-600",
    },
    server: {
      icon: <VscServer size={18} />,
      box: "border-emerald-200 bg-emerald-50 text-emerald-900",
      iconBox: "bg-white text-emerald-600",
    },
    db: {
      icon: <VscDatabase size={18} />,
      box: "border-orange-200 bg-orange-50 text-orange-900",
      iconBox: "bg-white text-orange-600",
    },
    external: {
      icon: <VscGlobe size={18} />,
      box: "border-indigo-200 bg-indigo-50 text-indigo-900",
      iconBox: "bg-white text-indigo-600",
    },
  };

  const currentStyle = styleMap[data.type] || styleMap.server;

  return (
    <div
      className={`relative min-w-[200px] rounded-[22px] border px-3 py-2.5 shadow-[0_14px_30px_rgba(15,23,42,0.12)] ${currentStyle.box}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />

      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${currentStyle.iconBox}`}
        >
          {currentStyle.icon}
        </div>

        <div className="min-w-0 flex-1">
          <input
            value={data.label || ""}
            onChange={(event) => updateNode("label", event.target.value)}
            className="nodrag w-full bg-transparent text-sm font-extrabold outline-none"
            placeholder="노드 이름"
          />

          <input
            value={data.techStack || ""}
            onChange={(event) => updateNode("techStack", event.target.value)}
            className="nodrag mt-1 w-full bg-transparent text-xs font-semibold text-slate-500 outline-none"
            placeholder="기술 또는 설명"
          />

          <select
            value={data.type || "server"}
            onChange={(event) => updateNode("type", event.target.value)}
            className="nodrag mt-2 rounded-xl border border-white/70 bg-white/70 px-2 py-1 text-[11px] font-extrabold text-slate-700 outline-none"
          >
            <option value="client">화면</option>
            <option value="server">서버/API</option>
            <option value="db">DB</option>
            <option value="external">외부 서비스</option>
          </select>
        </div>

        <button
          type="button"
          onClick={deleteNode}
          className="nodrag rounded-xl p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"
          title="노드 삭제"
        >
          <VscTrash size={15} />
        </button>
      </div>
    </div>
  );
}

function createInitialRequirements() {
  return [
    {
      id: uuidv4(),
      category: "회원",
      name: "로그인 기능",
      description: "사용자가 이메일과 비밀번호로 로그인한다.",
    },
  ];
}

function createInitialApiSpecs() {
  return [
    {
      id: uuidv4(),
      method: "GET",
      endpoint: "/api/users/me",
      description: "현재 로그인한 사용자 정보를 조회한다.",
      request: "Authorization 헤더",
      response: "{ id, email, nickname }",
    },
  ];
}

function createInitialErdNodes() {
  return [
    {
      id: uuidv4(),
      type: "tableNode",
      position: {
        x: 180,
        y: 140,
      },
      data: {
        name: "USERS",
        columns: [
          {
            id: uuidv4(),
            name: "id",
            type: "BIGINT",
            isPk: true,
            isFk: false,
          },
          {
            id: uuidv4(),
            name: "email",
            type: "VARCHAR",
            isPk: false,
            isFk: false,
          },
          {
            id: uuidv4(),
            name: "password",
            type: "VARCHAR",
            isPk: false,
            isFk: false,
          },
        ],
      },
    },
  ];
}

function createInitialFlowNodes() {
  return [
    {
      id: uuidv4(),
      type: "systemNode",
      position: {
        x: 160,
        y: 180,
      },
      data: {
        label: "React 화면",
        type: "client",
        techStack: "사용자 화면",
      },
    },
    {
      id: uuidv4(),
      type: "systemNode",
      position: {
        x: 500,
        y: 180,
      },
      data: {
        label: "Spring Boot API",
        type: "server",
        techStack: "비즈니스 로직 처리",
      },
    },
    {
      id: uuidv4(),
      type: "systemNode",
      position: {
        x: 840,
        y: 180,
      },
      data: {
        label: "MySQL",
        type: "db",
        techStack: "데이터 저장",
      },
    },
  ];
}

function ProjectSidebar({
  allWorkspaces,
  currentWorkspaceId,
  isLoading,
  errorMessage,
}) {
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [canSidebarHoverExpand, setCanSidebarHoverExpand] = useState(true);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const sidebarExpanded =
    isSidebarPinned || (canSidebarHoverExpand && isSidebarHovered);

  const personalCount = allWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  ).length;

  const teamCount = allWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  ).length;

  const filteredSidebarWorkspaces = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();

    return allWorkspaces.filter((workspace) => {
      const matchedFilter =
        projectFilter === "all" || workspace.mode === projectFilter;

      const title = getWorkspaceTitle(workspace).toLowerCase();
      const workspaceName = workspace.name?.toLowerCase() ?? "";
      const subText = getWorkspaceSubText(workspace).toLowerCase();

      const matchedKeyword =
        !keyword ||
        title.includes(keyword) ||
        workspaceName.includes(keyword) ||
        subText.includes(keyword);

      return matchedFilter && matchedKeyword;
    });
  }, [allWorkspaces, projectSearch, projectFilter]);

  const personalSidebarWorkspaces = filteredSidebarWorkspaces.filter(
    (workspace) => workspace.mode === "personal",
  );

  const teamSidebarWorkspaces = filteredSidebarWorkspaces.filter(
    (workspace) => workspace.mode === "team",
  );

  const handleToggleSidebar = () => {
    if (isSidebarPinned) {
      setIsSidebarPinned(false);
      setIsSidebarHovered(false);
      setCanSidebarHoverExpand(false);
      return;
    }

    setIsSidebarPinned(true);
    setIsSidebarHovered(false);
    setCanSidebarHoverExpand(true);
  };

  const renderWorkspaceItem = (workspace) => {
    const active = String(workspace.id) === String(currentWorkspaceId);
    const workspaceTitle = getWorkspaceTitle(workspace);
    const workspaceSubText = getWorkspaceSubText(workspace);

    return (
      <Link
        key={workspace.id}
        href={getDesignHref(workspace)}
        title={!sidebarExpanded ? workspaceTitle : undefined}
        className={cn(
          "group flex items-center gap-2 rounded-xl px-2 py-2 text-sm transition",
          active
            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
            : "text-slate-700 hover:bg-slate-100",
        )}
      >
        <div
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
            active
              ? "bg-white/15 text-white"
              : workspace.mode === "team"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-indigo-50 text-indigo-700",
          )}
        >
          {workspace.mode === "team" ? (
            <Users size={16} strokeWidth={2.3} />
          ) : (
            <UserRound size={16} strokeWidth={2.3} />
          )}
        </div>

        {sidebarExpanded ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{workspaceTitle}</p>
              <p
                className={cn(
                  "truncate text-[11px]",
                  active ? "text-white/75" : "text-slate-400",
                )}
              >
                {getWorkspaceModeLabel(workspace.mode)} · {workspaceSubText}
              </p>
            </div>

            <ChevronRight
              size={15}
              strokeWidth={2.4}
              className={cn(
                "shrink-0 opacity-0 transition group-hover:opacity-100",
                active ? "text-white/70" : "text-slate-400",
              )}
            />
          </>
        ) : null}
      </Link>
    );
  };

  return (
    <aside
      onMouseEnter={() => {
        if (!isSidebarPinned && canSidebarHoverExpand) {
          setIsSidebarHovered(true);
        }
      }}
      onMouseLeave={() => {
        setIsSidebarHovered(false);
        setCanSidebarHoverExpand(true);
      }}
      className={cn(
        "hidden h-full shrink-0 overflow-hidden rounded-[22px] border border-white/70 bg-white/90 shadow-sm transition-all duration-500 md:flex",
        sidebarExpanded ? "w-72" : "w-16",
      )}
    >
      <div className="flex min-h-0 w-full flex-col">
        <div
          className={cn(
            "flex items-center border-b border-slate-100",
            sidebarExpanded
              ? "justify-between px-3 py-3"
              : "justify-center py-3",
          )}
        >
          {sidebarExpanded ? (
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">프로젝트</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                전체 {allWorkspaces.length}개 · 개인 {personalCount}개 · 팀{" "}
                {teamCount}개
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleToggleSidebar}
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={isSidebarPinned ? "사이드바 접기" : "사이드바 고정"}
            title={isSidebarPinned ? "사이드바 접기" : "사이드바 고정"}
          >
            {isSidebarPinned ? (
              <PanelLeftClose size={17} strokeWidth={2.4} />
            ) : (
              <PanelLeftOpen size={17} strokeWidth={2.4} />
            )}
          </button>
        </div>

        {!sidebarExpanded ? (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-2 px-2 py-3">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              title="프로젝트 검색"
              aria-label="프로젝트 검색"
              onClick={() => {
                setIsSidebarPinned(true);
                setIsSidebarHovered(false);
                setCanSidebarHoverExpand(true);
              }}
            >
              <Search size={17} strokeWidth={2.3} />
            </button>

            <div className="grid h-9 w-9 place-items-center rounded-xl text-slate-500">
              <FolderOpen size={17} strokeWidth={2.3} />
            </div>

            <div className="mt-2 h-px w-8 bg-slate-200" />

            <div className="grid h-9 w-9 place-items-center rounded-xl text-xs font-black text-slate-300">
              {personalCount + teamCount}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-3 py-3">
              <div className="relative">
                <Search
                  size={16}
                  strokeWidth={2.2}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="프로젝트 검색"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {[
                  { key: "all", label: "전체" },
                  { key: "personal", label: "개인" },
                  { key: "team", label: "팀" },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setProjectFilter(filter.key)}
                    className={cn(
                      "rounded-lg px-2 py-1.5 text-xs font-bold transition",
                      projectFilter === filter.key
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-900",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {isLoading ? (
                <div className="mx-1 rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                  프로젝트를 불러오는 중입니다.
                </div>
              ) : errorMessage ? (
                <div className="mx-1 rounded-xl border border-red-100 bg-red-50 px-3 py-4 text-xs leading-relaxed text-red-500">
                  {errorMessage}
                </div>
              ) : filteredSidebarWorkspaces.length === 0 ? (
                <div className="mx-1 rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                  검색 결과가 없습니다.
                </div>
              ) : (
                <div className="space-y-5">
                  {projectFilter !== "team" ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500">
                          <UserRound size={14} strokeWidth={2.3} />
                          개인 프로젝트
                        </div>

                        <span className="text-[11px] font-bold text-slate-400">
                          {personalSidebarWorkspaces.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {personalSidebarWorkspaces.length > 0 ? (
                          personalSidebarWorkspaces.map(renderWorkspaceItem)
                        ) : (
                          <p className="px-2 py-2 text-xs text-slate-400">
                            개인 프로젝트가 없습니다.
                          </p>
                        )}
                      </div>
                    </section>
                  ) : null}

                  {projectFilter !== "personal" ? (
                    <section>
                      <div className="mb-2 flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500">
                          <Users size={14} strokeWidth={2.3} />팀 프로젝트
                        </div>

                        <span className="text-[11px] font-bold text-slate-400">
                          {teamSidebarWorkspaces.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {teamSidebarWorkspaces.length > 0 ? (
                          teamSidebarWorkspaces.map(renderWorkspaceItem)
                        ) : (
                          <p className="px-2 py-2 text-xs text-slate-400">
                            팀 프로젝트가 없습니다.
                          </p>
                        )}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 p-3">
              <Link
                href="/main"
                className="flex items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-600 transition hover:bg-indigo-100"
              >
                전체 프로젝트
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export default function Page() {
  const routeParams = useParams();
  const searchParams = useSearchParams();

  const queryWorkspaceId = searchParams.get("workspaceId");

  const routeWorkspaceId = normalizeWorkspaceId(
    queryWorkspaceId ??
      routeParams?.workspaceId ??
      routeParams?.id ??
      routeParams?.uuid,
  );

  const routeMode = searchParams.get("mode");
  const routeWorkspaceMode =
    routeMode === "team" || routeMode === "personal" ? routeMode : undefined;

  const [activeTab, setActiveTab] = useState("requirements");
  const [saveMessage, setSaveMessage] = useState("");
  const [requirementSearch, setRequirementSearch] = useState("");
  const [apiSearch, setApiSearch] = useState("");
  const [isPdfMenuOpen, setIsPdfMenuOpen] = useState(false);
  const [selectedPdfSections, setSelectedPdfSections] = useState(
    DESIGN_PDF_SECTION_ITEMS.map((item) => item.id),
  );

  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);
  const [workspaceErrorMessage, setWorkspaceErrorMessage] = useState("");
  const [isDesignReady, setIsDesignReady] = useState(false);
  const [isDesignLoading, setIsDesignLoading] = useState(false);
  const [isDesignSaving, setIsDesignSaving] = useState(false);
  const [designErrorMessage, setDesignErrorMessage] = useState("");

  const [requirements, setRequirements] = useState([]);
  const [apiSpecs, setApiSpecs] = useState([]);

  const [erdNodes, setErdNodes, onErdNodesChange] = useNodesState(
    createInitialErdNodes(),
  );

  const [erdEdges, setErdEdges, onErdEdgesChange] = useEdgesState([]);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState(
    createInitialFlowNodes(),
  );

  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(
    () => ({
      tableNode: TableNode,
      systemNode: SystemNode,
    }),
    [],
  );

  useEffect(() => {
    let ignore = false;

    async function loadWorkspaces() {
      try {
        setIsWorkspaceLoading(true);
        setWorkspaceErrorMessage("");

        const workspaceData = await getMyWorkspacesByTokenApi();
        const safeWorkspaceData = Array.isArray(workspaceData)
          ? workspaceData
          : [];

        if (!ignore) {
          setAllWorkspaces(safeWorkspaceData);
        }
      } catch (error) {
        if (!ignore) {
          setAllWorkspaces([]);
          setWorkspaceErrorMessage(
            error instanceof Error
              ? error.message
              : "프로젝트 목록을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!ignore) {
          setIsWorkspaceLoading(false);
        }
      }
    }

    loadWorkspaces();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedWorkspace = useMemo(() => {
    if (!routeWorkspaceId) return null;

    return (
      allWorkspaces.find(
        (workspace) => String(workspace.id) === String(routeWorkspaceId),
      ) ?? null
    );
  }, [allWorkspaces, routeWorkspaceId]);

  const currentWorkspaceId =
    selectedWorkspace?.id ?? routeWorkspaceId ?? "temporary";

  const currentWorkspaceMode =
    selectedWorkspace?.mode ?? routeWorkspaceMode ?? "personal";

  const currentWorkspaceName = selectedWorkspace
    ? getWorkspaceTitle(selectedWorkspace)
    : routeWorkspaceId
      ? "선택된 프로젝트"
      : "프로젝트 미선택";

  useEffect(() => {
    let ignore = false;

    async function loadDesignDocs() {
      if (!currentWorkspaceId || currentWorkspaceId === "temporary") {
        setRequirements([]);
        setApiSpecs([]);
        setErdNodes(createInitialErdNodes());
        setErdEdges([]);
        setFlowNodes(createInitialFlowNodes());
        setFlowEdges([]);
        setIsDesignReady(true);
        return;
      }

      try {
        setIsDesignReady(false);
        setIsDesignLoading(true);
        setDesignErrorMessage("");

        const [requirementData, apiSpecData, designDocumentData] =
          await Promise.all([
            fetchWorkspaceRequirementsApi(currentWorkspaceId),
            fetchWorkspaceApiSpecsApi(currentWorkspaceId),
            fetchWorkspaceDesignDocumentApi(currentWorkspaceId),
          ]);

        if (!ignore) {
          setRequirements(
            Array.isArray(requirementData) ? requirementData : [],
          );
          setApiSpecs(Array.isArray(apiSpecData) ? apiSpecData : []);
          setErdNodes(
            parseJsonArray(
              designDocumentData?.erdNodesJson,
              createInitialErdNodes(),
            ),
          );
          setErdEdges(parseJsonArray(designDocumentData?.erdEdgesJson, []));
          setFlowNodes(
            parseJsonArray(
              designDocumentData?.flowNodesJson,
              createInitialFlowNodes(),
            ),
          );
          setFlowEdges(parseJsonArray(designDocumentData?.flowEdgesJson, []));
          setIsDesignReady(true);
        }
      } catch (error) {
        if (!ignore) {
          setRequirements([]);
          setApiSpecs([]);
          setErdNodes(createInitialErdNodes());
          setErdEdges([]);
          setFlowNodes(createInitialFlowNodes());
          setFlowEdges([]);
          setIsDesignReady(true);
          setDesignErrorMessage(
            error instanceof Error
              ? error.message
              : "설계 데이터를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!ignore) {
          setIsDesignLoading(false);
        }
      }
    }

    loadDesignDocs();

    return () => {
      ignore = true;
    };
  }, [
    currentWorkspaceId,
    setErdNodes,
    setErdEdges,
    setFlowNodes,
    setFlowEdges,
  ]);

  const saveData = useCallback(async () => {
    if (!currentWorkspaceId || currentWorkspaceId === "temporary") {
      setDesignErrorMessage("프로젝트를 먼저 선택해주세요.");
      return;
    }

    try {
      setIsDesignSaving(true);
      setDesignErrorMessage("");

      await Promise.all([
        ...requirements.map((item) =>
          updateRequirementApi({
            requirementId: item.id,
            category: item.category,
            name: item.name,
            description: item.description,
          }),
        ),
        ...apiSpecs.map((item) =>
          updateApiSpecApi({
            apiSpecId: item.id,
            method: item.method,
            endpoint: item.endpoint,
            description: item.description,
            request: item.request,
            response: item.response,
          }),
        ),
      ]);

      await saveWorkspaceDesignDocumentApi({
        workspaceId: currentWorkspaceId,
        erdNodesJson: JSON.stringify(erdNodes),
        erdEdgesJson: JSON.stringify(erdEdges),
        flowNodesJson: JSON.stringify(flowNodes),
        flowEdgesJson: JSON.stringify(flowEdges),
      });

      const timeText = new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setSaveMessage(`${timeText} 저장됨`);

      window.clearTimeout(window.__architectureSaveTimer);
      window.__architectureSaveTimer = window.setTimeout(() => {
        setSaveMessage("");
      }, 2200);
    } catch (error) {
      setDesignErrorMessage(
        error instanceof Error
          ? error.message
          : "설계 데이터 저장에 실패했습니다.",
      );
    } finally {
      setIsDesignSaving(false);
    }
  }, [
    currentWorkspaceId,
    requirements,
    apiSpecs,
    erdNodes,
    erdEdges,
    flowNodes,
    flowEdges,
  ]);

  const updateRequirement = (id, field, value) => {
    setRequirements((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addRequirement = async () => {
    if (!currentWorkspaceId || currentWorkspaceId === "temporary") {
      setDesignErrorMessage("프로젝트를 먼저 선택해주세요.");
      return;
    }

    try {
      setDesignErrorMessage("");

      const created = await createWorkspaceRequirementApi({
        workspaceId: currentWorkspaceId,
        category: "기본",
        name: "새로운 요구사항",
        description: "",
      });

      setRequirements((prev) => [...prev, created]);
    } catch (error) {
      setDesignErrorMessage(
        error instanceof Error
          ? error.message
          : "요구사항 생성에 실패했습니다.",
      );
    }
  };

  const deleteRequirement = async (id) => {
    if (!window.confirm("이 요구사항을 삭제할까요?")) return;

    try {
      setDesignErrorMessage("");
      await deleteRequirementApi(id);
      setRequirements((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setDesignErrorMessage(
        error instanceof Error
          ? error.message
          : "요구사항 삭제에 실패했습니다.",
      );
    }
  };

  const updateApiSpec = (id, field, value) => {
    setApiSpecs((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const addApiSpec = async () => {
    if (!currentWorkspaceId || currentWorkspaceId === "temporary") {
      setDesignErrorMessage("프로젝트를 먼저 선택해주세요.");
      return;
    }

    try {
      setDesignErrorMessage("");

      const created = await createWorkspaceApiSpecApi({
        workspaceId: currentWorkspaceId,
        method: "GET",
        endpoint: "/api/example",
        description: "",
        request: "",
        response: "",
      });

      setApiSpecs((prev) => [...prev, created]);
    } catch (error) {
      setDesignErrorMessage(
        error instanceof Error
          ? error.message
          : "API 명세서 생성에 실패했습니다.",
      );
    }
  };

  const deleteApiSpec = async (id) => {
    if (!window.confirm("이 API 명세를 삭제할까요?")) return;

    try {
      setDesignErrorMessage("");
      await deleteApiSpecApi(id);
      setApiSpecs((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setDesignErrorMessage(
        error instanceof Error
          ? error.message
          : "API 명세서 삭제에 실패했습니다.",
      );
    }
  };

  const addTable = () => {
    setErdNodes((prev) => [...prev, createTableNode()]);
  };

  const addFlowNode = (type) => {
    setFlowNodes((prev) => [...prev, createFlowNode(type)]);
  };

  const onErdConnect = useCallback(
    (params) => {
      const label = window.prompt("관계 설명을 입력하세요.", "관계");

      setErdEdges((edges) =>
        addEdge(
          {
            ...params,
            label: label || "",
            type: "smoothstep",
            animated: false,
            style: {
              stroke: "#64748b",
              strokeWidth: 2,
            },
            labelStyle: {
              fill: "#334155",
              fontWeight: 700,
              fontSize: 12,
            },
          },
          edges,
        ),
      );
    },
    [setErdEdges],
  );

  const onFlowConnect = useCallback(
    (params) => {
      const label = window.prompt("흐름 설명을 입력하세요.", "요청");

      setFlowEdges((edges) =>
        addEdge(
          {
            ...params,
            label: label || "",
            type: "smoothstep",
            animated: true,
            style: {
              stroke: "#4f46e5",
              strokeWidth: 2,
            },
            labelStyle: {
              fill: "#334155",
              fontWeight: 700,
              fontSize: 12,
            },
          },
          edges,
        ),
      );
    },
    [setFlowEdges],
  );

  const deleteErdEdge = useCallback(
    (_, edge) => {
      if (!window.confirm("이 관계선을 삭제할까요?")) return;
      setErdEdges((edges) => edges.filter((item) => item.id !== edge.id));
    },
    [setErdEdges],
  );

  const deleteFlowEdge = useCallback(
    (_, edge) => {
      if (!window.confirm("이 연결선을 삭제할까요?")) return;
      setFlowEdges((edges) => edges.filter((item) => item.id !== edge.id));
    },
    [setFlowEdges],
  );

  const filteredRequirements = requirements.filter((item) => {
    const keyword = requirementSearch.trim().toLowerCase();

    if (!keyword) return true;

    return (
      item.category.toLowerCase().includes(keyword) ||
      item.name.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    );
  });

  const filteredApiSpecs = apiSpecs.filter((item) => {
    const keyword = apiSearch.trim().toLowerCase();

    if (!keyword) return true;

    return (
      item.method.toLowerCase().includes(keyword) ||
      item.endpoint.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    );
  });

  const selectedPdfSectionLabels = DESIGN_PDF_SECTION_ITEMS.filter((item) =>
    selectedPdfSections.includes(item.id),
  ).map((item) => item.label);


  const togglePdfSection = (sectionId) => {
    setSelectedPdfSections((prev) => {
      if (prev.includes(sectionId)) {
        return prev.filter((id) => id !== sectionId);
      }

      return [...prev, sectionId];
    });
  };

  const selectAllPdfSections = () => {
    setSelectedPdfSections(DESIGN_PDF_SECTION_ITEMS.map((item) => item.id));
  };

  const clearPdfSections = () => {
    setSelectedPdfSections([]);
  };

  const handlePrintDesignPdf = useCallback(() => {
    const selectedSections = DESIGN_PDF_SECTION_ITEMS.filter((item) =>
      selectedPdfSections.includes(item.id),
    );

    if (selectedSections.length === 0) {
      alert("PDF로 출력할 항목을 1개 이상 선택해주세요.");
      setIsPdfMenuOpen(true);
      return;
    }

    const printWindow = window.open("", "_blank", "width=920,height=1000");

    if (!printWindow) {
      alert("팝업이 차단되어 PDF 저장 창을 열 수 없습니다.");
      return;
    }

    const documentTitle =
      selectedSections.length === DESIGN_PDF_SECTION_ITEMS.length
        ? "설계 문서"
        : `설계 문서 - ${selectedSections.map((item) => item.label).join(", ")}`;
    const selectedProjectName = currentWorkspaceName || "선택된 프로젝트";
    const selectedSectionText = selectedSections
      .map((item) => item.label)
      .join(", ");

    const requirementHtml = requirements.length
      ? requirements
          .map(
            (item, index) => `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(item.name || "이름 없는 요구사항")}</h2>
                    <p class="meta">${escapeHtml(item.category || "기본")}</p>
                  </div>
                </div>
                <p class="body-text">${escapeHtmlWithLineBreaks(item.description || "설명이 없습니다.")}</p>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">작성된 요구사항이 없습니다.</div>`;

    const apiHtml = apiSpecs.length
      ? apiSpecs
          .map(
            (item) => `
              <article class="print-card compact-card">
                <h2>
                  <span class="method">${escapeHtml(item.method || "GET")}</span>
                  ${escapeHtml(item.endpoint || "/api/example")}
                </h2>
                <p class="body-text">${escapeHtmlWithLineBreaks(
                  item.description || "설명이 없습니다.",
                )}</p>

                <div class="api-payload-grid">
                  <div>
                    <p class="payload-title">요청 데이터</p>
                    <pre class="code-block">${escapeHtml(formatApiPayload(item.request))}</pre>
                  </div>

                  <div>
                    <p class="payload-title">응답 데이터</p>
                    <pre class="code-block">${escapeHtml(formatApiPayload(item.response))}</pre>
                  </div>
                </div>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">작성된 API 명세가 없습니다.</div>`;

    const erdDiagramHtml = buildPrintDiagramSvg({
      nodes: erdNodes,
      edges: erdEdges,
      type: "erd",
    });

    const flowDiagramHtml = buildPrintDiagramSvg({
      nodes: flowNodes,
      edges: flowEdges,
      type: "flow",
    });

    const erdHtml = erdNodes.length
      ? erdNodes
          .map((node, index) => {
            const columns = getNodeColumns(node);

            return `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(getNodeLabel(node, `TABLE_${index + 1}`))}</h2>
                    <p class="meta">컬럼 ${columns.length}개</p>
                  </div>
                </div>
                <p class="body-text">${
                  columns.length
                    ? columns
                        .slice(0, 12)
                        .map((column) => {
                          const name =
                            typeof column.name === "string"
                              ? column.name
                              : "column";
                          const type =
                            typeof column.type === "string"
                              ? column.type
                              : "TYPE";

                          return `${escapeHtml(name)} (${escapeHtml(type)})`;
                        })
                        .join(", ")
                    : "컬럼이 없습니다."
                }</p>
              </article>
            `;
          })
          .join("")
      : `<div class="empty small-empty">작성된 ERD 테이블이 없습니다.</div>`;

    const flowHtml = flowNodes.length
      ? flowNodes
          .map(
            (node, index) => `
              <article class="print-card compact-card">
                <div class="print-card-header">
                  <span class="index">${index + 1}</span>
                  <div>
                    <h2>${escapeHtml(getNodeLabel(node, `NODE_${index + 1}`))}</h2>
                    <p class="meta">${escapeHtml(getNodeSubText(node))}</p>
                  </div>
                </div>
              </article>
            `,
          )
          .join("")
      : `<div class="empty small-empty">작성된 데이터 플로우가 없습니다.</div>`;

    const sectionHtmlMap = {
      requirements: requirementHtml,
      api: apiHtml,
      erd: `
        <p class="body-text section-description">설계단계에서 작성한 테이블과 관계선을 시각화한 다이어그램입니다.</p>
        ${erdDiagramHtml}
        ${erdHtml}
      `,
      flow: `
        <p class="body-text section-description">화면, 서버, DB, 외부 서비스 사이의 데이터 흐름을 시각화한 다이어그램입니다.</p>
        ${flowDiagramHtml}
        ${flowHtml}
      `,
    };

    const printBody = selectedSections
      .map(
        (section, index) => `
          <section class="print-section">
            <h2 class="section-title">${index + 1}. ${escapeHtml(section.printTitle)}</h2>
            ${sectionHtmlMap[section.id]}
          </section>
        `,
      )
      .join("");

    printWindow.document.write(`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(documentTitle)}</title>
          <style>
            @page {
              size: A4;
              margin: 18mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              background: #ffffff;
              color: #111827;
              font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              line-height: 1.65;
            }

            .document {
              width: 100%;
            }

            .document-header {
              padding-bottom: 18px;
              margin-bottom: 22px;
              border-bottom: 2px solid #1d4ed8;
            }

            .eyebrow {
              margin: 0 0 6px;
              color: #2563eb;
              font-size: 12px;
              font-weight: 800;
              letter-spacing: 0.08em;
            }

            h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 900;
              letter-spacing: -0.04em;
            }

            .header-meta {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
              margin-top: 16px;
            }

            .meta-box {
              padding: 10px 12px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #eff6ff;
            }

            .meta-label {
              display: block;
              margin-bottom: 2px;
              color: #64748b;
              font-size: 10px;
              font-weight: 800;
            }

            .meta-value {
              color: #0f172a;
              font-size: 13px;
              font-weight: 800;
            }

            .print-section {
              margin-bottom: 22px;
            }

            .section-title {
              margin: 0 0 8px;
              color: #1d4ed8;
              font-size: 18px;
              font-weight: 900;
            }

            .print-card {
              break-inside: avoid;
              page-break-inside: avoid;
              padding: 18px 0;
              border-bottom: 1px solid #e5e7eb;
            }

            .compact-card {
              padding: 12px 0;
            }

            .print-card:first-of-type {
              padding-top: 0;
            }

            .print-card-header {
              display: flex;
              gap: 10px;
              align-items: flex-start;
              margin-bottom: 10px;
            }

            .index {
              display: inline-flex;
              width: 26px;
              height: 26px;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              background: #2563eb;
              color: #ffffff;
              font-size: 12px;
              font-weight: 900;
              flex-shrink: 0;
            }

            h2 {
              margin: 0;
              color: #111827;
              font-size: 17px;
              font-weight: 900;
              letter-spacing: -0.02em;
            }

            .method {
              display: inline-block;
              margin-right: 6px;
              border-radius: 7px;
              background: #dbeafe;
              color: #1d4ed8;
              padding: 2px 7px;
              font-size: 11px;
            }

            .meta {
              margin: 3px 0 0;
              color: #64748b;
              font-size: 11px;
              font-weight: 700;
            }

            .body-text {
              margin: 0;
              color: #374151;
              font-size: 13px;
              font-weight: 600;
              white-space: normal;
            }

            .empty {
              padding: 40px 0;
              color: #64748b;
              font-size: 14px;
              font-weight: 700;
              text-align: center;
            }

            .small-empty {
              padding: 14px 0;
              text-align: left;
            }

            .section-description {
              margin-bottom: 10px;
            }

            .diagram-wrap {
              width: 100%;
              margin: 12px 0 18px;
              border: 1px solid #dbeafe;
              border-radius: 16px;
              overflow: hidden;
              background: #f8fbff;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .diagram-svg {
              display: block;
              width: 100%;
              min-height: 360px;
            }

            .diagram-title {
              fill: #0f172a;
              font-size: 13px;
              font-weight: 900;
            }

            .diagram-white {
              fill: #ffffff;
            }

            .diagram-column {
              fill: #334155;
              font-size: 11px;
              font-weight: 700;
            }

            .diagram-muted {
              fill: #64748b;
              font-size: 10px;
              font-weight: 700;
            }

            .code-block {
              margin: 8px 0 0;
              padding: 12px;
              border: 1px solid #dbeafe;
              border-radius: 12px;
              background: #f8fbff;
              color: #1e293b;
              font-size: 11px;
              font-weight: 700;
              line-height: 1.6;
              white-space: pre-wrap;
              word-break: break-word;
            }

            .api-payload-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-top: 10px;
            }

            .payload-title {
              margin: 0 0 4px;
              color: #2563eb;
              font-size: 11px;
              font-weight: 900;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .api-payload-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <main class="document">
            <header class="document-header">
              <p class="eyebrow">DESIGN DOCUMENT</p>
              <h1>${escapeHtml(documentTitle)}</h1>
              <section class="header-meta">
                <div class="meta-box">
                  <span class="meta-label">프로젝트</span>
                  <span class="meta-value">${escapeHtml(selectedProjectName)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">출력 항목</span>
                  <span class="meta-value">${escapeHtml(selectedSectionText)}</span>
                </div>
                <div class="meta-box">
                  <span class="meta-label">저장일</span>
                  <span class="meta-value">${escapeHtml(getPrintDateLabel())}</span>
                </div>
              </section>
            </header>

            ${printBody}
          </main>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
    };
  }, [
    currentWorkspaceName,
    requirements,
    apiSpecs,
    erdNodes,
    erdEdges,
    flowNodes,
    flowEdges,
    selectedPdfSections,
  ]);


  const activeTabInfo = TAB_ITEMS.find((tab) => tab.id === activeTab);

  return (
    <div className="flex h-[calc(100dvh-60px)] w-full min-w-0 gap-4 overflow-hidden bg-[#f4f6fb] p-4 font-sans text-slate-900 md:p-5">
      <ProjectSidebar
        allWorkspaces={allWorkspaces}
        currentWorkspaceId={currentWorkspaceId}
        isLoading={isWorkspaceLoading}
        errorMessage={workspaceErrorMessage}
      />

      <main className="flex h-full min-w-0 flex-1 flex-col gap-3 overflow-hidden">
        <section className="shrink-0 rounded-[20px] border border-white/70 bg-white/90 px-3 py-2.5 shadow-sm  ">
          <div className="flex min-h-[52px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 px-3">
              <div className="min-w-[104px]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">
                  Design
                </p>
                <h1 className="mt-0.5 truncate text-lg font-black tracking-tight text-slate-950">
                  설계단계
                </h1>
              </div>

              <div className="hidden min-w-0 rounded-xl bg-slate-50 px-3 py-2 md:block">
                <p className="truncate text-[11px] font-black text-slate-400">
                  현재 프로젝트
                </p>
                <p className="truncate text-xs font-black text-slate-800">
                  {isWorkspaceLoading ? "불러오는 중" : currentWorkspaceName}
                </p>
              </div>

              <div className="hidden h-8 w-px bg-slate-200 lg:block" />

              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-2xl bg-slate-100/80 p-1">
                {TAB_ITEMS.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`h-8 shrink-0 rounded-xl px-3 text-xs font-extrabold transition ${
                        isActive
                          ? "bg-blue-500 text-white shadow-sm"
                          : "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {saveMessage && (
                <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-600 sm:inline-flex">
                  {saveMessage}
                </span>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsPdfMenuOpen((prev) => !prev)}
                  disabled={isDesignLoading || !isDesignReady}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 text-xs font-extrabold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={14} />
                  PDF 저장
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-600">
                    {selectedPdfSections.length}
                  </span>
                </button>

                {isPdfMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-[280px] rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          PDF 출력 항목
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                          선택한 항목만 문서에 포함됩니다.
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
                        {selectedPdfSections.length}개 선택
                      </span>
                    </div>

                    <div className="mb-3 flex gap-1.5">
                      <button
                        type="button"
                        onClick={selectAllPdfSections}
                        className="h-7 rounded-lg bg-blue-50 px-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        전체 선택
                      </button>
                      <button
                        type="button"
                        onClick={clearPdfSections}
                        className="h-7 rounded-lg bg-slate-50 px-2.5 text-[11px] font-black text-slate-500 transition hover:bg-slate-100"
                      >
                        선택 해제
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {DESIGN_PDF_SECTION_ITEMS.map((item) => {
                        const checked = selectedPdfSections.includes(item.id);

                        return (
                          <label
                            key={item.id}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                              checked
                                ? "border-blue-200 bg-blue-50 text-blue-800"
                                : "border-slate-100 bg-white text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            <span className="font-black">{item.label}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePdfSection(item.id)}
                              className="h-4 w-4 accent-blue-600"
                            />
                          </label>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handlePrintDesignPdf();
                        if (selectedPdfSections.length > 0) {
                          setIsPdfMenuOpen(false);
                        }
                      }}
                      disabled={selectedPdfSections.length === 0}
                      className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-extrabold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Download size={14} />
                      선택 항목 PDF 저장
                    </button>

                    <p className="mt-2 truncate text-[11px] font-bold text-slate-400">
                      선택됨: {selectedPdfSectionLabels.length > 0 ? selectedPdfSectionLabels.join(", ") : "없음"}
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={saveData}
                disabled={isDesignSaving || isDesignLoading || !isDesignReady}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <VscSave size={14} />
                {isDesignSaving ? "저장 중" : "저장"}
              </button>
            </div>
          </div>
        </section>

        {designErrorMessage && (
          <div className="shrink-0 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
            {designErrorMessage}
          </div>
        )}

        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-white/70 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black tracking-tight text-slate-950">
                  {activeTabInfo?.label}
                </h2>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                  {activeTabInfo?.description}
                </p>
              </div>

              {activeTab === "requirements" && (
                <div className="flex shrink-0 items-center gap-3">
                  <SearchBox
                    value={requirementSearch}
                    onChange={setRequirementSearch}
                    placeholder="요구사항 검색"
                  />

                  <button
                    type="button"
                    onClick={addRequirement}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-white shadow-sm shadow-indigo-200 transition hover:bg-blue-700"
                  >
                    <VscAdd size={15} />
                    요구사항 추가
                  </button>
                </div>
              )}

              {activeTab === "api" && (
                <div className="flex shrink-0 items-center gap-3">
                  <SearchBox
                    value={apiSearch}
                    onChange={setApiSearch}
                    placeholder="API 검색"
                  />

                  <button
                    type="button"
                    onClick={addApiSpec}
                    className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-extrabold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
                  >
                    <VscAdd size={15} />
                    API 추가
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-gradient-to-b from-white to-slate-50/60">
            {activeTab === "requirements" && (
              <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
                {requirements.length === 0 ? (
                  <EmptyState
                    icon={VscCheck}
                    title="아직 작성된 요구사항이 없습니다."
                    description="프로젝트에서 구현해야 할 기능을 먼저 정리하세요."
                    buttonText="첫 요구사항 추가"
                    onClick={addRequirement}
                  />
                ) : (
                  <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-[20px] border border-slate-200 bg-white">
                    <table className="w-full table-fixed border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 shadow-sm">
                        <tr>
                          <th className="w-[18%] px-3 py-2.5">구분</th>
                          <th className="w-[24%] px-3 py-2.5">기능명</th>
                          <th className="w-[50%] px-3 py-2.5">설명</th>
                          <th className="w-[8%] px-3 py-2.5 text-center">
                            삭제
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredRequirements.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 transition hover:bg-indigo-50/40"
                          >
                            <td className="px-3 py-2.5">
                              <FieldInput
                                value={item.category}
                                onChange={(value) =>
                                  updateRequirement(item.id, "category", value)
                                }
                                placeholder="예: 회원"
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <FieldInput
                                value={item.name}
                                onChange={(value) =>
                                  updateRequirement(item.id, "name", value)
                                }
                                placeholder="예: 로그인"
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <FieldTextarea
                                value={item.description}
                                onChange={(value) =>
                                  updateRequirement(
                                    item.id,
                                    "description",
                                    value,
                                  )
                                }
                                placeholder="이 기능이 무엇을 하는지 적어주세요."
                              />
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => deleteRequirement(item.id)}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                              >
                                <VscTrash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === "erd" && (
              <section className="relative h-full min-h-0 min-w-0 overflow-hidden">
                <div className="absolute left-4 top-4 z-20 w-[218px] rounded-[20px] border border-white/80 bg-white/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur">
                  <h2 className="text-sm font-black text-slate-900">
                    ERD 작성
                  </h2>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                    테이블과 컬럼을 만들고 관계선을 연결합니다.
                  </p>

                  <button
                    type="button"
                    onClick={addTable}
                    className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-xs font-extrabold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
                  >
                    <VscAdd size={14} />
                    테이블 추가
                  </button>
                </div>

                {erdNodes.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-6">
                    <EmptyState
                      icon={VscDatabase}
                      title="아직 작성된 ERD가 없습니다."
                      description="데이터베이스에 저장할 테이블과 컬럼을 추가하세요."
                      buttonText="첫 테이블 추가"
                      onClick={addTable}
                    />
                  </div>
                ) : (
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={erdNodes}
                      edges={erdEdges}
                      onNodesChange={onErdNodesChange}
                      onEdgesChange={onErdEdgesChange}
                      onConnect={onErdConnect}
                      onEdgeDoubleClick={deleteErdEdge}
                      nodeTypes={nodeTypes}
                      fitView
                      minZoom={0.2}
                      maxZoom={1.8}
                    >
                      <Background color="#d8dce8" gap={22} size={1} />
                      <Controls className="rounded-2xl border border-slate-200 bg-white shadow-lg" />
                    </ReactFlow>
                  </ReactFlowProvider>
                )}
              </section>
            )}

            {activeTab === "flow" && (
              <section className="relative h-full min-h-0 min-w-0 overflow-hidden">
                <div className="absolute left-4 top-4 z-20 w-[238px] rounded-[20px] border border-white/80 bg-white/95 p-3 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur">
                  <h2 className="text-sm font-black text-slate-900">
                    데이터 플로우
                  </h2>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                    화면, 서버, DB, 외부 서비스 흐름을 표현합니다.
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => addFlowNode("client")}
                      className="rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      화면
                    </button>

                    <button
                      type="button"
                      onClick={() => addFlowNode("server")}
                      className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-600 transition hover:bg-emerald-100"
                    >
                      서버
                    </button>

                    <button
                      type="button"
                      onClick={() => addFlowNode("db")}
                      className="rounded-2xl bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-600 transition hover:bg-orange-100"
                    >
                      DB
                    </button>

                    <button
                      type="button"
                      onClick={() => addFlowNode("external")}
                      className="rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-extrabold text-indigo-600 transition hover:bg-indigo-100"
                    >
                      외부
                    </button>
                  </div>
                </div>

                {flowNodes.length === 0 ? (
                  <div className="flex h-full items-center justify-center p-6">
                    <EmptyState
                      icon={VscGlobe}
                      title="아직 작성된 데이터 플로우가 없습니다."
                      description="화면, 서버, DB 노드를 추가해서 데이터 흐름을 표현하세요."
                      buttonText="첫 노드 추가"
                      onClick={() => addFlowNode("server")}
                    />
                  </div>
                ) : (
                  <ReactFlowProvider>
                    <ReactFlow
                      nodes={flowNodes}
                      edges={flowEdges}
                      onNodesChange={onFlowNodesChange}
                      onEdgesChange={onFlowEdgesChange}
                      onConnect={onFlowConnect}
                      onEdgeDoubleClick={deleteFlowEdge}
                      nodeTypes={nodeTypes}
                      fitView
                      minZoom={0.2}
                      maxZoom={1.8}
                    >
                      <Background color="#d8dce8" gap={22} size={1} />
                      <Controls className="rounded-2xl border border-slate-200 bg-white shadow-lg" />
                    </ReactFlow>
                  </ReactFlowProvider>
                )}
              </section>
            )}

            {activeTab === "api" && (
              <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden p-4">
                {apiSpecs.length === 0 ? (
                  <EmptyState
                    icon={VscServer}
                    title="아직 작성된 API 명세가 없습니다."
                    description="프론트와 백엔드가 연결될 API 주소를 정리하세요."
                    buttonText="첫 API 추가"
                    onClick={addApiSpec}
                  />
                ) : (
                  <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-[20px] border border-slate-200 bg-white">
                    <table className="w-full min-w-[1050px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-extrabold uppercase text-slate-500 shadow-sm">
                        <tr>
                          <th className="w-[10%] px-3 py-2.5 text-center">
                            Method
                          </th>
                          <th className="w-[20%] px-3 py-2.5">Endpoint</th>
                          <th className="w-[24%] px-3 py-2.5">설명</th>
                          <th className="w-[21%] px-3 py-2.5">요청 데이터</th>
                          <th className="w-[21%] px-3 py-2.5">응답 데이터</th>
                          <th className="w-[4%] px-3 py-2.5 text-center">
                            삭제
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredApiSpecs.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-100 transition hover:bg-indigo-50/40"
                          >
                            <td className="px-3 py-2.5 text-center">
                              <SimpleSelect
                                value={item.method}
                                onChange={(value) =>
                                  updateApiSpec(item.id, "method", value)
                                }
                                options={METHOD_OPTIONS}
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <FieldInput
                                value={item.endpoint}
                                onChange={(value) =>
                                  updateApiSpec(item.id, "endpoint", value)
                                }
                                placeholder="/api/example"
                                className="font-mono "
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <FieldTextarea
                                value={item.description}
                                onChange={(value) =>
                                  updateApiSpec(item.id, "description", value)
                                }
                                placeholder="API 설명"
                                rows={2}
                                className="font-mono text-xs"
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <FieldTextarea
                                value={item.request}
                                onChange={(value) =>
                                  updateApiSpec(item.id, "request", value)
                                }
                                placeholder="요청 데이터"
                                rows={2}
                                className="font-mono text-xs"
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <FieldTextarea
                                value={item.response}
                                onChange={(value) =>
                                  updateApiSpec(item.id, "response", value)
                                }
                                placeholder="응답 데이터"
                                rows={2}
                                className="font-mono text-xs"
                              />
                            </td>

                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => deleteApiSpec(item.id)}
                                className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                              >
                                <VscTrash size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
