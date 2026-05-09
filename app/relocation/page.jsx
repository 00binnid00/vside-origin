"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, { 
  MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position, useReactFlow, ReactFlowProvider, SelectionMode
} from "reactflow";
import "reactflow/dist/style.css";

import {
  VscTrash, VscAdd, VscKey, VscCopy, VscClose, VscSave, VscFileMedia, VscLayout,
  VscServer, VscDatabase, VscGlobe, VscCloud, VscDesktopDownload, VscFolderOpened, VscMarkdown, VscSearch,
  VscArrowUp, VscArrowDown, VscGripper, VscHistory, VscDebugStepBack, VscWarning, VscSymbolColor, VscPulse,
  VscGoToFile, VscInfo, VscInbox, VscNote, VscCheckAll, VscCode, VscChevronDown, VscTools, VscFiles,
  VscDiscard, VscRedo, VscPieChart, VscChevronUp, VscQuestion, VscLightbulb,
  VscLock, VscUnlock, VscCheck, VscTerminalCmd, VscSettingsGear, VscEye, VscEyeClosed, VscRocket, VscListSelection,
  VscTable, VscNewFile, VscJson, VscSend, VscBook, VscWand, VscBookmark
} from "react-icons/vsc";

import { v4 as uuidv4 } from "uuid";
import toast, { Toaster } from "react-hot-toast";
import { toPng, toBlob } from "html-to-image"; 
import { motion, AnimatePresence } from "framer-motion";

import MenuBar from "@/components/ide/MenuBar";

const SAVE_KEY = "devw-architecture-pro-v51";
const HISTORY_KEY = "devw-architecture-history";
const TODO_KEY = "devw-architecture-todo";
const THEME_KEY = "devw-architecture-theme"; 
// 💡 커스텀 스니펫 저장을 위한 고유 키 추가
const SNIPPET_KEY = "devw-architecture-snippets-v1"; 

// ==========================================
// 🗄️ 1. ERD 테이블 커스텀 노드
// ==========================================
const TableNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();

  const [localName, setLocalName] = useState(data.name || '');
  useEffect(() => { setLocalName(data.name || ''); }, [data.name]);

  const onNameBlur = () => { setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, name: localName } } : n)); };
  const addColumn = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: [...n.data.columns, { id: uuidv4(), name: 'new_column', type: 'VARCHAR', isPk: false, isFk: false }] }, isCollapsed: false } : n));
  const updateColumn = (colId, field, value) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: n.data.columns.map((c) => c.id === colId ? { ...c, [field]: value } : c) } } : n));
  const deleteColumn = (colId) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: n.data.columns.filter((c) => c.id !== colId) } } : n));
  const deleteTable = () => { if(window.confirm('이 테이블을 정말 삭제하시겠습니까?')) setNodes((nds) => nds.filter((n) => n.id !== id)); };
  
  const toggleCollapse = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, isCollapsed: !n.data.isCollapsed } } : n));
  const toggleLock = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, draggable: !n.draggable, data: { ...n.data, isLocked: !n.data.isLocked } } : n));

  const hasError = data.columns.length > 0 && !data.columns.some(c => c.isPk);
  const isCollapsed = data.isCollapsed;
  const isLocked = data.isLocked;
  const stopProp = (e) => e.stopPropagation();

  const highlightClass = data.isHighlighted ? 'ring-4 ring-rose-500 animate-pulse shadow-rose-500/50' : '';

  return (
    <div className={`w-[280px] ${data.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 ${selected && !isLocked ? 'ring-4 ring-indigo-500/60 scale-[1.03] shadow-indigo-500/30' : 'hover:shadow-2xl'} ${isLocked ? 'opacity-90 grayscale-[20%]' : ''} ${highlightClass}`}>
      <Handle type="target" position={Position.Left} className={`w-4 h-4 border-2 border-white shadow-md ${isLocked ? 'bg-slate-400' : 'bg-indigo-500'}`} />
      <Handle type="source" position={Position.Right} className={`w-4 h-4 border-2 border-white shadow-md ${isLocked ? 'bg-slate-400' : 'bg-pink-500'}`} />

      <div className={`${isLocked ? '' : 'custom-drag-handle cursor-move'} ${data.color || (data.isDark ? 'bg-slate-900' : 'bg-slate-800')} px-4 py-3 flex justify-between items-center transition-colors`}>
        <div className="flex items-center gap-2 w-full">
          <div className={`w-2.5 h-2.5 rounded-full ${hasError ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]' : (isLocked ? 'bg-slate-400' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]')} shrink-0 transition-colors`}></div>
          <input value={localName} onChange={(e) => setLocalName(e.target.value)} onBlur={onNameBlur} onKeyDown={stopProp} onMouseDown={stopProp} disabled={isLocked} className="nodrag nopan bg-transparent text-white font-black text-[14px] outline-none w-full tracking-wider disabled:opacity-80" placeholder="TABLE_NAME" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onMouseDown={stopProp} onClick={toggleLock} className={`nodrag p-1.5 rounded-lg transition-all ${isLocked ? 'text-yellow-400 hover:bg-yellow-400/20 bg-yellow-400/10' : 'text-white/40 hover:text-white hover:bg-white/20'}`} title={isLocked ? "잠금 해제" : "위치 고정"}>
            {isLocked ? <VscLock size={15}/> : <VscUnlock size={15}/>}
          </button>
          <button onMouseDown={stopProp} onClick={toggleCollapse} className="nodrag text-white/40 hover:text-white hover:bg-white/20 p-1.5 rounded-lg transition-all" title={isCollapsed ? "펼치기" : "접기"}>
            {isCollapsed ? <VscChevronDown size={16}/> : <VscChevronUp size={16}/>}
          </button>
          {!isLocked && <button onMouseDown={stopProp} onClick={deleteTable} className="nodrag text-white/40 hover:text-red-400 hover:bg-white/10 p-1.5 rounded-lg transition-all" title="삭제"><VscTrash size={16} /></button>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className={`flex flex-col ${data.isDark ? 'bg-slate-800' : 'bg-white'} overflow-hidden`}>
            {data.columns.map((col) => (
              <div key={col.id} className={`flex items-center gap-2 px-3 py-1.5 border-b ${data.isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-50 hover:bg-slate-50'} group transition-colors`}>
                <div className="flex gap-1 shrink-0 nodrag">
                  <label className="flex items-center cursor-pointer text-[10px]" title="기본키 (PK)">
                    <input type="checkbox" checked={col.isPk} disabled={isLocked} onChange={(e) => updateColumn(col.id, 'isPk', e.target.checked)} className="hidden" />
                    <div className={`p-1.5 rounded-md transition-all ${col.isPk ? 'bg-amber-100 text-amber-600 shadow-sm' : (data.isDark ? 'text-slate-500 hover:bg-slate-600' : 'text-slate-300 hover:bg-slate-200')}`}><VscKey size={14} /></div>
                  </label>
                  <label className="flex items-center cursor-pointer text-[10px]" title="외래키 (FK)">
                    <input type="checkbox" checked={col.isFk} disabled={isLocked} onChange={(e) => updateColumn(col.id, 'isFk', e.target.checked)} className="hidden" />
                    <div className={`p-1.5 rounded-md transition-all ${col.isFk ? 'bg-blue-100 text-blue-600 shadow-sm' : (data.isDark ? 'text-slate-500 hover:bg-slate-600' : 'text-slate-300 hover:bg-slate-200')}`}><VscKey size={14} style={{ transform: 'rotate(180deg)' }} /></div>
                  </label>
                </div>
                <input value={col.name} onKeyDown={stopProp} onMouseDown={stopProp} disabled={isLocked} onChange={(e) => updateColumn(col.id, 'name', e.target.value)} className={`nodrag nopan flex-1 text-[12px] font-bold bg-transparent outline-none min-w-0 ${data.isDark ? 'text-slate-200' : 'text-slate-700'} disabled:opacity-70`} placeholder="column_name" />
                <select value={col.type} onKeyDown={stopProp} onMouseDown={stopProp} disabled={isLocked} onChange={(e) => updateColumn(col.id, 'type', e.target.value)} className={`nodrag nopan text-[10px] font-mono font-black border-none rounded-md px-1.5 py-1 outline-none w-[80px] shrink-0 cursor-pointer transition-colors disabled:opacity-70 ${data.isDark ? 'bg-slate-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                  <option>VARCHAR</option><option>INT</option><option>BIGINT</option><option>DATETIME</option><option>BOOLEAN</option><option>TEXT</option>
                </select>
                {!isLocked && <button onClick={() => deleteColumn(col.id)} className="nodrag text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md"><VscTrash size={14} /></button>}
              </div>
            ))}
            {!isLocked && (
              <button onClick={addColumn} className={`nodrag p-3 w-full text-center text-[12px] font-extrabold transition-colors flex items-center justify-center gap-1.5 ${data.isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 bg-slate-50/50 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                <VscAdd size={14}/> 새 속성 추가
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 🌟 2. 시스템 데이터 플로우 커스텀 노드
// ==========================================
const SystemNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  
  const [localLabel, setLocalLabel] = useState(data.label || '');
  const [localTech, setLocalTech] = useState(data.techStack || ''); 

  useEffect(() => { setLocalLabel(data.label || ''); setLocalTech(data.techStack || ''); }, [data.label, data.techStack]);
  
  const onLabelBlur = () => { setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: localLabel } } : n)); };
  const onTechBlur = () => { setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, techStack: localTech } } : n)); };

  const deleteNode = () => { if(window.confirm('이 컴포넌트를 정말 삭제하시겠습니까?')) setNodes((nds) => nds.filter((n) => n.id !== id)); };
  const toggleLock = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, draggable: !n.draggable, data: { ...n.data, isLocked: !n.data.isLocked } } : n));

  const isLocked = data.isLocked;
  const stopProp = (e) => e.stopPropagation();

  const getStyle = () => {
    if (data.color) return { bg: data.color, border: 'border-transparent', text: 'text-white', icon: <VscGlobe className="text-slate-800" size={22}/> };
    if (data.isDark) {
      switch(data.type) {
        case 'client': return { bg: 'bg-blue-900/40', border: 'border-blue-700', text: 'text-blue-200', icon: <VscGlobe className="text-blue-400" size={22}/> };
        case 'server': return { bg: 'bg-emerald-900/40', border: 'border-emerald-700', text: 'text-emerald-200', icon: <VscServer className="text-emerald-400" size={22}/> };
        case 'db': return { bg: 'bg-orange-900/40', border: 'border-orange-700', text: 'text-orange-200', icon: <VscDatabase className="text-orange-400" size={22}/> };
        case 'cloud': return { bg: 'bg-purple-900/40', border: 'border-purple-700', text: 'text-purple-200', icon: <VscCloud className="text-purple-400" size={22}/> };
        default: return { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-200', icon: <VscAdd size={22}/> };
      }
    } else {
      switch(data.type) {
        case 'client': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: <VscGlobe className="text-blue-600" size={22}/> };
        case 'server': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: <VscServer className="text-emerald-600" size={22}/> };
        case 'db': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: <VscDatabase className="text-orange-600" size={22}/> };
        case 'cloud': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: <VscCloud className="text-purple-600" size={22}/> };
        default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', icon: <VscAdd size={22}/> };
      }
    }
  };
  const style = getStyle();
  const highlightClass = data.isHighlighted ? 'ring-4 ring-rose-500 animate-pulse shadow-rose-500/50' : '';

  return (
    <div className={`relative min-w-[200px] px-4 py-3 flex items-center gap-3 rounded-2xl border-2 ${style.bg} ${style.border} shadow-lg transition-all duration-300 ${selected && !isLocked ? 'ring-4 ring-indigo-500/60 scale-[1.05] shadow-indigo-500/40 z-50' : 'hover:shadow-xl'} ${isLocked ? 'opacity-90 grayscale-[20%]' : ''} ${highlightClass}`}>
      <Handle type="target" position={Position.Top} id="top-t" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />
      <Handle type="target" position={Position.Left} id="left-t" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Right} id="right-s" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />

      <div className={`p-2.5 rounded-xl shadow-sm shrink-0 flex items-center justify-center relative group ${data.color ? 'bg-white/90' : (data.isDark ? 'bg-slate-800' : 'bg-white')}`}>
        {style.icon}
        <button onMouseDown={stopProp} onClick={toggleLock} className={`absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 text-white opacity-0 transition-opacity ${isLocked ? 'opacity-100 bg-black/60 text-yellow-400' : 'group-hover:opacity-100'}`} title={isLocked ? "잠금 해제" : "위치 고정"}>
          {isLocked ? <VscLock size={16}/> : <VscUnlock size={16}/>}
        </button>
      </div>
      <div className="flex flex-col w-full">
        <input value={localLabel} onChange={(e) => setLocalLabel(e.target.value)} onBlur={onLabelBlur} onKeyDown={stopProp} onMouseDown={stopProp} disabled={isLocked} className={`nodrag nopan bg-transparent font-black text-[15px] outline-none w-full ${style.text} disabled:opacity-80`} placeholder="컴포넌트 이름" />
        <input value={localTech} onChange={(e) => setLocalTech(e.target.value)} onBlur={onTechBlur} onKeyDown={stopProp} onMouseDown={stopProp} disabled={isLocked} className={`nodrag nopan bg-transparent font-medium text-[11px] outline-none w-full mt-0.5 ${data.isDark ? 'text-slate-400' : 'text-slate-500'} disabled:opacity-80 placeholder:opacity-50`} placeholder="적용 기술 (예: React)" />
      </div>
      
      {!isLocked && <button onClick={deleteNode} className="nodrag absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600 hover:scale-110"><VscTrash size={14} /></button>}
    </div>
  );
};

// ==========================================
// 📌 3. 포스트잇 (Sticky Note) 커스텀 노드
// ==========================================
const StickyNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  
  const [localText, setLocalText] = useState(data.text || '');
  useEffect(() => { setLocalText(data.text || ''); }, [data.text]);

  const onBlur = () => { setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, text: localText } } : n)); };
  const deleteNode = () => { if(window.confirm('메모를 삭제하시겠습니까?')) setNodes((nds) => nds.filter((n) => n.id !== id)); };
  const toggleLock = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, draggable: !n.draggable, data: { ...n.data, isLocked: !n.data.isLocked } } : n));
  const toggleCollapse = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, isCollapsed: !n.data.isCollapsed } } : n));

  const isLocked = data.isLocked;
  const isCollapsed = data.isCollapsed;
  const bgColor = data.color || (data.isDark ? '#b45309' : '#fef08a');
  const textColor = data.isDark ? 'text-white' : 'text-slate-800';
  const stopProp = (e) => e.stopPropagation();

  return (
    <div className={`flex flex-col shadow-lg transition-all duration-300 ${selected && !isLocked ? 'ring-4 ring-yellow-400/60 shadow-yellow-500/30 z-50 scale-[1.02]' : 'hover:shadow-2xl'} ${isLocked ? 'opacity-90' : ''}`} style={{ backgroundColor: bgColor, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)' }}>
      <div className={`${isLocked ? '' : 'custom-drag-handle cursor-move'} h-9 w-full bg-black/10 flex justify-between items-center px-3 transition-colors ${isCollapsed ? 'min-w-[200px]' : ''}`}>
        <div className="flex items-center gap-1.5 text-black/40 font-bold text-[11px]">
          <VscNote size={15}/> {isCollapsed && "메모장 (최소화됨)"}
        </div>
        <div className="flex gap-1 items-center">
          <button onMouseDown={stopProp} onClick={toggleLock} className={`nodrag p-1 rounded transition-colors ${isLocked ? 'text-black/70 bg-black/20' : 'text-black/30 hover:text-black/70 hover:bg-white/30'}`} title={isLocked ? "잠금 해제" : "위치 고정"}>
             {isLocked ? <VscLock size={14}/> : <VscUnlock size={14}/>}
          </button>
          <button onMouseDown={stopProp} onClick={toggleCollapse} className="nodrag text-black/30 hover:text-black/70 hover:bg-white/30 p-1 rounded transition-colors" title={isCollapsed ? "펼치기" : "접기"}>
            {isCollapsed ? <VscChevronDown size={15}/> : <VscChevronUp size={15}/>}
          </button>
          {!isLocked && <button onMouseDown={stopProp} onClick={deleteNode} className="nodrag text-black/40 hover:text-red-600 hover:bg-white/30 p-1 rounded transition-colors" title="삭제"><VscTrash size={15}/></button>}
        </div>
      </div>
      
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-1">
            <textarea 
              className={`nodrag nopan bg-transparent outline-none p-4 pb-6 text-[14px] font-medium leading-relaxed custom-scrollbar ${textColor}`} 
              style={{ resize: isLocked ? 'none' : 'both', minWidth: '240px', minHeight: '180px' }}
              value={localText} 
              disabled={isLocked} 
              onChange={(e) => setLocalText(e.target.value)} 
              onBlur={onBlur} 
              onKeyDown={stopProp} 
              onMouseDown={stopProp} 
              placeholder="여기에 메모나 주석을 남기세요. (우측 하단을 끌어 크기 조절)" 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 🚀 메인 기획설계 컴포넌트
// ==========================================
export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('requirements'); 
  const [isDark, setIsDark] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [globalSearchStr, setGlobalSearchStr] = useState('');
  const [showMinimap, setShowMinimap] = useState(true);

  const reqListEndRef = useRef(null);
  const apiListEndRef = useRef(null);

  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([{ id: 'f1', type: 'systemNode', position: { x: 300, y: 200 }, data: { label: 'Web Browser', type: 'client', techStack: 'React', isDark, isLocked: false } }, { id: 'f2', type: 'systemNode', position: { x: 700, y: 200 }, data: { label: 'Spring Boot API', type: 'server', techStack: 'Spring Boot, JPA', isDark, isLocked: false } }]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState([{ id: 'e1-2', source: 'f1', target: 'f2', sourceHandle: 'right-s', targetHandle: 'left-t', label: 'REST API 요청', animated: true, type: 'smoothstep', style: { stroke: '#6366f1', strokeWidth: 2 } }]);
  const flowNodeTypes = useMemo(() => ({ systemNode: SystemNode, stickyNode: StickyNode }), []);

  const [erdNodes, setErdNodes, onErdNodesChange] = useNodesState([{ id: 'table-1', type: 'tableNode', position: { x: 100, y: 100 }, dragHandle: '.custom-drag-handle', data: { name: 'USERS', columns: [{ id: uuidv4(), name: 'id', type: 'INT', isPk: true, isFk: false }], isCollapsed: false, isLocked: false, isDark } }]);
  const [erdEdges, setErdEdges, onErdEdgesChange] = useEdgesState([]);
  const erdNodeTypes = useMemo(() => ({ tableNode: TableNode, stickyNode: StickyNode }), []);
  
  const [requirements, setRequirements] = useState([{ id: uuidv4(), category: '회원', name: '로그인 기능', priority: 'High', status: 'Todo', desc: 'JWT 기반의 커스텀 로그인 구현', note: '스프링 시큐리티' }]);
  const [apiSpecs, setApiSpecs] = useState([{ id: uuidv4(), method: 'GET', endpoint: '/api/v1/users/me', desc: '현재 접속 중인 사용자 정보 조회' }]);

  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useState(false);

  // 💡 커스텀 스니펫 상태 관리
  const [customSnippets, setCustomSnippets] = useState([]);

  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [lastSavedTime, setLastSavedTime] = useState(''); 

  const [showSqlModal, setShowSqlModal] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');
  const [isSqlImportModalOpen, setIsSqlImportModalOpen] = useState(false);
  const [sqlImportText, setSqlImportText] = useState('');
  const [isLinterModalOpen, setIsLinterModalOpen] = useState(false);
  const [linterIssues, setLinterIssues] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false); 

  const [isMockViewerOpen, setIsMockViewerOpen] = useState(false);
  const [mockViewerData, setMockViewerData] = useState(null);

  const [isCodeHubOpen, setIsCodeHubOpen] = useState(false);
  const [codeHubFiles, setCodeHubFiles] = useState([]);
  const [selectedCodeIndex, setSelectedCodeIndex] = useState(0);
  const [codeStack, setCodeStack] = useState('settings'); 
  
  const [codeSettings, setCodeSettings] = useState({ 
    packageName: 'com.project.app', 
    apiPrefix: '/api/v1', 
    dbType: 'mysql', 
    javaVersion: '17',
    springVersion: '3.x',
    frontendFramework: 'Next.js (App Router)',
    uiLibrary: 'Tailwind CSS',
    useLombok: true, 
    useSwagger: true 
  });

  const [reqSearch, setReqSearch] = useState('');
  const [apiSearch, setApiSearch] = useState('');
  const [canvasSearch, setCanvasSearch] = useState('');
  
  const [insertTarget, setInsertTarget] = useState(null); 
  const [edgeStyle, setEdgeStyle] = useState('smoothstep');

  const erdErrorCount = useMemo(() => erdNodes.filter(n => n.type === 'tableNode' && (n.data.columns.length === 0 || !n.data.columns.some(c => c.isPk))).length, [erdNodes]);
  const apiErrorCount = useMemo(() => apiSpecs.filter(a => !a.endpoint || !a.endpoint.startsWith('/') || !a.desc).length, [apiSpecs]);

  const getSnapshot = useCallback(() => JSON.stringify({ requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges }), [requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges]);

  const recordHistory = useCallback(() => {
    setPast(p => [...p, getSnapshot()].slice(-50));
    setFuture([]);
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [getSnapshot]);

  const handleUndo = useCallback(() => {
    if (past.length > 0) {
      const previousStateStr = past[past.length - 1]; const previousState = JSON.parse(previousStateStr);
      setFuture(f => [getSnapshot(), ...f]); setPast(p => p.slice(0, -1));
      setRequirements(previousState.requirements); setApiSpecs(previousState.apiSpecs); setErdNodes(previousState.erdNodes); setErdEdges(previousState.erdEdges); setFlowNodes(previousState.flowNodes); setFlowEdges(previousState.flowEdges); 
      toast('실행 취소 (Undo)', { icon: '↩️', id: 'undo' });
    }
  }, [past, getSnapshot]);

  const handleRedo = useCallback(() => {
    if (future.length > 0) {
      const nextStateStr = future[0]; const nextState = JSON.parse(nextStateStr);
      setPast(p => [...p, getSnapshot()]); setFuture(f => f.slice(1));
      setRequirements(nextState.requirements); setApiSpecs(nextState.apiSpecs); setErdNodes(nextState.erdNodes); setErdEdges(nextState.erdEdges); setFlowNodes(nextState.flowNodes); setFlowEdges(nextState.flowEdges); 
      toast('다시 실행 (Redo)', { icon: '↪️', id: 'redo' });
    }
  }, [future, getSnapshot]);

  const handleResetProject = () => {
    if(window.confirm('캔버스와 모든 명세서 데이터가 초기화됩니다. 계속하시겠습니까?\n(실행 취소(Ctrl+Z)로 복구 가능합니다)')) {
      recordHistory();
      setRequirements([]); setApiSpecs([]); setErdNodes([]); setErdEdges([]); setFlowNodes([]); setFlowEdges([]);
      toast.success('새 프로젝트가 시작되었습니다!', { icon: '✨' });
      setOpenMenu(null);
    }
  };

  const saveSnapshot = useCallback((label = '수동 저장') => {
    const snapshot = { id: uuidv4(), timestamp: new Date().toLocaleString(), label, data: { requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges } };
    setHistoryList(prev => [snapshot, ...prev].slice(0, 20)); 
    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    toast.success(`'${label}'(으)로 스냅샷 저장 완료!`, { icon: '📸' });
  }, [requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges]);

  const restoreSnapshot = (snapshot) => {
    if(!window.confirm(`'${snapshot.label}'(${snapshot.timestamp}) 상태로 되돌리시겠습니까? 현재 작업 내역은 덮어씌워집니다.`)) return;
    recordHistory(); 
    setRequirements(snapshot.data.requirements); setApiSpecs(snapshot.data.apiSpecs); setErdNodes(snapshot.data.erdNodes); setErdEdges(snapshot.data.erdEdges); setFlowNodes(snapshot.data.flowNodes); setFlowEdges(snapshot.data.flowEdges); setIsHistoryModalOpen(false);
    toast.success('버전 복구가 완료되었습니다.', { icon: '⏪' });
  };

  const deleteSnapshot = (e, id) => { e.stopPropagation(); setHistoryList(prev => prev.filter(h => h.id !== id)); };

  useEffect(() => {
    setErdNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isDark } })));
    setFlowNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isDark } })));
  }, [isDark, setErdNodes, setFlowNodes]);

  useEffect(() => {
    const savedData = localStorage.getItem(SAVE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.requirements) setRequirements(parsed.requirements);
        if (parsed.apiSpecs) setApiSpecs(parsed.apiSpecs);
        if (parsed.flowNodes) setFlowNodes(parsed.flowNodes);
        if (parsed.flowEdges) setFlowEdges(parsed.flowEdges);
        if (parsed.erdNodes) setErdNodes(parsed.erdNodes);
        if (parsed.erdEdges) setErdEdges(parsed.erdEdges);
      } catch (e) { console.error(e); }
    }
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) { try { setHistoryList(JSON.parse(savedHistory)); } catch (e) { console.error(e); } }
    
    // 💡 스니펫 로컬 스토리지 불러오기
    const savedSnippets = localStorage.getItem(SNIPPET_KEY);
    if (savedSnippets) { try { setCustomSnippets(JSON.parse(savedSnippets)); } catch(e){} }
    
    const savedTodos = localStorage.getItem(TODO_KEY);
    if (savedTodos) { try { setTodos(JSON.parse(savedTodos)); } catch (e) {} }
    
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') setIsDark(true);

    setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [setFlowNodes, setFlowEdges, setErdNodes, setErdEdges]);

  useEffect(() => { localStorage.setItem(SAVE_KEY, getSnapshot()); }, [getSnapshot]);
  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList)); }, [historyList]);
  useEffect(() => { localStorage.setItem(TODO_KEY, JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light'); }, [isDark]);
  // 💡 스니펫 로컬 스토리지 저장 (변경될 때마다)
  useEffect(() => { localStorage.setItem(SNIPPET_KEY, JSON.stringify(customSnippets)); }, [customSnippets]);

  useEffect(() => {
    if (activeTab === 'erd') {
      setErdNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isHighlighted: canvasSearch && n.data.name?.toLowerCase().includes(canvasSearch.toLowerCase()) } })));
    } else if (activeTab === 'flow') {
      setFlowNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, isHighlighted: canvasSearch && n.data.label?.toLowerCase().includes(canvasSearch.toLowerCase()) } })));
    }
  }, [canvasSearch, activeTab, setErdNodes, setFlowNodes]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setIsCommandPaletteOpen(true); setTimeout(() => document.getElementById('global-search-input')?.focus(), 100); return; }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveSnapshot('단축키(Ctrl+S) 저장'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); const searchInput = document.getElementById('search-input'); if (searchInput) searchInput.focus(); }
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('requirements'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('erd'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('flow'); }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveTab('api'); }
      if (e.key === 'Escape') {
        setOpenMenu(null); setIsHistoryModalOpen(false); setIsSqlImportModalOpen(false); setShowSqlModal(false);
        setIsLinterModalOpen(false); setIsCodeHubOpen(false); setIsHelpOpen(false);
        setIsCommandPaletteOpen(false); setIsMockViewerOpen(false);
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, saveSnapshot, setActiveTab]);

  useEffect(() => {
    const closeMenu = () => { setOpenMenu(null); setContextMenu(null); };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const onNodesDelete = useCallback(() => { recordHistory(); }, [recordHistory]);
  const onEdgesDelete = useCallback(() => { recordHistory(); }, [recordHistory]);

  const handleScaffoldApiFromErd = () => {
    if (erdNodes.filter(n => n.type === 'tableNode').length === 0) return toast.error('먼저 ERD 탭에서 테이블을 하나 이상 생성해주세요.');
    recordHistory();
    const newApis = [];
    const basePath = codeSettings.apiPrefix.endsWith('/') ? codeSettings.apiPrefix.slice(0, -1) : codeSettings.apiPrefix;

    erdNodes.forEach(node => {
      if (node.type === 'tableNode') {
        const resource = node.data.name.toLowerCase();
        newApis.push({ id: uuidv4(), method: 'GET', endpoint: `${basePath}/${resource}`, desc: `${node.data.name} 전체 목록 조회` });
        newApis.push({ id: uuidv4(), method: 'GET', endpoint: `${basePath}/${resource}/{id}`, desc: `단일 ${node.data.name} 상세 조회` });
        newApis.push({ id: uuidv4(), method: 'POST', endpoint: `${basePath}/${resource}`, desc: `새로운 ${node.data.name} 생성` });
        newApis.push({ id: uuidv4(), method: 'PUT', endpoint: `${basePath}/${resource}/{id}`, desc: `기존 ${node.data.name} 수정` });
        newApis.push({ id: uuidv4(), method: 'DELETE', endpoint: `${basePath}/${resource}/{id}`, desc: `특정 ${node.data.name} 삭제` });
      }
    });

    setApiSpecs(prev => [...prev, ...newApis]);
    toast.success('ERD 테이블 기반 API 명세가 자동 생성되었습니다!', { icon: '✨' });
    setActiveTab('api');
  };

  const handleViewMock = (api) => {
    const relatedTable = erdNodes.find(n => n.type === 'tableNode' && api.endpoint.toUpperCase().includes(n.data.name.toUpperCase()));
    let mockItemStr = `{\n      "id": 1,\n      "name": "Sample Data"\n    }`;
    if (relatedTable) {
      const fields = relatedTable.data.columns.map(c => {
        if (c.type.includes('INT')) return `      "${c.name}": ${Math.floor(Math.random() * 100)}`;
        if (c.type.includes('BOOLEAN')) return `      "${c.name}": true`;
        if (c.type.includes('DATETIME')) return `      "${c.name}": "2026-05-15T12:00:00Z"`;
        return `      "${c.name}": "sample_${c.name}"`;
      });
      mockItemStr = `{\n${fields.join(',\n')}\n    }`;
    }
    let jsonCode = "";
    if (api.method === 'GET' && api.endpoint.includes('{')) { jsonCode = `{\n  "status": 200,\n  "message": "Success",\n  "data": ${mockItemStr}\n}`; } 
    else if (api.method === 'GET') { jsonCode = `{\n  "status": 200,\n  "message": "Success",\n  "data": {\n    "items": [\n      ${mockItemStr},\n      ${mockItemStr.replace(/1/g, '2')}\n    ],\n    "totalElements": 2\n  }\n}`; } 
    else if (api.method === 'POST') { jsonCode = `{\n  "status": 201,\n  "message": "Created successfully",\n  "data": ${mockItemStr}\n}`; } 
    else { jsonCode = `{\n  "status": 200,\n  "message": "Operation successful"\n}`; }
    setMockViewerData({ endpoint: api.endpoint, method: api.method, desc: api.desc, json: jsonCode });
    setIsMockViewerOpen(true);
  };

  // 💡 커스텀 스니펫으로 저장하기 함수 추가
  const handleSaveAsSnippet = (nodeId) => {
    const target = erdNodes.find(n => n.id === nodeId);
    if (!target) return;
    
    const snippetName = window.prompt("등록할 스니펫의 이름을 입력하세요:", target.data.name);
    if (!snippetName) return;

    const newSnippet = {
      id: uuidv4(),
      name: snippetName,
      data: {
        ...target.data,
        columns: target.data.columns.map(c => ({...c, id: uuidv4()})) // 컬럼 ID 새로 부여해 저장
      }
    };
    
    setCustomSnippets(prev => [...prev, newSnippet]);
    toast.success(`'${snippetName}' 스니펫이 등록되었습니다!`, { icon: '🔖' });
  };

  // 💡 커스텀 스니펫 꺼내쓰기 함수 추가
  const handleAddCustomSnippet = (snippet) => {
    recordHistory();
    const startX = 100 + (erdNodes.length * 20);
    const startY = 100 + (erdNodes.length * 20);

    const newTable = {
      id: uuidv4(),
      type: 'tableNode',
      position: { x: startX, y: startY },
      dragHandle: '.custom-drag-handle',
      data: {
        ...snippet.data,
        name: snippet.name,
        columns: snippet.data.columns.map(c => ({...c, id: uuidv4()})), // 추가할때 ID 재부여
        isDark // 현재 테마 반영
      }
    };
    
    setErdNodes(nds => [...nds, newTable]);
    toast.success(`'${snippet.name}' 구조가 추가되었습니다!`);
  };

  // 💡 커스텀 스니펫 삭제 함수 추가
  const handleDeleteSnippet = (e, id) => {
    e.stopPropagation();
    if(window.confirm('이 스니펫을 삭제하시겠습니까?')) {
      setCustomSnippets(prev => prev.filter(s => s.id !== id));
      toast.error('스니펫이 삭제되었습니다.');
    }
  };

  const handleQuickAddTemplate = (type) => {
    recordHistory();
    const startX = 100 + (erdNodes.length * 20);
    const startY = 100 + (erdNodes.length * 20);
    if (type === 'user') {
      setErdNodes(nds => [...nds, { id: uuidv4(), type: 'tableNode', position: { x: startX, y: startY }, dragHandle: '.custom-drag-handle', data: { name: 'USERS', isDark, isCollapsed: false, columns: [{ id: uuidv4(), name: 'id', type: 'BIGINT', isPk: true, isFk: false }, { id: uuidv4(), name: 'email', type: 'VARCHAR', isPk: false, isFk: false }, { id: uuidv4(), name: 'password', type: 'VARCHAR', isPk: false, isFk: false }, { id: uuidv4(), name: 'created_at', type: 'DATETIME', isPk: false, isFk: false }] } }]);
      toast.success('회원(User) 테이블이 추가되었습니다.');
    } else if (type === 'board') {
      setErdNodes(nds => [...nds, { id: uuidv4(), type: 'tableNode', position: { x: startX, y: startY }, dragHandle: '.custom-drag-handle', data: { name: 'POSTS', isDark, isCollapsed: false, columns: [{ id: uuidv4(), name: 'id', type: 'BIGINT', isPk: true, isFk: false }, { id: uuidv4(), name: 'user_id', type: 'BIGINT', isPk: false, isFk: true }, { id: uuidv4(), name: 'title', type: 'VARCHAR', isPk: false, isFk: false }, { id: uuidv4(), name: 'content', type: 'TEXT', isPk: false, isFk: false }, { id: uuidv4(), name: 'view_count', type: 'INT', isPk: false, isFk: false }] } }]);
      toast.success('게시판(Board) 테이블이 추가되었습니다.');
    }
  };

  const addTodo = (e) => { e.preventDefault(); if (!newTodo.trim()) return; setTodos([{ id: uuidv4(), text: newTodo, done: false }, ...todos]); setNewTodo(''); };
  const toggleTodo = (id) => setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTodo = (id) => { if(window.confirm('할 일을 삭제하시겠습니까?')) setTodos(todos.filter(t => t.id !== id)); };

  const handleRunLinter = () => {
    const issues = [];
    erdNodes.forEach(n => {
      if (n.type !== 'tableNode') return;
      if (!n.data.name) issues.push({ type: 'error', tab: 'ERD', msg: `이름이 지정되지 않은 테이블이 있습니다.` });
      if (n.data.columns.length === 0) issues.push({ type: 'warning', tab: 'ERD', msg: `'${n.data.name}' 테이블에 컬럼이 없습니다.` });
      else if (!n.data.columns.some(c => c.isPk)) issues.push({ type: 'error', tab: 'ERD', msg: `'${n.data.name}' 테이블에 기본키(Primary Key)가 지정되지 않았습니다.` });
    });
    apiSpecs.forEach(a => {
      if (!a.endpoint) issues.push({ type: 'error', tab: 'API 명세', msg: `엔드포인트 주소가 비어있는 항목이 있습니다.` });
      else if (!a.endpoint.startsWith('/')) issues.push({ type: 'error', tab: 'API 명세', msg: `엔드포인트 '${a.endpoint}'는 '/' 기호로 시작해야 합니다.` });
      if (!a.desc) issues.push({ type: 'warning', tab: 'API 명세', msg: `'${a.endpoint}'의 상세 설명이 작성되지 않았습니다.` });
    });
    flowNodes.forEach(n => {
      if (n.type !== 'systemNode') return;
      const isConnected = flowEdges.some(e => e.source === n.id || e.target === n.id);
      if (!isConnected) issues.push({ type: 'warning', tab: '시스템 구조', msg: `'${n.data.label}' 컴포넌트가 다른 요소와 연결되지 않고 고립되어 있습니다.` });
    });

    setLinterIssues(issues); setIsLinterModalOpen(true);
    if (issues.length === 0) toast.success("모든 설계가 완벽합니다!", { icon: '✅' });
  };

  const handleOpenCodeHub = () => { generateCodesForStack('backend'); setIsCodeHubOpen(true); };

  const generateCodesForStack = (stack) => {
    setCodeStack(stack);
    const files = [];
    const pkg = codeSettings.packageName;
    const basePath = codeSettings.apiPrefix.endsWith('/') ? codeSettings.apiPrefix.slice(0, -1) : codeSettings.apiPrefix;

    if (stack === 'settings') return; 
    
    if (stack === 'backend') {
      erdNodes.filter(n => n.type === 'tableNode').forEach(n => {
        const className = n.data.name.charAt(0).toUpperCase() + n.data.name.slice(1).toLowerCase();
        let code = `package ${pkg}.domain;\n\n`;
        
        if (codeSettings.springVersion === '3.x') {
          code += `import jakarta.persistence.*;\n`;
        } else {
          code += `import javax.persistence.*;\n`;
        }

        if (codeSettings.useLombok) code += `import lombok.*;\n`;
        if (codeSettings.useSwagger) code += `import io.swagger.v3.oas.annotations.media.Schema;\n`;
        
        if (codeSettings.javaVersion === '21' && !codeSettings.useLombok) {
          code += `\n// 💡 Java 21+ Record could be used for DTOs\n`;
        }

        code += `\n@Entity\n@Table(name="${n.data.name}")\n`;
        if (codeSettings.useLombok) code += `@Getter\n@Setter\n@NoArgsConstructor\n`;
        code += `public class ${className} {\n\n`;
        n.data.columns.forEach(c => {
          if (codeSettings.useSwagger) code += `    @Schema(description = "${c.name} 필드")\n`;
          if(c.isPk) code += `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n`;
          let javaType = 'String'; if(c.type.includes('INT')) javaType = c.type === 'BIGINT' ? 'Long' : 'Integer'; if(c.type.includes('BOOLEAN')) javaType = 'Boolean'; if(c.type.includes('DATETIME')) javaType = 'java.time.LocalDateTime';
          code += `    private ${javaType} ${c.name.toLowerCase()};\n\n`;
        });
        code += `}\n`;
        files.push({ filename: `backend/src/main/java/${pkg.replace(/\./g, '/')}/domain/${className}.java`, code, lang: 'java' });
      });

      const apiGroups = {};
      apiSpecs.forEach(api => {
        if(!api.endpoint) return; let cleanEndpoint = api.endpoint;
        if(basePath && cleanEndpoint.startsWith(basePath)) cleanEndpoint = cleanEndpoint.replace(basePath, '');
        const parts = cleanEndpoint.split('/').filter(p => p && !p.includes('{'));
        const root = parts.length > 0 ? parts[0] : 'common';
        if(!apiGroups[root]) apiGroups[root] = []; apiGroups[root].push({ ...api, cleanEndpoint });
      });

      Object.keys(apiGroups).forEach(root => {
        const className = root.charAt(0).toUpperCase() + root.slice(1) + 'Controller';
        let code = `package ${pkg}.controller;\n\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.http.ResponseEntity;\n`;
        if (codeSettings.useSwagger) code += `import io.swagger.v3.oas.annotations.Operation;\nimport io.swagger.v3.oas.annotations.tags.Tag;\n`;
        code += `\n@RestController\n`;
        if (codeSettings.useSwagger) code += `@Tag(name = "${root} API", description = "${root} 관련 API")\n`;
        code += `@RequestMapping("${basePath}/${root}")\npublic class ${className} {\n\n`;
        apiGroups[root].forEach((api, idx) => {
          const methodAnnotation = `@${api.method.charAt(0).toUpperCase() + api.method.slice(1).toLowerCase()}Mapping`;
          let path = api.cleanEndpoint.replace(`/${root}`, ''); if(!path.startsWith('/')) path = '/' + path; if(path === '/') path = '""'; else path = `"${path}"`;
          const methodName = `${api.method.toLowerCase()}${root.charAt(0).toUpperCase() + root.slice(1)}${idx}`;
          if (codeSettings.useSwagger) code += `    @Operation(summary = "${api.desc || 'API 설명'}")\n`; else code += `    // ${api.desc}\n`;
          code += `    ${methodAnnotation}(${path})\n    public ResponseEntity<?> ${methodName}() {\n        return ResponseEntity.ok().build();\n    }\n\n`;
        });
        code += `}\n`;
        files.push({ filename: `backend/src/main/java/${pkg.replace(/\./g, '/')}/controller/${className}.java`, code, lang: 'java' });
      });
      if(files.length === 0) files.push({ filename: `backend/README.md`, code: `생성할 백엔드 명세가 없습니다. ERD나 API를 설계해주세요.`, lang: 'markdown' });

    } else if (stack === 'frontend') {
      let jsCode = `// 💡 Environment: ${codeSettings.frontendFramework}\n// 💡 UI Framework: ${codeSettings.uiLibrary}\n\nimport axios from 'axios';\n\n// 💡 자동 생성된 Axios 클라이언트 (기본 경로: ${basePath})\nconst apiClient = axios.create({\n  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080${basePath}',\n  timeout: 5000,\n  headers: { 'Content-Type': 'application/json' }\n});\n\n`;
      apiSpecs.forEach(api => {
        if(!api.endpoint) return; let rawPath = api.endpoint;
        if(basePath && rawPath.startsWith(basePath)) rawPath = rawPath.replace(basePath, ''); if(!rawPath.startsWith('/')) rawPath = '/' + rawPath;
        const funcName = `${api.method.toLowerCase()}${rawPath.split('/').map(p => p.replace(/[{}]/g, '').charAt(0).toUpperCase() + p.replace(/[{}]/g, '').slice(1)).join('')}`;
        const templatePath = rawPath.replace(/{([^}]+)}/g, '$${$1}'); const hasParams = rawPath.includes('{');
        jsCode += `/**\n * ${api.desc}\n * @method ${api.method}\n * @route ${basePath}${rawPath}\n */\n`;
        if (api.method === 'GET' || api.method === 'DELETE') { jsCode += `export const ${funcName} = async (${hasParams ? 'params, ' : ''}query) => {\n  const response = await apiClient.${api.method.toLowerCase()}(\`${templatePath}\`, { params: query });\n`; } 
        else { jsCode += `export const ${funcName} = async (${hasParams ? 'params, ' : ''}data) => {\n  const response = await apiClient.${api.method.toLowerCase()}(\`${templatePath}\`, data);\n`; }
        jsCode += `  return response.data;\n};\n\n`;
      });
      if(apiSpecs.length > 0) files.push({ filename: `frontend/src/api/client.js`, code: jsCode, lang: 'javascript' });
      
      apiSpecs.filter(a => a.method === 'GET').forEach(api => {
        if(!api.endpoint) return; const filenameName = api.endpoint.split('/').filter(p => p && !p.includes('{')).join('_');
        const relatedTable = erdNodes.find(n => n.type === 'tableNode' && api.endpoint.toUpperCase().includes(n.data.name.toUpperCase()));
        let mockItemStr = `{ "id": 1, "name": "Sample Data 1" }`;
        if (relatedTable) {
          const fields = relatedTable.data.columns.map(c => {
            if (c.type.includes('INT')) return `"${c.name}": ${Math.floor(Math.random() * 100)}`;
            if (c.type.includes('BOOLEAN')) return `"${c.name}": true`;
            if (c.type.includes('DATETIME')) return `"${c.name}": "2026-05-15T12:00:00Z"`;
            return `"${c.name}": "sample_${c.name}"`;
          });
          mockItemStr = `{ ${fields.join(', ')} }`;
        }
        let jsonCode = `{\n  "status": 200,\n  "message": "Success",\n  "data": {\n    // 💡 '${api.desc}'에 대한 ${relatedTable ? '지능형' : '기본'} Mock 데이터\n    "items": [\n      ${mockItemStr},\n      ${mockItemStr.replace(/1/g, '2')}\n    ],\n    "totalElements": 2\n  }\n}`;
        files.push({ filename: `frontend/mock/${filenameName || 'data'}.json`, code: jsonCode, lang: 'json' });
      });
      if(files.length === 0) files.push({ filename: `frontend/README.md`, code: `생성할 프론트엔드 명세가 없습니다. API를 설계해주세요.`, lang: 'markdown' });
      
    } else if (stack === 'structure') {
      let treeCode = `my-awesome-project/\n`; const servers = flowNodes.filter(n => n.data.type === 'server').length > 0; const clients = flowNodes.filter(n => n.data.type === 'client').length > 0;
      if(clients) { 
        const isNext = codeSettings.frontendFramework.includes('Next');
        treeCode += `├── frontend/ (${codeSettings.frontendFramework})\n│   ├── package.json\n│   ├── public/\n│   └── src/\n│       ├── api/          # 자동 생성된 Axios 클라이언트\n│       ├── components/\n│       └── ${isNext ? 'app/' : 'pages/'}\n`; 
      }
      if(servers) { treeCode += `├── backend/ (Spring Boot ${codeSettings.springVersion})\n│   ├── build.gradle\n│   └── src/\n│       └── main/\n│           ├── java/\n│           │   └── ${pkg.replace(/\./g, '/')}/\n│           │       ├── controller/  # 자동 생성된 API 뼈대\n│           │       ├── domain/      # 자동 생성된 JPA 엔티티\n│           │       ├── repository/\n│           │       └── service/\n│           └── resources/\n│               └── application.yml\n`; }
      treeCode += `├── database/             # 자동 생성된 SQL DDL\n├── docker-compose.yml    # 인프라 환경 파일 (${codeSettings.dbType} 세팅됨)\n└── README.md             # 프로젝트 명세서\n`;
      files.push({ filename: `PROJECT_STRUCTURE.txt`, code: treeCode, lang: 'text' });

    } else if (stack === 'infra') {
      let dockerCode = `version: '3.8'\n\nservices:\n`; const servers = flowNodes.filter(n => n.data.type === 'server'); const clients = flowNodes.filter(n => n.data.type === 'client'); const dbs = flowNodes.filter(n => n.data.type === 'db');
      let dbUrl = "jdbc:mysql://db-1:3306/mydb"; if (codeSettings.dbType === 'postgresql') dbUrl = "jdbc:postgresql://db-1:5432/mydb"; else if (codeSettings.dbType === 'mariadb') dbUrl = "jdbc:mariadb://db-1:3306/mydb";
      clients.forEach((c, idx) => { dockerCode += `  frontend-${idx+1}:\n    build: ./frontend\n    ports:\n      - "3000:3000"\n    environment:\n      - NEXT_PUBLIC_API_URL=http://localhost:8080${basePath}\n\n`; });
      servers.forEach((s, idx) => { dockerCode += `  backend-${idx+1}:\n    build: ./backend\n    ports:\n      - "8080:8080"\n    environment:\n      - SPRING_DATASOURCE_URL=${dbUrl}\n`; if(dbs.length > 0) dockerCode += `    depends_on:\n      - db-1\n`; dockerCode += `\n`; });
      dbs.forEach((d, idx) => {
        if (codeSettings.dbType === 'postgresql') { dockerCode += `  db-${idx+1}:\n    image: postgres:13\n    ports:\n      - "5432:5432"\n    environment:\n      - POSTGRES_USER=root\n      - POSTGRES_PASSWORD=root\n      - POSTGRES_DB=mydb\n    volumes:\n      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql\n\n`; } 
        else if (codeSettings.dbType === 'mariadb') { dockerCode += `  db-${idx+1}:\n    image: mariadb:10\n    ports:\n      - "3306:3306"\n    environment:\n      - MARIADB_ROOT_PASSWORD=root\n      - MARIADB_DATABASE=mydb\n    volumes:\n      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql\n\n`; } 
        else { dockerCode += `  db-${idx+1}:\n    image: mysql:8.0\n    ports:\n      - "3306:3306"\n    environment:\n      - MYSQL_ROOT_PASSWORD=root\n      - MYSQL_DATABASE=mydb\n    volumes:\n      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql\n\n`; }
      });
      if(servers.length === 0 && clients.length === 0 && dbs.length === 0) { dockerCode = `# 시스템 구조도(Flow)에 서버나 DB, 클라이언트를 추가하면\n# 해당 환경 및 DB(${codeSettings.dbType})에 맞는 Docker Compose가 자동 생성됩니다.`; }
      files.push({ filename: `docker-compose.yml`, code: dockerCode, lang: 'yaml' });

    } else if (stack === 'sql') {
      let sql = `-- ERD Generated SQL (${codeSettings.dbType})\n-- Date: ${new Date().toLocaleString()}\n\n`;
      erdNodes.filter(n=>n.type==='tableNode').forEach(node => { sql += `CREATE TABLE ${node.data.name} (\n`; const cols = node.data.columns.map((c) => { let line = `  ${c.name} ${c.type}`; if (c.isPk) line += ` PRIMARY KEY`; return line; }); sql += cols.join(',\n'); sql += `\n);\n\n`; });
      files.push({ filename: `database/schema.sql`, code: sql, lang: 'sql' });

    } else if (stack === 'readme') {
      let readme = `# 🚀 Project Overview\n\n이 문서는 기획/설계 센터에서 자동 생성되었습니다.\n\n## 📌 요구사항 명세 (Requirements)\n`;
      requirements.forEach((r, i) => { readme += `### ${i+1}. ${r.name}\n- **구분:** ${r.category}\n- **우선순위:** ${r.priority} | **상태:** ${r.status}\n- **상세 명세:** ${r.desc}\n- **비고:** ${r.note}\n\n`; });
      readme += `\n## 🌐 API 명세 (API Specifications)\n| Method | Endpoint | Description |\n|---|---|---|\n`;
      apiSpecs.forEach(a => { readme += `| \`${a.method}\` | ${a.endpoint} | ${a.desc} |\n`; });
      readme += `\n## 🗄️ 데이터베이스 스키마 (ERD)\n`;
      erdNodes.filter(n=>n.type==='tableNode').forEach(t => { readme += `### 테이블: \`${t.data.name}\`\n| 컬럼명 | 타입 | PK/FK |\n|---|---|---|\n`; t.data.columns.forEach(c => { readme += `| ${c.name} | ${c.type} | ${c.isPk?'PK':(c.isFk?'FK':'')} |\n`; }); readme += `\n`; });
      files.push({ filename: `README.md`, code: readme, lang: 'markdown' });
    }
    setCodeHubFiles(files); setSelectedCodeIndex(0);
  };

  const copyCodeHubContent = () => { navigator.clipboard.writeText(codeHubFiles[selectedCodeIndex]?.code); toast.success(`${codeHubFiles[selectedCodeIndex]?.filename} 복사 완료!`); };

  const handleImportSQL = () => {
    if(!sqlImportText.trim()) return toast.error("SQL 문을 입력해주세요."); recordHistory();
    try {
      const tableRegex = /CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi; let match; const newNodes = []; let x = 100, y = 100, count = 0;
      while ((match = tableRegex.exec(sqlImportText)) !== null) {
        const tableName = match[1]; const colsStr = match[2]; const colLines = colsStr.split(',').map(l => l.trim()).filter(l => l); const columns = [];
        colLines.forEach(line => {
           const parts = line.split(/\s+/);
           if (parts.length >= 2 && !line.toUpperCase().includes('PRIMARY KEY (') && !line.toUpperCase().includes('FOREIGN KEY')) { const isPk = line.toUpperCase().includes('PRIMARY KEY'); columns.push({ id: uuidv4(), name: parts[0], type: parts[1].replace(/\([0-9]+\)/, ''), isPk, isFk: false }); }
        });
        newNodes.push({ id: uuidv4(), type: 'tableNode', position: { x, y }, dragHandle: '.custom-drag-handle', data: { name: tableName, columns, isCollapsed: false, isLocked: false, isDark } });
        x += 320; if(x > 1000) { x = 100; y += 280; } count++;
      }
      if(count === 0) throw new Error("분석 가능한 문장이 없습니다.");
      setErdNodes(prev => [...prev, ...newNodes]); setIsSqlImportModalOpen(false); setSqlImportText(''); toast.success(`${count}개의 테이블 생성 완료!`, { icon: '🧙‍♂️' });
    } catch (e) { toast.error("SQL 파싱 실패: " + e.message); }
  };

  const handleExportSql = () => {
    let sql = `-- ERD Generated SQL (${codeSettings.dbType})\n-- Date: ${new Date().toLocaleString()}\n\n`;
    erdNodes.filter(n=>n.type==='tableNode').forEach(node => { sql += `CREATE TABLE ${node.data.name} (\n`; const cols = node.data.columns.map((c) => { let line = `  ${c.name} ${c.type}`; if (c.isPk) line += ` PRIMARY KEY`; return line; }); sql += cols.join(',\n'); sql += `\n);\n\n`; });
    const blob = new Blob([sql], { type: "text/sql;charset=utf-8" }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement("a"); a.href = url; a.download = `schema-${Date.now()}.sql`; a.click(); URL.revokeObjectURL(url);
    toast.success("SQL 쿼리문 다운로드 완료", { icon: '🗄️' });
  };

  const handleExportApiJson = () => {
    const paths = {};
    apiSpecs.forEach(api => {
       if(!api.endpoint) return; const ep = api.endpoint.startsWith('/') ? api.endpoint : `/${api.endpoint}`;
       if(!paths[ep]) paths[ep] = {}; paths[ep][api.method.toLowerCase()] = { summary: api.desc || "No description", responses: { '200': { description: 'Successful response' } } };
    });
    const swagger = { openapi: '3.0.0', info: { title: 'Auto-generated API', version: '1.0.0' }, paths };
    const blob = new Blob([JSON.stringify(swagger, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `api-standard-spec-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success("API 표준 문서 다운로드 완료", { icon: '🚀' });
  };

  const handleExportDiagramText = (type) => {
    let md = '';
    if (type === 'erd') { md += 'erDiagram\n'; erdNodes.filter(n=>n.type==='tableNode').forEach(n => { md += `  ${n.data.name} {\n`; n.data.columns.forEach(c => { md += `    ${c.type} ${c.name} ${c.isPk?'PK':''}\n`; }); md += `  }\n`; }); erdEdges.forEach(e => { const src = erdNodes.find(n => n.id === e.source)?.data?.name; const tgt = erdNodes.find(n => n.id === e.target)?.data?.name; if(src && tgt) md += `  ${src} ||--o{ ${tgt} : "${e.label||'relates'}"\n`; }); } 
    else { md += 'graph TD\n'; flowNodes.filter(n=>n.type==='systemNode').forEach(n => { md += `  ${n.id}[${n.data.label}]\n`; }); flowEdges.forEach(e => { md += `  ${e.source} -->|${e.label||''}| ${e.target}\n`; }); }
    const blob = new Blob([md], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `diagram-code-${type}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
    toast.success("다이어그램 텍스트 코드 변환 완료", { icon: '📝' });
  };

  const handleExportPostman = () => {
    if (apiSpecs.length === 0) return toast.error("작성된 API 명세가 없습니다.");
    const items = apiSpecs.filter(a => a.endpoint).map(api => ({
      name: api.desc || api.endpoint,
      request: {
        method: api.method,
        header: [],
        url: { raw: `{{baseUrl}}${api.endpoint}`, host: ["{{baseUrl}}"], path: api.endpoint.split('/').filter(Boolean) },
        description: api.desc
      },
      response: []
    }));
    const collection = {
      info: { name: "Devw Architecture Pro API Collection", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
      item: items,
      variable: [{ key: "baseUrl", value: "http://localhost:8080/api/v1", type: "string" }]
    };
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `postman_collection_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success("Postman Collection 다운로드 완료!", { icon: '📮' });
  };

  const handleExportDataDictionary = () => {
    const tables = erdNodes.filter(n => n.type === 'tableNode');
    if (tables.length === 0) return toast.error("생성된 테이블이 없습니다.");
    let md = "# 📘 데이터 사전 (Data Dictionary)\n\n";
    tables.forEach(t => {
      md += `## 테이블: \`${t.data.name}\`\n`;
      md += `| 컬럼명 | 데이터 타입 | PK | FK | 설명 |\n|---|---|:---:|:---:|---|\n`;
      t.data.columns.forEach(c => { md += `| **${c.name}** | \`${c.type}\` | ${c.isPk ? '✅' : ''} | ${c.isFk ? '✅' : ''} | - |\n`; });
      md += "\n";
    });
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `data_dictionary_${Date.now()}.md`; a.click(); URL.revokeObjectURL(url);
    toast.success("데이터 사전 마크다운 다운로드 완료!", { icon: '📘' });
  };

  const handleExportMarkdown = (type) => { let mdContent = ""; if (type === 'req') { mdContent = "# 요구사항 칸반 보드\n\n| 구분 | 기능명 | 우선순위 | 상태 | 세부 명세 | 비고 |\n|---|---|---|---|---|---|\n"; requirements.forEach(req => { mdContent += `| ${req.category} | **${req.name}** | ${req.priority} | ${req.status} | ${req.desc} | ${req.note} |\n`; }); } else { mdContent = "# API 명세서\n\n| Method | Endpoint URL | Description |\n|---|---|---|\n"; apiSpecs.forEach(api => { mdContent += `| \`${api.method}\` | **${api.endpoint}** | ${api.desc} |\n`; }); } const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${type}-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url); toast.success("마크다운 파일로 추출 완료"); };

  const handleExportCSV = (type) => {
    let csvContent = "\uFEFF"; 
    if (type === 'req') {
      csvContent += "구분,기능명,우선순위,상태,세부명세,비고\n";
      requirements.forEach(r => { csvContent += `"${r.category}","${r.name}","${r.priority}","${r.status}","${r.desc.replace(/\n/g, ' ')}","${r.note}"\n`; });
    } else {
      csvContent += "Method,Endpoint URL,Description\n";
      apiSpecs.forEach(a => { csvContent += `"${a.method}","${a.endpoint}","${a.desc.replace(/\n/g, ' ')}"\n`; });
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${type}_export_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("엑셀 파일(CSV) 추출 완료", { icon: '📊' });
  };

  const handleExportProject = () => { const blob = new Blob([JSON.stringify({ requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `architecture-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url); toast.success("전체 백업 파일 저장 완료"); };
  const handleImportProject = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const parsed = JSON.parse(event.target.result); if (parsed.requirements) setRequirements(parsed.requirements); if (parsed.apiSpecs) setApiSpecs(parsed.apiSpecs); if (parsed.erdNodes) setErdNodes(parsed.erdNodes); if (parsed.erdEdges) setErdEdges(parsed.erdEdges); if (parsed.flowNodes) setFlowNodes(parsed.flowNodes); if (parsed.flowEdges) setFlowEdges(parsed.flowEdges); toast.success("프로젝트를 성공적으로 불러왔습니다."); } catch (err) { toast.error("잘못된 형식의 파일입니다."); } }; reader.readAsText(file); e.target.value = ''; };

  const copyImageToClipboard = (className) => { const el = document.querySelector(className); if (!el) return; toast.loading('클립보드에 복사 중...', { id: 'clip' }); toBlob(el, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }).then((blob) => { navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => { toast.success('이미지가 복사되었습니다! (채팅창 등에 Ctrl+V 하세요)', { id: 'clip' }); }); }).catch(() => toast.error('복사 실패', { id: 'clip' })); };
  const getMethodColor = (method) => {
    switch(method) {
      case 'GET': return isDark ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'POST': return isDark ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'PUT': return isDark ? 'bg-amber-900/40 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-600 border-amber-200';
      case 'DELETE': return isDark ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-200';
      default: return isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const handlePasteRequirements = (e) => {
    const pasteData = e.clipboardData.getData('text/plain'); if (!pasteData) return;
    const rows = pasteData.split('\n').filter(r => r.trim() !== '');
    if (rows.length > 0 && rows[0].includes('\t')) {
      e.preventDefault(); recordHistory();
      const newItems = rows.map(row => { const cols = row.split('\t'); return { id: uuidv4(), category: cols[0]||'', name: cols[1]||'', priority: cols[2]||'Mid', status: cols[3]||'Todo', desc: cols[4]||'', note: cols[5]||'' }; });
      setRequirements(prev => [...prev, ...newItems]); toast.success(`${newItems.length}개의 데이터를 붙여넣었습니다!`, { icon: '📋' });
    }
  };

  const handlePasteApi = (e) => {
    const pasteData = e.clipboardData.getData('text/plain'); if (!pasteData) return;
    const rows = pasteData.split('\n').filter(r => r.trim() !== '');
    if (rows.length > 0 && rows[0].includes('\t')) {
      e.preventDefault(); recordHistory();
      const newItems = rows.map(row => { const cols = row.split('\t'); let method = cols[0]?.toUpperCase() || 'GET'; if(!['GET','POST','PUT','DELETE'].includes(method)) method = 'GET'; return { id: uuidv4(), method, endpoint: cols[1]||'', desc: cols[2]||'' }; });
      setApiSpecs(prev => [...prev, ...newItems]); toast.success(`${newItems.length}개의 데이터를 붙여넣었습니다!`, { icon: '📋' });
    }
  };

  const updateReq = (id, field, value) => { recordHistory(); setRequirements(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); };
  const updateApi = (id, field, value) => { recordHistory(); setApiSpecs(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a)); };

  const handleAddReq = () => { 
    recordHistory(); 
    const newItem = { id: uuidv4(), category: '기본', name: '새로운 요구사항', priority: 'Mid', status: 'Todo', desc: '', note: '' };
    if (insertTarget?.type === 'req') { 
      const idx = requirements.findIndex(r => r.id === insertTarget.id); 
      const arr = [...requirements]; arr.splice(idx + 1, 0, newItem); 
      setRequirements(arr); 
    } else { 
      setRequirements([...requirements, newItem]); 
    } 
    setInsertTarget(null); 
    toast.success('새 항목이 리스트 하단에 추가되었습니다.'); 
    setTimeout(() => reqListEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); 
  };
  const handleDeleteReq = (id) => { if(window.confirm('이 항목을 삭제하시겠습니까?')) { recordHistory(); setRequirements(prev => prev.filter(r => r.id !== id)); toast.error('삭제됨'); }};
  
  const handleAddApi = () => { 
    recordHistory(); 
    const newItem = { id: uuidv4(), method: 'GET', endpoint: '/api/v1/new-endpoint', desc: '새로운 API 설명' };
    if (insertTarget?.type === 'api') { 
      const idx = apiSpecs.findIndex(a => a.id === insertTarget.id); 
      const arr = [...apiSpecs]; arr.splice(idx + 1, 0, newItem); 
      setApiSpecs(arr); 
    } else { 
      setApiSpecs([...apiSpecs, newItem]); 
    } 
    setInsertTarget(null); 
    toast.success('새 API가 리스트 하단에 추가되었습니다.'); 
    setTimeout(() => apiListEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); 
  };
  const handleDeleteApi = (id) => { if(window.confirm('이 API를 삭제하시겠습니까?')) { recordHistory(); setApiSpecs(prev => prev.filter(a => a.id !== id)); toast.error('삭제됨'); }};

  const onFlowConnect = useCallback((params) => { recordHistory(); const label = window.prompt("연결 선의 설명(라벨)을 입력하세요.", "요청"); setFlowEdges((eds) => addEdge({ ...params, label, animated: true, type: edgeStyle, style: { stroke: isDark ? '#818cf8' : '#6366f1', strokeWidth: 2 }, labelStyle: { fill: isDark ? '#fff' : '#1e293b', fontWeight: 700, fontSize: 12 } }, eds)); }, [setFlowEdges, edgeStyle, isDark, recordHistory]);
  const onErdConnect = useCallback((params) => { recordHistory(); setErdEdges((eds) => addEdge({ ...params, type: edgeStyle, animated: true, style: { stroke: isDark ? '#94a3b8' : '#94a3b8', strokeWidth: 2 } }, eds)); }, [setErdEdges, edgeStyle, isDark, recordHistory]);
  const onEdgeDoubleClick = (e, edge, setEdgesFunc) => { e.stopPropagation(); const newLabel = window.prompt('연결선의 새로운 설명을 입력하세요. (비워두면 삭제됩니다)', edge.label || ''); if (newLabel === null) return; recordHistory(); if (newLabel.trim() === '') { if(window.confirm('설명이 비어있습니다. 이 연결선을 삭제하시겠습니까?')) setEdgesFunc((eds) => eds.filter((ed) => ed.id !== edge.id)); } else { setEdgesFunc((eds) => eds.map((ed) => ed.id === edge.id ? { ...ed, label: newLabel } : ed)); } };
  
  const handleRightClick = (e, type, targetId = null) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type, targetId }); };

  const moveItem = (listType, id, direction) => { recordHistory(); const isReq = listType === 'req'; const list = isReq ? requirements : apiSpecs; const setList = isReq ? setRequirements : setApiSpecs; const idx = list.findIndex(item => item.id === id); if (idx < 0) return; const newList = [...list]; if (direction === 'up' && idx > 0) { [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]]; setList(newList); } else if (direction === 'down' && idx < list.length - 1) { [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]]; setList(newList); } setContextMenu(null); };

  const handleAddFlowNode = (type) => { recordHistory(); setFlowNodes(nds => [...nds, { id: uuidv4(), type: 'systemNode', position: { x: 100 + (nds.length*30)%300, y: 100 + (nds.length*30)%300 }, data: { label: '새 컴포넌트', type, techStack: '', isDark, isLocked: false } }]); };
  const handleAddStickyNode = (isErd = true) => { recordHistory(); const setNodesFunc = isErd ? setErdNodes : setFlowNodes; setNodesFunc(nds => [...nds, { id: uuidv4(), type: 'stickyNode', position: { x: 100 + (nds.length*30)%300, y: 100 + (nds.length*30)%300 }, data: { text: '', isDark, isLocked: false, isCollapsed: false } }]); };
  const handleAutoLayoutFlow = () => { recordHistory(); setFlowNodes(nds => nds.map((node, i) => ({ ...node, position: { x: (i % 4) * 350 + 100, y: Math.floor(i / 4) * 250 + 100 } }))); toast.success('자동 정렬 완료'); };
  const duplicateFlowNode = (nodeId) => { recordHistory(); const target = flowNodes.find(n => n.id === nodeId); if (target) { setFlowNodes(nds => [...nds, { ...target, id: uuidv4(), position: { x: target.position.x + 30, y: target.position.y + 30 } }]); } };
  const handleAddTable = () => { recordHistory(); setErdNodes(nds => [...nds, { id: uuidv4(), type: 'tableNode', position: { x: 100, y: 100 }, dragHandle: '.custom-drag-handle', data: { name: 'NEW_TABLE', columns: [], isCollapsed: false, isLocked: false, isDark } }]); };
  const handleAutoLayoutERD = () => { recordHistory(); setErdNodes(nds => nds.map((node, i) => ({ ...node, position: { x: (i % 3) * 400 + 100, y: Math.floor(i / 3) * 350 + 100 } }))); toast.success('자동 정렬 완료'); };
  const duplicateTable = (nodeId) => { recordHistory(); const target = erdNodes.find(n => n.id === nodeId); if (target) { setErdNodes(nds => [...nds, { ...target, id: uuidv4(), position: { x: target.position.x + 30, y: target.position.y + 30 }, data: { ...target.data, name: `${target.data.name}_COPY`, columns: target.data?.columns?.map(c => ({...c, id: uuidv4()})) || [] } }]); } };

  const searchLower = globalSearchStr.toLowerCase();
  const searchReqs = requirements.filter(r => r.name.toLowerCase().includes(searchLower) || r.desc.toLowerCase().includes(searchLower));
  const searchApis = apiSpecs.filter(a => a.endpoint.toLowerCase().includes(searchLower) || a.desc.toLowerCase().includes(searchLower));
  const searchErds = erdNodes.filter(n => n.type === 'tableNode' && n.data.name?.toLowerCase().includes(searchLower));
  const searchFlows = flowNodes.filter(n => n.type === 'systemNode' && n.data.label?.toLowerCase().includes(searchLower));

  const filteredReqs = requirements.filter(r => r.name.includes(reqSearch) || r.desc.includes(reqSearch) || r.category.includes(reqSearch));
  const filteredApis = apiSpecs.filter(a => a.endpoint.includes(apiSearch) || a.desc.includes(apiSearch));

  const wrapperClass = isDark ? "bg-[#0f172a] text-slate-100" : "bg-[#f1f5f9] text-slate-900";
  const panelClass = isDark ? "bg-[#1e293b] border-slate-700 shadow-2xl" : "bg-white border-slate-200 shadow-xl";
  const tableHeadClass = isDark ? "bg-slate-800/80 border-slate-700 text-slate-300 backdrop-blur-md" : "bg-slate-50/80 border-slate-200 text-slate-600 backdrop-blur-md";
  const tableRowClass = isDark ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-indigo-50/30";
  const inputClass = isDark ? "focus:bg-slate-800 focus:ring-indigo-500 text-slate-200" : "focus:bg-white focus:ring-indigo-400 text-slate-800";

  const renderTabs = () => {
    return (
      <div className={`inline-flex p-1.5 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'} backdrop-blur-sm z-10 m-4`}>
        {[
          { id: 'requirements', label: '요구사항 정리', err: 0 }, 
          { id: 'erd', label: '데이터베이스 (ERD)', err: erdErrorCount }, 
          { id: 'flow', label: '시스템 구조 (Flow)', err: 0 }, 
          { id: 'api', label: 'API 명세서', err: apiErrorCount }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-6 py-2.5 text-[14px] font-bold rounded-lg transition-all outline-none whitespace-nowrap ${activeTab === tab.id ? (isDark ? 'text-white shadow-lg' : 'text-slate-800 shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
            {activeTab === tab.id && <motion.div layoutId="pillTab" className={`absolute inset-0 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={{ zIndex: -1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            <span className="relative">
              {tab.label}
              {tab.err > 0 && <span className="absolute -top-2 -right-4 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-800"></span></span>}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const ActionableEmptyState = ({ type, onAction, actionLabel, icon: IconComponent }) => (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div className={`p-8 rounded-full mb-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
        <IconComponent size={72} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} />
      </div>
      <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>아직 작성된 {type}가 없습니다.</h3>
      <p className={`text-[15px] font-medium mb-8 text-center max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        지금 바로 새로운 {type}를 추가하거나,<br/>엑셀에서 복사(Ctrl+C) 후 이곳에 붙여넣기(Ctrl+V) 해보세요!
      </p>
      <button onClick={onAction} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1 flex items-center gap-2">
        <VscAdd size={18}/> {actionLabel}
      </button>
    </div>
  );

  const clientCount = flowNodes.filter(n => n.data?.type === 'client').length;
  const serverCount = flowNodes.filter(n => n.data?.type === 'server').length;
  const dbCount = flowNodes.filter(n => n.data?.type === 'db').length;
  const cloudCount = flowNodes.filter(n => n.data?.type === 'cloud').length;
  const stickyCount = flowNodes.filter(n => n.type === 'stickyNode').length;
  const totalFlowNodes = flowNodes.filter(n => n.type === 'systemNode').length;

  return (
    <div className={`w-screen h-screen flex flex-col font-sans overflow-hidden transition-colors duration-300 ${wrapperClass}`}>
      <Toaster position="top-center" toastOptions={{ duration: 2500, style: { fontWeight: 'bold', fontSize: '13px', borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' } }} />
      {/* 💡 MenuBar가 정의되어 있다면 렌더링, 아니라면 주석 처리 가능 */}
      <MenuBar /> 

      {/* 우클릭 컨텍스트 메뉴 */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ top: contextMenu.y, left: contextMenu.x }} className={`fixed z-[9999] border rounded-2xl shadow-2xl py-2 w-52 overflow-hidden backdrop-blur-xl ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
            {(contextMenu.type === 'erdNode' || contextMenu.type === 'flowNode') && contextMenu.targetId && (
              <>
                <div className="px-4 py-3">
                  <span className={`text-[11px] font-bold mb-2 block flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><VscSymbolColor/>색상 테마 변경</span>
                  <div className="flex gap-2">
                    {['bg-slate-900', 'bg-red-600', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600'].map(c => (
                      <button key={c} onClick={()=>changeNodeColor(contextMenu.targetId, c, contextMenu.type==='erdNode')} className={`w-6 h-6 rounded-full shadow-sm hover:scale-110 transition-transform border-2 border-white/20 ${c}`}></button>
                    ))}
                  </div>
                </div>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { contextMenu.type==='erdNode' ? duplicateTable(contextMenu.targetId) : duplicateFlowNode(contextMenu.targetId); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-800 hover:bg-slate-100'}`}><VscCopy size={16}/> 컴포넌트 복제</button>
                <button onClick={() => { recordHistory(); contextMenu.type==='erdNode' ? setErdNodes(nds=>nds.filter(n=>n.id!==contextMenu.targetId)) : setFlowNodes(nds=>nds.filter(n=>n.id!==contextMenu.targetId)); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-50'}`}><VscTrash size={16}/> 삭제하기</button>
                
                {/* 💡 ERD 테이블 우클릭 시 스니펫 저장 버튼 추가 */}
                {contextMenu.type === 'erdNode' && (
                  <>
                    <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                    <button onClick={() => { handleSaveAsSnippet(contextMenu.targetId); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-amber-500 flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-amber-500/20' : 'hover:bg-amber-50'}`}><VscBookmark size={16}/> 스니펫으로 등록</button>
                  </>
                )}
              </>
            )}
            {contextMenu.type === 'erdPane' && (
              <button onClick={() => { handleAddTable(); setContextMenu(null); }} className={`w-full text-left px-4 py-3 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-800 hover:bg-indigo-50 text-indigo-600'}`}><VscAdd size={16}/> 이 위치에 새 테이블 추가</button>
            )}
            {contextMenu.type === 'req' && contextMenu.targetId && (
              <>
                <button onClick={() => moveItem('req', contextMenu.targetId, 'up')} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-100 text-slate-800'}`}><VscArrowUp size={16}/> 위로 이동</button>
                <button onClick={() => moveItem('req', contextMenu.targetId, 'down')} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-100 text-slate-800'}`}><VscArrowDown size={16}/> 아래로 이동</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { setInsertTarget({type: 'req', id: contextMenu.targetId}); handleAddReq(); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-emerald-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-emerald-500/20':'hover:bg-emerald-50'}`}><VscAdd size={16}/> 아래에 새 항목 삽입</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { handleDeleteReq(contextMenu.targetId); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-red-500/20':'hover:bg-red-50'}`}><VscTrash size={16}/> 항목 삭제</button>
              </>
            )}
            {contextMenu.type === 'api' && contextMenu.targetId && (
              <>
                <button onClick={() => moveItem('api', contextMenu.targetId, 'up')} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-100 text-slate-800'}`}><VscArrowUp size={16}/> 위로 이동</button>
                <button onClick={() => moveItem('api', contextMenu.targetId, 'down')} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-100 text-slate-800'}`}><VscArrowDown size={16}/> 아래로 이동</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { setInsertTarget({type: 'api', id: contextMenu.targetId}); handleAddApi(); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-emerald-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-emerald-500/20':'hover:bg-emerald-50'}`}><VscAdd size={16}/> 아래에 새 API 삽입</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { handleDeleteApi(contextMenu.targetId); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-red-500/20':'hover:bg-red-50'}`}><VscTrash size={16}/> API 삭제</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 px-6 py-5 overflow-hidden flex flex-col min-h-0 relative">
        <div className="mb-5 flex items-center justify-between shrink-0 relative z-[99]">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30">🏗️</span> 
                개인화 설계 센터
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className={`text-[14px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>기획부터 개발 스캐폴딩, 문서 자동 추출까지 혼자서도 완벽하게.</p>
                {lastSavedTime && (
                  <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${isDark ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                    <VscCheck size={12}/> {lastSavedTime} 자동저장됨
                  </span>
                )}
              </div>
            </div>

            <div className={`ml-4 flex items-center rounded-xl border shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <button onClick={handleUndo} disabled={past.length === 0} className={`p-2.5 transition-colors rounded-l-xl ${past.length === 0 ? 'opacity-30 cursor-not-allowed' : (isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700')}`} title="이전으로 되돌리기 (Ctrl+Z)">
                <VscDiscard size={18}/>
              </button>
              <div className={`w-px h-5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
              <button onClick={handleRedo} disabled={future.length === 0} className={`p-2.5 transition-colors rounded-r-xl ${future.length === 0 ? 'opacity-30 cursor-not-allowed' : (isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-700')}`} title="다시 실행 (Ctrl+Y)">
                <VscRedo size={18}/>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setIsDark(!isDark)} className={`p-2.5 rounded-xl shadow-sm transition-all duration-300 hover:scale-105 ${isDark ? 'bg-slate-800 text-yellow-400 border border-slate-700' : 'bg-white text-indigo-600 border border-slate-200'}`} title="테마 변경">
              {isDark ? '🌙' : '☀️'}
            </button>
            <div className={`w-px h-8 mx-1 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

            <button onClick={() => setIsCommandPaletteOpen(true)} className={`px-4 py-2.5 rounded-xl font-bold text-[13px] flex items-center gap-2 transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`} title="통합 검색 (Ctrl+K)">
              <VscSearch size={16}/> 전체 검색 <span className="opacity-40 text-[10px] ml-1">Ctrl+K</span>
            </button>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')} className={`px-4 py-2.5 rounded-xl font-bold text-[13px] flex items-center gap-2 transition-all hover:shadow-md ${isDark ? 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <VscTools size={16}/> 개발 도구 <VscChevronDown size={14} className={openMenu === 'tools' ? 'rotate-180 transition-transform' : 'transition-transform'}/>
              </button>
              <AnimatePresence>
                {openMenu === 'tools' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border overflow-hidden z-[999] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="p-2 flex flex-col gap-1">
                      <button onClick={() => { handleRunLinter(); setOpenMenu(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-700'}`}>
                        <VscCheckAll size={16}/> 아키텍처 무결성 검사
                      </button>
                      <button onClick={() => { handleOpenCodeHub(); setOpenMenu(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-700'}`}>
                        <VscTerminalCmd size={16}/> 풀스택 코드 허브
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')} className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 flex items-center gap-2 transition-all hover:-translate-y-0.5">
                <VscFiles size={16}/> 파일/버전 <VscChevronDown size={14} className={openMenu === 'file' ? 'rotate-180 transition-transform' : 'transition-transform'}/>
              </button>
              <AnimatePresence>
                {openMenu === 'file' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl border overflow-hidden z-[999] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="p-2 flex flex-col">
                      <button onClick={handleResetProject} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-700 text-rose-400' : 'hover:bg-rose-50 text-rose-600'}`}>
                        <div className="flex items-center gap-2"><VscNewFile size={16}/> 새 프로젝트 시작 (초기화)</div>
                      </button>
                      <div className={`h-px my-1.5 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>

                      <span className={`px-3 py-1.5 text-[11px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>스냅샷 및 버전 복원</span>
                      <button onClick={() => { saveSnapshot('수동 스냅샷 저장'); setOpenMenu(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <div className="flex items-center gap-2"><VscSave size={16}/> 현재 상태 기억하기</div>
                        <span className="text-[10px] opacity-50 font-normal">Ctrl+S</span>
                      </button>
                      <button onClick={() => { setIsHistoryModalOpen(true); setOpenMenu(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-between transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <div className="flex items-center gap-2"><VscHistory size={16}/> 이전 버전으로 되돌리기</div>
                      </button>
                      
                      <div className={`h-px my-1.5 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                      
                      <span className={`px-3 py-1.5 text-[11px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>로컬 파일 저장/불러오기</span>
                      <input type="file" id="file-upload" className="hidden" accept=".json" onChange={(e) => { handleImportProject(e); setOpenMenu(null); }} />
                      <label htmlFor="file-upload" className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <VscFolderOpened size={16}/> 내 컴퓨터에서 파일 열기
                      </label>
                      <button onClick={() => { handleExportProject(); setOpenMenu(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-600'}`}>
                        <VscDesktopDownload size={16}/> 전체 프로젝트 백업
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl shadow-xl border flex flex-col flex-1 overflow-hidden relative min-h-0 z-10 ${panelClass}`}>
          
          <div className={`inline-flex p-1.5 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'} backdrop-blur-sm z-10 m-4`}>
            {[
              { id: 'requirements', label: '요구사항 정리', err: 0 }, 
              { id: 'erd', label: '데이터베이스 (ERD)', err: erdErrorCount }, 
              { id: 'flow', label: '시스템 구조 (Flow)', err: 0 }, 
              { id: 'api', label: 'API 명세서', err: apiErrorCount }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-6 py-2.5 text-[14px] font-bold rounded-lg transition-all outline-none whitespace-nowrap ${activeTab === tab.id ? (isDark ? 'text-white shadow-lg' : 'text-slate-800 shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                {activeTab === tab.id && <motion.div layoutId="pillTab" className={`absolute inset-0 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={{ zIndex: -1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                <span className="relative">
                  {tab.label}
                  {tab.err > 0 && <span className="absolute -top-2 -right-4 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-slate-800"></span></span>}
                </span>
              </button>
            ))}
          </div>

          <div className={`flex-1 overflow-hidden relative min-h-0 flex flex-col ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50/50'} rounded-b-3xl`}>
            <AnimatePresence mode="wait">
              
              {/* 📋 요구사항 탭 */}
              {activeTab === 'requirements' && (
                <motion.div key="req" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 max-w-[1400px] w-full mx-auto h-full flex flex-col min-h-0">
                  <div className="flex justify-between items-end mb-4 shrink-0">
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-2">요구사항 칸반 보드 <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>Excel 붙여넣기 지원 (Ctrl+V)</span></h2>
                      <p className={`text-[13px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>요구사항에 우선순위와 진행 상태를 부여하여 실제 개발 업무를 추적하세요.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className={`flex items-center border-2 rounded-xl px-3 py-2 shadow-sm focus-within:border-indigo-500 transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <VscSearch className="text-slate-400 mr-2" size={16} />
                        <input id="search-input" value={reqSearch} onChange={e=>setReqSearch(e.target.value)} placeholder="검색 (Ctrl+F)" className="text-[13px] outline-none w-40 bg-transparent font-medium" />
                      </div>
                      <button onClick={() => handleExportCSV('req')} className={`px-4 py-2 border-2 text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><VscTable size={16}/> CSV 추출</button>
                      <button onClick={() => handleExportMarkdown('req')} className={`px-4 py-2 border-2 text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><VscMarkdown size={16}/> 마크다운</button>
                      <button onClick={handleAddReq} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:bg-indigo-700 flex items-center gap-2 transition-colors"><VscAdd size={16}/> 새 항목 추가</button>
                    </div>
                  </div>
                  
                  {requirements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className={`p-8 rounded-full mb-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}><VscMarkdown size={72} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} /></div>
                      <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>아직 작성된 요구사항이 없습니다.</h3>
                      <p className={`text-[15px] font-medium mb-8 text-center max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>지금 바로 새로운 요구사항를 추가하거나,<br/>엑셀에서 복사(Ctrl+C) 후 이곳에 붙여넣기(Ctrl+V) 해보세요!</p>
                      <button onClick={handleAddReq} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1 flex items-center gap-2"><VscAdd size={18}/> 첫 요구사항 만들기</button>
                    </div>
                  ) : (
                  <div className={`flex-1 overflow-y-auto rounded-2xl shadow-sm border min-h-0 ${panelClass} custom-scrollbar`}>
                    <table className="w-full text-left border-collapse relative">
                      <thead className={`sticky top-0 z-10 shadow-sm backdrop-blur-xl ${tableHeadClass}`}>
                        <tr>
                          <th className="p-4 font-black text-[13px] w-[10%]">구분</th>
                          <th className="p-4 font-black text-[13px] w-[20%]">기능명</th>
                          <th className="p-4 font-black text-[13px] w-[10%] text-center">우선순위</th>
                          <th className="p-4 font-black text-[13px] w-[10%] text-center">상태</th>
                          <th className="p-4 font-black text-[13px] w-[35%]">세부 명세</th>
                          <th className="p-4 font-black text-[13px] w-[10%]">비고</th>
                          <th className="p-4 font-black text-[13px] text-center w-[5%]">삭제</th>
                        </tr>
                      </thead>
                      <tbody onPaste={handlePasteRequirements}>
                        {filteredReqs.map((req) => (
                          <tr key={req.id} onContextMenu={(e) => handleRightClick(e, 'req', req.id)} className={`border-b transition-colors ${tableRowClass}`}>
                            <td className="p-3"><input value={req.category} onChange={(e)=>updateReq(req.id, 'category', e.target.value)} className={`w-full font-bold text-[13px] bg-transparent outline-none rounded-lg px-2 py-1.5 transition-colors ${inputClass}`} /></td>
                            <td className="p-3"><input value={req.name} onChange={(e)=>updateReq(req.id, 'name', e.target.value)} className={`w-full font-bold text-[13px] bg-transparent outline-none rounded-lg px-2 py-1.5 transition-colors ${inputClass}`} /></td>
                            <td className="p-3 text-center">
                              <select value={req.priority} onChange={(e)=>updateReq(req.id, 'priority', e.target.value)} className={`text-[11px] font-black rounded-lg border outline-none cursor-pointer px-2 py-1.5 shadow-sm transition-colors ${req.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200' : req.priority === 'Mid' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-slate-50 text-slate-500 border-slate-200'} ${isDark && req.priority === 'High' ? 'bg-red-900/30 border-red-800' : isDark && req.priority === 'Mid' ? 'bg-yellow-900/30 border-yellow-800' : isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
                                <option value="High">High 🔴</option><option value="Mid">Mid 🟡</option><option value="Low">Low ⚪</option>
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <select value={req.status} onChange={(e)=>updateReq(req.id, 'status', e.target.value)} className={`text-[11px] font-black rounded-lg border outline-none cursor-pointer px-2 py-1.5 shadow-sm transition-colors ${req.status === 'Done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : req.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'} ${isDark && req.status === 'Done' ? 'bg-emerald-900/30 border-emerald-800' : isDark && req.status === 'In Progress' ? 'bg-blue-900/30 border-blue-800' : isDark ? 'bg-slate-800 border-slate-700' : ''}`}>
                                <option value="Todo">Todo 📋</option><option value="In Progress">In Progress 🏃</option><option value="Done">Done ✅</option>
                              </select>
                            </td>
                            <td className="p-3"><textarea value={req.desc} onChange={(e)=>updateReq(req.id, 'desc', e.target.value)} rows={1} className={`w-full text-[13px] font-medium bg-transparent outline-none rounded-lg px-2 py-1.5 resize-none custom-scrollbar transition-colors ${inputClass}`} /></td>
                            <td className="p-3"><input value={req.note} onChange={(e)=>updateReq(req.id, 'note', e.target.value)} className={`w-full text-[11px] font-bold bg-transparent outline-none rounded-lg px-2 py-1.5 ${isDark?'text-slate-400':'text-slate-500'} transition-colors ${inputClass}`} /></td>
                            <td className="p-3 text-center"><button onClick={() => handleDeleteReq(req.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><VscTrash size={16}/></button></td>
                          </tr>
                        ))}
                        <tr ref={reqListEndRef}></tr>
                      </tbody>
                    </table>
                  </div>
                  )}
                </motion.div>
              )}

              {/* 🗄️ ERD 탭 */}
              {activeTab === 'erd' && (
                <motion.div key="erd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-dot-pattern">
                  {erdNodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className={`p-8 rounded-full mb-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}><VscDatabase size={72} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} /></div>
                      <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>아직 작성된 테이블 (ERD)가 없습니다.</h3>
                      <button onClick={handleAddTable} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1 flex items-center gap-2"><VscAdd size={18}/> 첫 테이블 그리기</button>
                    </div>
                  ) : (
                  <ReactFlowProvider>
                    <ReactFlow onNodesDelete={onNodesDelete} onEdgesDelete={onEdgesDelete} snapToGrid={true} snapGrid={[20, 20]} selectionMode={SelectionMode.Partial} panOnScroll nodes={erdNodes} edges={erdEdges} onNodesChange={onErdNodesChange} onEdgesChange={onErdEdgesChange} onConnect={onErdConnect} nodeTypes={erdNodeTypes} fitView minZoom={0.1} maxZoom={2} onPaneContextMenu={(e) => handleRightClick(e, 'erdPane')} onNodeContextMenu={(e, node) => handleRightClick(e, 'erdNode', node.id)} onEdgeDoubleClick={(e, edge) => onEdgeDoubleClick(e, edge, setErdEdges)}>
                      <Background color={isDark ? "#334155" : "#cbd5e1"} gap={20} size={1.5} />
                      <Controls className={`shadow-xl border-none rounded-xl m-6 overflow-hidden ${isDark ? 'bg-slate-800 fill-white' : 'bg-white'}`} />
                      
                      <div className="absolute top-6 right-6 z-50 flex flex-col gap-3 items-end">
                        <div className={`flex items-center border rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                           <VscSearch className="text-slate-400 mr-2" size={18} />
                           <input id="search-input" value={canvasSearch} onChange={e=>setCanvasSearch(e.target.value)} placeholder="테이블/컬럼 검색 (Ctrl+F)" className="text-[13px] outline-none w-44 bg-transparent font-bold" />
                        </div>
                        <button onClick={handleExportDataDictionary} className={`px-4 py-2 rounded-xl font-bold text-[12px] shadow-lg border transition-colors flex items-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700 text-blue-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50'}`} title="데이터 사전 문서 다운로드">
                          <VscBook size={16}/> 데이터 사전 추출
                        </button>
                        <button onClick={() => setShowMinimap(!showMinimap)} className={`p-3 rounded-full shadow-lg border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} title="미니맵 표시 토글">
                          {showMinimap ? <VscEye size={18}/> : <VscEyeClosed size={18}/>}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {showMinimap && (
                          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <MiniMap position="bottom-right" nodeStrokeWidth={3} zoomable pannable style={{ borderRadius: '16px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', margin: '24px', backgroundColor: isDark ? '#0f172a' : '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} nodeColor={(n) => (canvasSearch && n.data.name?.toLowerCase().includes(canvasSearch.toLowerCase())) ? '#ef4444' : (n.type === 'stickyNode' ? '#eab308' : (isDark ? '#475569' : '#cbd5e1'))} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <motion.div drag dragMomentum={false} dragElastic={0} className={`absolute z-50 shadow-2xl rounded-2xl border overflow-visible backdrop-blur-xl ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`} style={{ bottom: "2rem", left: "50%", x: "-50%" }} initial={false}>
                        <div className="px-2 py-2 flex items-center gap-1.5 flex-nowrap w-max max-w-[90vw]">
                          
                          <div className="flex items-center justify-center p-2 text-slate-400 hover:text-indigo-500 cursor-move shrink-0 active:scale-95 transition-transform"><VscGripper size={20} /></div>
                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                          
                          <div className="flex px-1 gap-1">
                            <div className="group relative">
                              <button className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20`}>
                                <VscRocket size={18} className="mb-1"/><span className="text-[10px] font-bold whitespace-nowrap">🔥 스니펫</span>
                              </button>
                              <div className={`absolute bottom-full left-0 mb-2 w-36 rounded-xl shadow-2xl border overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[999] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <button onClick={() => handleQuickAddTemplate('user')} className={`w-full text-left px-3 py-2.5 text-[12px] font-bold transition-colors ${isDark?'hover:bg-slate-700':'hover:bg-slate-50'}`}>🙋 회원(User)</button>
                                <button onClick={() => handleQuickAddTemplate('board')} className={`w-full text-left px-3 py-2.5 text-[12px] font-bold transition-colors ${isDark?'hover:bg-slate-700':'hover:bg-slate-50'}`}>📝 게시판(Post)</button>
                                
                                {/* 💡 저장된 커스텀 스니펫 렌더링 영역 */}
                                {customSnippets.length > 0 && (
                                  <>
                                    <div className={`h-px w-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                                    <div className={`px-3 py-1.5 text-[10px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>내 스니펫</div>
                                    {customSnippets.map(snippet => (
                                      <div key={snippet.id} className="relative group/item flex items-center">
                                        <button onClick={() => handleAddCustomSnippet(snippet)} className={`w-full text-left px-3 py-2 text-[12px] font-bold transition-colors truncate pr-8 ${isDark?'hover:bg-slate-700 text-amber-400':'hover:bg-slate-50 text-amber-600'}`}>
                                          🔖 {snippet.name}
                                        </button>
                                        <button onClick={(e) => handleDeleteSnippet(e, snippet.id)} className="absolute right-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                          <VscTrash size={14}/>
                                        </button>
                                      </div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </div>
                            <button onClick={()=>handleAddTable()} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscAdd className="text-indigo-500 mb-1" size={18}/><span className="text-[10px] font-bold">새 테이블</span></button>
                            <button onClick={()=>handleAddStickyNode(true)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscNote className="text-yellow-500 mb-1" size={18}/><span className="text-[10px] font-bold">메모장</span></button>
                            <button onClick={()=>setIsSqlImportModalOpen(true)} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-slate-100 text-blue-600'}`}><VscDatabase size={18} className="mb-1"/><span className="text-[10px] font-bold whitespace-nowrap">SQL로 그리기</span></button>
                          </div>
                          
                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

                          <div className="flex px-1 gap-1 items-center">
                            <button onClick={handleAutoLayoutERD} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscLayout className="text-indigo-500 mb-1" size={18}/><span className="text-[10px] font-bold">자동정렬</span></button>
                            <select value={edgeStyle} onChange={(e)=>setEdgeStyle(e.target.value)} className={`text-[11px] font-bold outline-none rounded-lg p-1.5 cursor-pointer h-8 mx-1 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'} border`}>
                              <option value="default">곡선 선</option><option value="smoothstep">둥근 직각</option><option value="step">직각 선</option><option value="straight">직선</option>
                            </select>
                          </div>

                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

                          <div className="flex px-1 gap-1">
                            <button onClick={()=>copyImageToClipboard('.react-flow__viewport')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscCopy className="text-emerald-500 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">화면 캡쳐</span></button>
                            <button onClick={handleExportSql} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscSave className="text-indigo-400 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">SQL 다운</span></button>
                            <button onClick={()=>handleExportDiagramText('erd')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscGoToFile className="text-pink-500 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">텍스트 추출</span></button>
                          </div>
                        </div>
                      </motion.div>
                    </ReactFlow>
                  </ReactFlowProvider>
                  )}
                </motion.div>
              )}

              {/* 🌊 시스템 데이터 플로우 탭 */}
              {activeTab === 'flow' && (
                <motion.div key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-dot-pattern">
                  {flowNodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full w-full">
                      <div className={`p-8 rounded-full mb-6 shadow-xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}><VscGlobe size={72} className={isDark ? 'text-indigo-400' : 'text-indigo-500'} /></div>
                      <h3 className={`text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>아직 작성된 시스템 구조가 없습니다.</h3>
                      <button onClick={() => handleAddFlowNode('server')} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1 flex items-center gap-2"><VscAdd size={18}/> 첫 서버 추가하기</button>
                    </div>
                  ) : (
                  <ReactFlowProvider>
                    
                    <div className={`absolute top-6 left-6 z-50 p-4 rounded-2xl shadow-xl backdrop-blur-md w-[220px] border transition-colors ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                      <h3 className={`text-[13px] font-black mb-4 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}><VscPieChart size={16} className="text-indigo-500"/> 아키텍처 대시보드</h3>
                      {totalFlowNodes > 0 && (
                        <div className={`h-2.5 w-full rounded-full flex overflow-hidden mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          {clientCount > 0 && <div style={{width: `${(clientCount/totalFlowNodes)*100}%`}} className="bg-blue-500 h-full" title="클라이언트" />}
                          {serverCount > 0 && <div style={{width: `${(serverCount/totalFlowNodes)*100}%`}} className="bg-emerald-500 h-full" title="서버/API" />}
                          {dbCount > 0 && <div style={{width: `${(dbCount/totalFlowNodes)*100}%`}} className="bg-orange-500 h-full" title="데이터베이스" />}
                          {cloudCount > 0 && <div style={{width: `${(cloudCount/totalFlowNodes)*100}%`}} className="bg-purple-500 h-full" title="외부 서비스" />}
                        </div>
                      )}
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 text-[12px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}><span className="w-3.5 h-3.5 rounded bg-blue-500/20 border border-blue-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-blue-500 rounded-sm"></div></span>클라이언트</div>
                          <span className={`text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{clientCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 text-[12px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}><span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm"></div></span>서버 / API</div>
                          <span className={`text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{serverCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 text-[12px] font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}><span className="w-3.5 h-3.5 rounded bg-orange-500/20 border border-orange-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-orange-500 rounded-sm"></div></span>데이터베이스</div>
                          <span className={`text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dbCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center gap-2 text-[12px] font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}><span className="w-3.5 h-3.5 rounded bg-purple-500/20 border border-purple-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-sm"></div></span>외부 서비스</div>
                          <span className={`text-[12px] font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{cloudCount}</span>
                        </div>
                      </div>
                      <div className={`h-px w-full my-3 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                      <div className="flex justify-between items-center text-[12px] font-bold mb-1"><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>총 컴포넌트</span><span className={`text-[14px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{totalFlowNodes}개</span></div>
                      <div className="flex justify-between items-center text-[12px] font-bold"><span className={isDark ? 'text-slate-400' : 'text-slate-500'}>총 연결 통신망</span><span className={`text-[14px] font-black ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>{flowEdges.length}개</span></div>
                    </div>

                    <ReactFlow onNodesDelete={onNodesDelete} onEdgesDelete={onEdgesDelete} snapToGrid={true} snapGrid={[20, 20]} selectionMode={SelectionMode.Partial} panOnScroll nodes={flowNodes} edges={flowEdges} onNodesChange={onFlowNodesChange} onEdgesChange={onFlowEdgesChange} onConnect={onFlowConnect} nodeTypes={flowNodeTypes} fitView minZoom={0.2} maxZoom={2} onEdgeDoubleClick={(e, edge) => onEdgeDoubleClick(e, edge, setFlowEdges)} onNodeContextMenu={(e, node) => handleRightClick(e, 'flowNode', node.id)}>
                      <Background color={isDark ? "#334155" : "#cbd5e1"} gap={20} size={1} />
                      <Controls className={`shadow-xl border-none rounded-xl m-6 overflow-hidden ${isDark ? 'bg-slate-800 fill-white' : 'bg-white'}`} />
                      
                      <div className="absolute top-6 right-6 z-50 flex flex-col gap-3 items-end">
                        <div className={`flex items-center border rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                           <VscSearch className="text-slate-400 mr-2" size={18} />
                           <input id="search-input" value={canvasSearch} onChange={e=>setCanvasSearch(e.target.value)} placeholder="노드 검색 (Ctrl+F)" className="text-[13px] outline-none w-40 bg-transparent font-bold" />
                        </div>
                        <button onClick={() => setShowMinimap(!showMinimap)} className={`p-3 rounded-full shadow-lg border transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`} title="미니맵 표시 토글">
                          {showMinimap ? <VscEye size={18}/> : <VscEyeClosed size={18}/>}
                        </button>
                      </div>

                      <AnimatePresence>
                        {showMinimap && (
                          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <MiniMap position="bottom-right" nodeStrokeWidth={3} zoomable pannable style={{ borderRadius: '16px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', margin: '24px', backgroundColor: isDark ? '#0f172a' : '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} nodeColor={(n) => (canvasSearch && n.data.label?.toLowerCase().includes(canvasSearch.toLowerCase())) ? '#ef4444' : (n.type === 'stickyNode' ? '#eab308' : (isDark ? '#475569' : '#cbd5e1'))} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      
                      <motion.div drag dragMomentum={false} dragElastic={0} className={`absolute z-50 shadow-2xl rounded-2xl border overflow-visible backdrop-blur-xl ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`} style={{ bottom: "2rem", left: "50%", x: "-50%" }} initial={false}>
                        <div className="px-2 py-2 flex items-center gap-1 flex-nowrap w-max max-w-[90vw]">
                          <div className="flex items-center justify-center p-2 text-slate-400 hover:text-indigo-500 cursor-move shrink-0 active:scale-95 transition-transform"><VscGripper size={20} /></div>
                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

                          <div className="flex px-1 gap-1">
                            <button onClick={()=>handleAddFlowNode('client')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700 text-blue-300':'hover:bg-blue-50 text-blue-600'}`}><VscGlobe size={18} className="mb-1"/><span className="text-[10px] font-bold">클라이언트</span></button>
                            <button onClick={()=>handleAddFlowNode('server')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700 text-emerald-300':'hover:bg-emerald-50 text-emerald-600'}`}><VscServer size={18} className="mb-1"/><span className="text-[10px] font-bold">서버/API</span></button>
                            <button onClick={()=>handleAddFlowNode('db')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700 text-orange-300':'hover:bg-orange-50 text-orange-600'}`}><VscDatabase size={18} className="mb-1"/><span className="text-[10px] font-bold">DB</span></button>
                            <button onClick={()=>handleAddStickyNode(false)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700 text-yellow-400':'hover:bg-yellow-50 text-yellow-600'}`}><VscNote size={18} className="mb-1"/><span className="text-[10px] font-bold">메모장</span></button>
                          </div>
                          
                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                          
                          <div className="flex px-1 gap-1 items-center">
                            <button onClick={handleAutoLayoutFlow} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700':'hover:bg-slate-100'}`}><VscLayout className="text-indigo-500 mb-1" size={18}/><span className="text-[10px] font-bold">자동정렬</span></button>
                            <select value={edgeStyle} onChange={(e)=>setEdgeStyle(e.target.value)} className={`text-[11px] font-bold outline-none rounded-lg p-1.5 cursor-pointer h-8 mx-1 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'} border`}>
                              <option value="default">곡선 선</option><option value="smoothstep">둥근 직각</option><option value="step">직각 선</option><option value="straight">직선</option>
                            </select>
                          </div>

                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

                          <div className="flex px-1 gap-1">
                            <button onClick={()=>copyImageToClipboard('.react-flow__viewport')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscCopy className="text-emerald-500 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">화면 캡쳐</span></button>
                            <button onClick={()=>handleExportDiagramText('flow')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscGoToFile className="text-pink-500 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">텍스트 추출</span></button>
                          </div>
                        </div>
                      </motion.div>
                    </ReactFlow>
                  </ReactFlowProvider>
                  )}
                </motion.div>
              )}

              {/* 📋 API 탭 */}
              {activeTab === 'api' && (
                <motion.div key="api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 max-w-[1400px] w-full mx-auto h-full flex flex-col min-h-0">
                  <div className="flex justify-between items-end mb-4 shrink-0">
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-2">REST API 명세서 <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>Excel 붙여넣기 지원 (Ctrl+V)</span></h2>
                      <p className={`text-[13px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>작성된 명세를 다른 개발자가 바로 쓸 수 있는 <b>표준 포맷(Swagger / Postman)</b>으로 변환해 드립니다.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className={`flex items-center border-2 rounded-xl px-3 py-2 shadow-sm focus-within:border-indigo-500 transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <VscSearch className="text-slate-400 mr-2" size={16} />
                        <input id="search-input" value={apiSearch} onChange={e=>setApiSearch(e.target.value)} placeholder="검색 (Ctrl+F)" className="text-[13px] outline-none w-40 bg-transparent font-medium" />
                      </div>
                      
                      <button onClick={handleExportPostman} className={`px-4 py-2 rounded-xl font-bold text-[13px] shadow-sm border transition-colors flex items-center gap-2 ${isDark ? 'bg-slate-800 border-slate-700 text-orange-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-orange-600 hover:bg-orange-50'}`} title="Postman 앱에 바로 임포트 할 수 있습니다.">
                        <VscSend size={16}/> Postman 다운
                      </button>

                      <button onClick={() => handleExportCSV('api')} className={`px-4 py-2 border-2 text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><VscTable size={16}/> CSV 추출</button>
                      <button onClick={handleScaffoldApiFromErd} className={`px-4 py-2 border border-purple-500/50 bg-purple-50/50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-400 text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors`}><VscWand size={16}/> ERD로 생성</button>
                      <button onClick={handleExportApiJson} className="px-4 py-2 bg-emerald-600 text-white text-[13px] font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-700 flex items-center gap-2 transition-colors"><VscPulse size={16}/> JSON 다운</button>
                      <button onClick={handleAddApi} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:bg-indigo-700 flex items-center gap-2 transition-colors"><VscAdd size={16}/> 새 API 추가</button>
                    </div>
                  </div>

                  {apiSpecs.length === 0 ? <ActionableEmptyState type="API 명세" onAction={handleAddApi} actionLabel="첫 API 작성하기" icon={VscServer} /> : (
                  <div className={`flex-1 overflow-y-auto rounded-2xl shadow-sm border min-h-0 ${panelClass} custom-scrollbar`}>
                    <table className="w-full text-left border-collapse relative">
                      <thead className={`sticky top-0 z-10 shadow-sm backdrop-blur-xl ${tableHeadClass}`}><tr><th className="p-4 font-black text-[13px] w-[15%] text-center">Method</th><th className="p-4 font-black text-[13px] w-[35%]">Endpoint URL</th><th className="p-4 font-black text-[13px] w-[30%]">설명 (Description)</th><th className="p-4 font-black text-[13px] text-center w-[20%]">작업</th></tr></thead>
                      <tbody onPaste={handlePasteApi}>
                        {filteredApis.map((api) => {
                          const hasError = api.endpoint && !api.endpoint.startsWith('/');
                          return (
                          <tr key={api.id} onContextMenu={(e) => handleRightClick(e, 'api', api.id)} className={`border-b font-mono transition-colors ${tableRowClass}`}>
                            <td className="p-3 text-center">
                              <select value={api.method} onChange={(e)=>updateApi(api.id, 'method', e.target.value)} className={`px-3 py-1.5 text-[12px] font-black rounded-lg border outline-none cursor-pointer shadow-sm transition-colors ${getMethodColor(api.method)}`}>
                                <option className={isDark?'text-blue-400':'text-blue-600'} value="GET">GET</option>
                                <option className={isDark?'text-emerald-400':'text-emerald-600'} value="POST">POST</option>
                                <option className={isDark?'text-amber-400':'text-amber-600'} value="PUT">PUT</option>
                                <option className={isDark?'text-red-400':'text-red-600'} value="DELETE">DELETE</option>
                              </select>
                            </td>
                            <td className="p-3 font-bold text-[13px] flex items-center gap-2">
                              <input value={api.endpoint} onChange={(e)=>updateApi(api.id, 'endpoint', e.target.value)} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 transition-colors ${inputClass} ${hasError ? 'text-red-500 bg-red-500/10' : ''}`} />
                              {hasError && <VscWarning className="text-red-500 shrink-0 drop-shadow-md" title="URL은 '/'로 시작해야 합니다." />}
                            </td>
                            <td className="p-3 font-sans text-[13px] font-medium">
                              <textarea value={api.desc} onChange={(e)=>updateApi(api.id, 'desc', e.target.value)} rows={1} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 resize-none custom-scrollbar transition-colors ${inputClass}`} />
                            </td>
                            <td className="p-3 flex justify-center items-center gap-2">
                              <button onClick={() => handleViewMock(api)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors ${isDark ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'}`}><VscJson size={14}/> 테스트(JSON)</button>
                              <button onClick={() => handleDeleteApi(api.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><VscTrash size={16}/></button>
                            </td>
                          </tr>
                        )})}
                        <tr ref={apiListEndRef}></tr>
                      </tbody>
                    </table>
                  </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      
      {/* ========================================== */}
      {/* 🧩 모달창 구현 영역 (누락된 부분 추가) */}
      {/* ========================================== */}

      {/* 1. API Mock 테스터 팝업 */}
      <AnimatePresence>
        {isMockViewerOpen && mockViewerData && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[700px] h-[550px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="font-black text-lg flex items-center gap-3">
                  <VscJson size={22} className="text-blue-500"/> API Mock 응답 미리보기
                </h3>
                <button onClick={() => setIsMockViewerOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className="flex flex-col flex-1 p-6 overflow-hidden bg-[#0d1117]">
                <div className="mb-4 flex items-center gap-3 bg-slate-800/80 border border-slate-700 p-3 rounded-xl shadow-inner">
                  <span className={`px-2.5 py-1 text-[11px] font-black rounded-md ${getMethodColor(mockViewerData.method)}`}>{mockViewerData.method}</span>
                  <span className="font-mono text-[14px] text-white font-bold">{mockViewerData.endpoint}</span>
                </div>
                <div className="relative flex-1 flex flex-col border border-slate-700 rounded-2xl overflow-hidden shadow-inner bg-[#1e1e1e]">
                  <div className="absolute top-3 right-3">
                    <button onClick={() => { navigator.clipboard.writeText(mockViewerData.json); toast.success('JSON 응답이 복사되었습니다.'); }} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition-colors shadow flex items-center gap-1.5"><VscCopy size={12}/> 복사</button>
                  </div>
                  <textarea readOnly value={mockViewerData.json} className="w-full h-full p-5 text-emerald-400 font-mono text-[14px] bg-transparent outline-none resize-none custom-scrollbar leading-relaxed" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. 풀스택 Code Hub 모달 (V2 고도화) */}
      <AnimatePresence>
        {isCodeHubOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[1100px] h-[750px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <h3 className="font-black text-lg flex items-center gap-2"><VscTerminalCmd size={22} className="text-indigo-500"/> 풀스택 코드 & 인프라 허브 V2</h3>
                  
                  <div className="flex bg-slate-200/50 dark:bg-slate-700/50 rounded-lg p-1">
                    {[
                      { id: 'settings', label: '⚙️ 설정' },
                      { id: 'structure', label: '🗂️ 구조' },
                      { id: 'backend', label: '☕ 서버' },
                      { id: 'frontend', label: '⚛️ 클라' },
                      { id: 'mock', label: '📄 Mock' },
                      { id: 'sql', label: '🗄️ SQL' },
                      { id: 'infra', label: '🐳 인프라' },
                      { id: 'readme', label: '📝 README' }
                    ].map(tab => (
                      <button key={tab.id} onClick={() => generateCodesForStack(tab.id)} className={`px-3 py-1.5 rounded-md text-[12px] font-bold transition-all ${codeStack === tab.id ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setIsCodeHubOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>

              {codeStack === 'settings' ? (
                <div className={`w-full h-full p-8 overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50/50'}`}>
                   <h3 className="text-xl font-black mb-8 flex items-center gap-2 text-indigo-500"><VscSettingsGear size={24} /> 코드 자동 생성 세부 설정</h3>
                   
                   <div className="grid grid-cols-2 gap-8 max-w-4xl mb-8">
                      {/* 백엔드 설정 영역 */}
                      <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <h4 className="font-bold text-[14px] mb-4 text-emerald-500 border-b pb-2 dark:border-slate-700">☕ Backend (Java / Spring)</h4>
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="text-[12px] font-bold opacity-70 mb-1 block">Java 버전</label>
                            <select value={codeSettings.javaVersion} onChange={e => setCodeSettings({...codeSettings, javaVersion: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none cursor-pointer transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`}>
                              <option value="17">Java 17 (LTS)</option>
                              <option value="21">Java 21 (LTS - Record 권장)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[12px] font-bold opacity-70 mb-1 block">Spring Boot 버전</label>
                            <select value={codeSettings.springVersion} onChange={e => setCodeSettings({...codeSettings, springVersion: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none cursor-pointer transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`}>
                              <option value="3.x">3.x (Jakarta EE)</option>
                              <option value="2.x">2.x (Javax EE)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[12px] font-bold opacity-70 mb-1 block">Java 패키지명</label>
                            <input value={codeSettings.packageName} onChange={e => setCodeSettings({...codeSettings, packageName: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-indigo-300' : 'bg-slate-50 border-slate-200 focus:border-indigo-400 text-indigo-600'}`} />
                          </div>
                          <div>
                            <label className="text-[12px] font-bold opacity-70 mb-1 block">API 공통 기본 경로 (Prefix)</label>
                            <input value={codeSettings.apiPrefix} onChange={e => setCodeSettings({...codeSettings, apiPrefix: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-emerald-400' : 'bg-slate-50 border-slate-200 focus:border-indigo-400 text-emerald-600'}`} />
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer text-[12px] font-bold group">
                              <input type="checkbox" checked={codeSettings.useLombok} onChange={e => setCodeSettings({...codeSettings, useLombok: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                              <span className="group-hover:text-indigo-500 transition-colors">Lombok 적용</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-[12px] font-bold group">
                              <input type="checkbox" checked={codeSettings.useSwagger} onChange={e => setCodeSettings({...codeSettings, useSwagger: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                              <span className="group-hover:text-indigo-500 transition-colors">Swagger(OAS) 적용</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* 프론트엔드/인프라 설정 영역 */}
                      <div className="flex flex-col gap-8">
                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <h4 className="font-bold text-[14px] mb-4 text-blue-500 border-b pb-2 dark:border-slate-700">⚛️ Frontend (React)</h4>
                          <div className="flex flex-col gap-4">
                            <div>
                              <label className="text-[12px] font-bold opacity-70 mb-1 block">프레임워크 환경</label>
                              <select value={codeSettings.frontendFramework} onChange={e => setCodeSettings({...codeSettings, frontendFramework: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none cursor-pointer transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`}>
                                <option value="Next.js (App Router)">Next.js (App Router)</option>
                                <option value="Next.js (Pages Router)">Next.js (Pages Router)</option>
                                <option value="React (Vite)">React (Vite)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[12px] font-bold opacity-70 mb-1 block">UI 컴포넌트 라이브러리</label>
                              <select value={codeSettings.uiLibrary} onChange={e => setCodeSettings({...codeSettings, uiLibrary: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none cursor-pointer transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`}>
                                <option value="Tailwind CSS">Tailwind CSS</option>
                                <option value="MUI (Material-UI)">MUI (Material-UI)</option>
                                <option value="Styled Components">Styled Components</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <h4 className="font-bold text-[14px] mb-4 text-orange-500 border-b pb-2 dark:border-slate-700">🐳 Infrastructure & DB</h4>
                          <div className="flex flex-col gap-4">
                            <div>
                              <label className="text-[12px] font-bold opacity-70 mb-1 block">데이터베이스 엔진</label>
                              <select value={codeSettings.dbType} onChange={e => setCodeSettings({...codeSettings, dbType: e.target.value})} className={`w-full px-3 py-2 rounded-lg border font-mono text-[13px] outline-none cursor-pointer transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 focus:border-indigo-400'}`}>
                                <option value="mysql">MySQL 8.0</option>
                                <option value="postgresql">PostgreSQL 13</option>
                                <option value="mariadb">MariaDB 10</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className={`p-5 rounded-2xl border flex items-start gap-3 text-[13px] font-medium leading-relaxed ${isDark ? 'bg-indigo-900/20 border-indigo-800/50 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-800'}`}>
                      <VscInfo size={20} className="shrink-0 mt-0.5 text-indigo-500" />
                      <div>
                        <strong className="block mb-1">💡 설정 적용 안내</strong>
                        이곳에서 설정을 변경한 뒤 상단의 [구조, 서버, 클라...] 등 다른 탭으로 이동하면 <b>변경된 설정이 모든 소스코드에 실시간으로 다시 반영되어 즉시 생성</b>됩니다.
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex flex-1 overflow-hidden">
                  <div className={`w-72 border-r overflow-y-auto p-4 flex flex-col gap-1.5 ${isDark ? 'bg-[#1e1e1e] border-slate-700' : 'bg-[#fafafa] border-slate-200'}`}>
                    <p className={`text-[11px] font-black mb-3 px-1 tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>EXPLORER</p>
                    {codeHubFiles.length === 0 ? (
                      <p className="text-[12px] p-2 text-slate-400">생성된 파일이 없습니다.</p>
                    ) : codeHubFiles.map((file, idx) => (
                      <button key={idx} onClick={() => setSelectedCodeIndex(idx)} className={`text-left px-3 py-2 rounded-lg text-[13px] font-mono transition-colors truncate border border-transparent ${selectedCodeIndex === idx ? (isDark ? 'bg-[#37373d] text-white border-[#454545]' : 'bg-[#e4e6f1] text-indigo-700 font-bold border-[#c4c6d1]') : (isDark ? 'text-slate-400 hover:bg-[#2a2d2e] hover:text-slate-200' : 'text-slate-600 hover:bg-slate-200')}`}>
                        📄 {file.filename.split('/').pop()} 
                      </button>
                    ))}
                  </div>
                  <div className={`flex-1 flex flex-col relative ${isDark ? 'bg-[#1e1e1e]' : 'bg-[#fffffe]'}`}>
                    {/* 에디터 탭 헤더 */}
                    <div className={`flex items-center h-10 border-b shrink-0 ${isDark ? 'bg-[#252526] border-slate-700' : 'bg-[#f3f3f3] border-slate-200'}`}>
                      <div className={`flex items-center h-full px-4 border-r border-t-2 text-[13px] font-mono ${isDark ? 'bg-[#1e1e1e] text-emerald-400 border-t-emerald-500 border-r-slate-700' : 'bg-white text-emerald-600 border-t-emerald-500 border-r-slate-200 font-bold'}`}>
                        {codeHubFiles[selectedCodeIndex]?.filename.split('/').pop()}
                      </div>
                    </div>
                    {/* 에디터 본문 */}
                    <div className="relative flex-1">
                      <div className="absolute top-4 right-6">
                        <button onClick={copyCodeHubContent} className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-colors shadow-sm flex items-center gap-1.5 ${isDark ? 'bg-[#37373d] hover:bg-[#4d4d53] text-white border border-[#454545]' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}><VscCopy size={14}/> 전체 복사</button>
                      </div>
                      <textarea readOnly value={codeHubFiles[selectedCodeIndex]?.code || ''} className={`w-full h-full p-6 pt-5 font-mono text-[14px] bg-transparent outline-none resize-none custom-scrollbar leading-relaxed ${isDark ? 'text-[#d4d4d4]' : 'text-[#333333]'}`} />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. SQL로 그리기 모달 */}
      <AnimatePresence>
        {isSqlImportModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className={`w-[600px] rounded-3xl shadow-2xl p-6 ${panelClass}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black flex items-center gap-2"><VscDatabase size={22} className="text-indigo-500"/> SQL DDL로 테이블 생성</h3>
                <button onClick={() => setIsSqlImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <p className={`text-[13px] mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                기존에 작성된 <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border">CREATE TABLE</code> 쿼리문을 아래에 붙여넣으면 테이블로 변환됩니다.
              </p>
              <textarea
                value={sqlImportText}
                onChange={(e) => setSqlImportText(e.target.value)}
                placeholder="CREATE TABLE USERS ( id INT PRIMARY KEY, name VARCHAR(50) );"
                className={`w-full h-48 p-4 rounded-xl font-mono text-[13px] mb-4 resize-none outline-none border transition-colors ${isDark ? 'bg-slate-900 border-slate-700 text-emerald-400 focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-emerald-600 focus:border-indigo-400'}`}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsSqlImportModalOpen(false)} className={`px-5 py-2.5 rounded-xl font-bold text-[13px] ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}>취소</button>
                <button onClick={handleImportSQL} className="px-5 py-2.5 rounded-xl font-bold text-[13px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20">SQL로 생성하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. 아키텍처 무결성 검사 (Linter) 모달 */}
      <AnimatePresence>
        {isLinterModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-[600px] rounded-3xl shadow-2xl p-6 flex flex-col max-h-[80vh] ${panelClass}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black flex items-center gap-2"><VscCheckAll size={22} className="text-emerald-500"/> 아키텍처 무결성 검사 결과</h3>
                <button onClick={() => setIsLinterModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {linterIssues.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <VscCheck size={64} className="text-emerald-500 mb-4" />
                    <h4 className="text-lg font-bold">완벽합니다!</h4>
                    <p className={`text-[14px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>설계된 ERD, API 명세, 시스템 구조에서 발견된 문제나 경고가 없습니다.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {linterIssues.map((issue, idx) => (
                      <div key={idx} className={`flex gap-3 p-4 rounded-xl border ${issue.type === 'error' ? (isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') : (isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200')}`}>
                        {issue.type === 'error' ? <VscWarning size={20} className="text-red-500 shrink-0" /> : <VscInfo size={20} className="text-yellow-500 shrink-0" />}
                        <div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md mb-1 inline-block ${issue.type === 'error' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>{issue.tab}</span>
                          <p className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{issue.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setIsLinterModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-[13px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">확인</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. 통합 검색 (Ctrl+K Command Palette) 모달 */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCommandPaletteOpen(false)}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`w-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center px-4 py-4 border-b border-slate-200 dark:border-slate-700">
                <VscSearch size={24} className="text-slate-400 mr-3" />
                <input 
                  id="global-search-input"
                  value={globalSearchStr} 
                  onChange={e => setGlobalSearchStr(e.target.value)} 
                  placeholder="요구사항, API, 테이블, 컴포넌트 검색..." 
                  className="flex-1 bg-transparent text-lg outline-none font-bold"
                  autoFocus
                />
                <button onClick={() => setIsCommandPaletteOpen(false)} className="text-slate-400 hover:text-red-500 px-2 text-[12px] font-bold">ESC</button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                {globalSearchStr.trim() === '' ? (
                  <div className="p-8 text-center opacity-50 text-[13px]">검색어를 입력하시면 전체 프로젝트에서 찾아드립니다.</div>
                ) : (
                  <div className="flex flex-col py-2">
                    {searchReqs.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-1 text-[11px] font-black text-indigo-500">요구사항</div>
                        {searchReqs.map(r => (
                          <div key={r.id} onClick={() => { setActiveTab('requirements'); setReqSearch(r.name); setIsCommandPaletteOpen(false); }} className={`px-4 py-2 cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                            <div className="font-bold text-[13px]">{r.name}</div>
                            <div className="text-[11px] opacity-60 truncate">{r.desc}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchApis.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-1 text-[11px] font-black text-emerald-500">API 명세</div>
                        {searchApis.map(a => (
                          <div key={a.id} onClick={() => { setActiveTab('api'); setApiSearch(a.endpoint); setIsCommandPaletteOpen(false); }} className={`px-4 py-2 cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                            <div className="font-bold text-[13px] flex gap-2"><span className={getMethodColor(a.method)}>{a.method}</span> {a.endpoint}</div>
                            <div className="text-[11px] opacity-60 truncate mt-1">{a.desc}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchErds.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-1 text-[11px] font-black text-orange-500">ERD 테이블</div>
                        {searchErds.map(n => (
                          <div key={n.id} onClick={() => { setActiveTab('erd'); setCanvasSearch(n.data.name); setIsCommandPaletteOpen(false); }} className={`px-4 py-2 cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                            <div className="font-bold text-[13px]">🗄️ {n.data.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchFlows.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-1 text-[11px] font-black text-blue-500">시스템 흐름도</div>
                        {searchFlows.map(n => (
                          <div key={n.id} onClick={() => { setActiveTab('flow'); setCanvasSearch(n.data.label); setIsCommandPaletteOpen(false); }} className={`px-4 py-2 cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                            <div className="font-bold text-[13px]">🌐 {n.data.label}</div>
                            <div className="text-[11px] opacity-60 truncate mt-1">{n.data.techStack}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(searchReqs.length + searchApis.length + searchErds.length + searchFlows.length === 0) && (
                      <div className="p-8 text-center opacity-50 text-[13px]">일치하는 결과가 없습니다.</div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. 이전 버전으로 되돌리기 (History) 모달 */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-[500px] rounded-3xl shadow-2xl p-6 flex flex-col max-h-[70vh] ${panelClass}`}>
              <div className="flex justify-between items-center mb-6 border-b pb-4 dark:border-slate-700">
                <h3 className="text-lg font-black flex items-center gap-2"><VscHistory size={22} className="text-indigo-500"/> 버전 히스토리 (타임머신)</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {historyList.length === 0 ? (
                  <div className="py-10 text-center opacity-50">저장된 스냅샷(버전)이 없습니다.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {historyList.map(hist => (
                      <div key={hist.id} className={`p-4 rounded-xl border flex items-center justify-between group transition-colors cursor-pointer ${isDark ? 'bg-slate-800/50 hover:bg-slate-800 border-slate-700' : 'bg-slate-50 hover:bg-white border-slate-200'}`} onClick={() => restoreSnapshot(hist)}>
                        <div>
                          <div className="font-bold text-[13px] mb-1">{hist.label}</div>
                          <div className="text-[11px] opacity-60 flex items-center gap-1"><VscCheck size={12}/> {hist.timestamp}</div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[11px] font-bold text-indigo-500">복원하기</span>
                          <button onClick={(e) => deleteSnapshot(e, hist.id)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><VscTrash size={14}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTodoPanelOpen && (
          <motion.div initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 50, scale: 0.95 }} className={`fixed bottom-24 right-6 w-[340px] h-[450px] rounded-3xl shadow-2xl z-[9998] border backdrop-blur-xl flex flex-col overflow-hidden ${isDark ? 'bg-slate-800/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'}`}>
            <div className={`px-5 py-4 flex justify-between items-center border-b shrink-0 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <h3 className="font-black flex items-center gap-2 text-[15px]"><VscCheckAll size={18} className="text-indigo-500"/> 개인 작업 체크리스트</h3>
              <button onClick={() => setIsTodoPanelOpen(false)} className="text-slate-400 hover:text-red-500 bg-transparent transition-colors"><VscClose size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {todos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <VscNote size={40} className="mb-2" />
                  <p className="text-[12px] font-bold">아직 작성된 할 일이 없습니다.<br/>아이디어나 체크리스트를 메모하세요.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {todos.map(todo => (
                    <div key={todo.id} className={`flex items-start gap-3 p-3 rounded-xl border group transition-colors ${todo.done ? (isDark ? 'bg-slate-900 border-slate-800 opacity-50' : 'bg-slate-50 border-slate-100 opacity-50') : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')}`}>
                      <button onClick={() => toggleTodo(todo.id)} className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${todo.done ? 'bg-indigo-500 border-indigo-500 text-white' : (isDark ? 'border-slate-500 hover:border-indigo-400' : 'border-slate-300 hover:border-indigo-400')}`}>
                        {todo.done && <VscCheck size={12}/>}
                      </button>
                      <p className={`text-[13px] font-medium leading-tight flex-1 ${todo.done ? 'line-through' : ''}`}>{todo.text}</p>
                      <button onClick={() => deleteTodo(todo.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"><VscTrash size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <form onSubmit={addTodo} className={`p-3 border-t flex gap-2 shrink-0 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="할 일을 입력하세요..." className={`flex-1 bg-transparent border-none outline-none text-[13px] font-medium px-2 ${isDark ? 'text-white placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'}`} />
              <button type="submit" disabled={!newTodo.trim()} className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors shrink-0"><VscArrowUp size={16}/></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3">
        <button onClick={() => setIsTodoPanelOpen(!isTodoPanelOpen)} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 relative ${isTodoPanelOpen ? 'bg-indigo-600 text-white' : (isDark ? 'bg-slate-800 border border-slate-700 text-indigo-400 hover:bg-slate-700' : 'bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50')}`} title="개인 할 일 (To-Do)">
          <VscListSelection size={24} />
          {!isTodoPanelOpen && todos.filter(t => !t.done).length > 0 && (
            <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800">
              {todos.filter(t => !t.done).length}
            </span>
          )}
        </button>
        <button onClick={() => setIsHelpOpen(true)} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 ${isDark ? 'bg-slate-800 border border-slate-700 text-yellow-500 hover:bg-slate-700' : 'bg-white border border-slate-200 text-yellow-600 hover:bg-yellow-50'}`} title="스마트 가이드">
          <VscQuestion size={28} />
        </button>
      </div>

      <AnimatePresence>
        {isHelpOpen && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} className={`fixed bottom-24 right-24 w-[400px] p-6 rounded-3xl shadow-2xl z-[9999] border backdrop-blur-xl ${isDark ? 'bg-slate-800/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'}`}>
            <div className="flex justify-between items-start mb-5">
              <h3 className="font-black text-lg flex items-center gap-2"><VscLightbulb size={22} className="text-yellow-500"/> 스마트 퀵 가이드</h3>
              <button onClick={() => setIsHelpOpen(false)} className="text-slate-400 hover:text-red-500 bg-transparent transition-colors"><VscClose size={24}/></button>
            </div>
            
            <div className="flex flex-col gap-6 text-[13px] font-medium">
              
              {/* 섹션 1: 퀵 단축키 */}
              <div>
                <p className={`mb-2.5 font-black text-[14px] flex items-center gap-1.5 pb-2 border-b ${isDark ? 'text-indigo-400 border-slate-700' : 'text-indigo-500 border-slate-100'}`}><VscTools size={16}/> ⚡ 퀵 단축키</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <div className="flex justify-between items-center"><span className="text-slate-500">통합 검색</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700 text-indigo-300':'bg-white border-slate-200 text-indigo-600'}`}>Ctrl+K</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">탭내 검색</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>Ctrl+F</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">스냅샷 저장</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>Ctrl+S</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">모달 닫기</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>Esc</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">실행 취소</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>Ctrl+Z</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">다시 실행</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>Ctrl+Y</kbd></div>
                  <div className="col-span-2 flex justify-between items-center mt-0.5"><span className="text-slate-500">화면 탭 (1~4) 전환</span><kbd className={`px-1.5 py-0.5 rounded text-[11px] font-mono border shadow-sm ${isDark?'bg-slate-800 border-slate-700':'bg-white border-slate-200'}`}>Alt + Number</kbd></div>
                </div>
              </div>

              {/* 섹션 2: 꿀팁 */}
              <div>
                <p className={`mb-2.5 font-black text-[14px] flex items-center gap-1.5 pb-2 border-b ${isDark ? 'text-emerald-400 border-slate-700' : 'text-emerald-500 border-slate-100'}`}><VscTable size={16}/> 💾 데이터 연동 꿀팁</p>
                <ul className={`list-disc pl-4 space-y-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <li>엑셀(구글 시트)에서 복사 후 화면 빈 곳에서 <kbd className={`px-1 py-0.5 rounded text-[11px] font-mono border shadow-sm mx-0.5 ${isDark?'bg-slate-700 border-slate-600 text-white':'bg-white border-slate-200 text-black'}`}>Ctrl+V</kbd> 하시면 표가 자동 완성됩니다.</li>
                  <li>모든 표 데이터는 상단의 <b>CSV 추출</b> 버튼을 통해 다시 엑셀로 내보낼 수 있습니다.</li>
                </ul>
              </div>

              {/* 섹션 3: 자동화 */}
              <div>
                <p className={`mb-2.5 font-black text-[14px] flex items-center gap-1.5 pb-2 border-b ${isDark ? 'text-pink-400 border-slate-700' : 'text-pink-500 border-slate-100'}`}><VscWand size={16}/> 🚀 자동화 마법</p>
                <ul className={`list-disc pl-4 space-y-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <li>ERD 화면 빈 곳을 <b>우클릭</b>하고 <b>[🔥스니펫]</b>을 누르면 자주 쓰는 구조가 즉시 추가됩니다.</li>
                  <li>API 탭에서 <b>[ERD로 생성]</b>을 누르면 그려둔 테이블을 바탕으로 모든 CRUD 명세가 자동 작성됩니다.</li>
                  <li>API 탭 우측 끝의 <b>[테스트(JSON)]</b>을 누르면 가짜 Mock 응답 데이터를 바로 확인할 수 있습니다.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}