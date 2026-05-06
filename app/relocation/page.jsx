"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactFlow, { 
  MiniMap, Controls, Background, useNodesState, useEdgesState, addEdge, Handle, Position, useReactFlow, ReactFlowProvider, SelectionMode
} from "reactflow";
import "reactflow/dist/style.css";

// 아이콘 임포트
import {
  VscTrash, VscAdd, VscKey, VscCopy, VscClose, VscSave, VscFileMedia, VscLayout,
  VscServer, VscDatabase, VscGlobe, VscCloud, VscDesktopDownload, VscFolderOpened, VscMarkdown, VscSearch,
  VscArrowUp, VscArrowDown, VscGripper, VscHistory, VscDebugStepBack, VscWarning, VscSymbolColor, VscPulse,
  VscGoToFile, VscInfo, VscInbox, VscNote, VscCheckAll, VscCode, VscChevronDown, VscTools, VscFiles,
  VscDiscard, VscRedo
} from "react-icons/vsc";

import { v4 as uuidv4 } from "uuid";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { toPng } from "html-to-image";

import MenuBar from "@/components/ide/MenuBar";

const SAVE_KEY = "devw-architecture-pro-v28";
const HISTORY_KEY = "devw-architecture-history";

// ==========================================
// 🗄️ 1. ERD 테이블 커스텀 노드
// ==========================================
const TableNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();

  const updateName = (name) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, name } } : n));
  const addColumn = () => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: [...n.data.columns, { id: uuidv4(), name: 'new_column', type: 'VARCHAR', isPk: false, isFk: false }] } } : n));
  const updateColumn = (colId, field, value) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: n.data.columns.map((c) => c.id === colId ? { ...c, [field]: value } : c) } } : n));
  const deleteColumn = (colId) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, columns: n.data.columns.filter((c) => c.id !== colId) } } : n));
  const deleteTable = () => setNodes((nds) => nds.filter((n) => n.id !== id));

  const hasError = data.columns.length > 0 && !data.columns.some(c => c.isPk);

  return (
    <div className={`w-[280px] ${data.isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all duration-200 ${selected ? 'ring-4 ring-indigo-500/50 scale-[1.02] shadow-indigo-500/20' : 'hover:shadow-2xl'}`}>
      <Handle type="target" position={Position.Left} className="w-4 h-4 bg-indigo-500 border-2 border-white shadow-md" />
      <Handle type="source" position={Position.Right} className="w-4 h-4 bg-pink-500 border-2 border-white shadow-md" />

      <div className={`custom-drag-handle ${data.color || (data.isDark ? 'bg-slate-900' : 'bg-slate-800')} px-4 py-3 flex justify-between items-center cursor-move`}>
        <div className="flex items-center gap-2 w-full">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] shrink-0"></div>
          <input value={data.name} onChange={(e) => updateName(e.target.value)} className="nodrag bg-transparent text-white font-black text-[14px] outline-none w-full tracking-wider" placeholder="TABLE_NAME" />
          {hasError && <VscWarning className="text-yellow-400 shrink-0 drop-shadow-md" title="경고: 기본키(Primary Key)가 없습니다!" />}
        </div>
        <button onMouseDown={(e)=>e.stopPropagation()} onClick={deleteTable} className="nodrag text-white/40 hover:text-red-400 hover:bg-white/10 p-1.5 rounded-lg transition-all"><VscTrash size={16} /></button>
      </div>

      <div className={`flex flex-col ${data.isDark ? 'bg-slate-800' : 'bg-white'}`}>
        {data.columns.map((col) => (
          <div key={col.id} className={`flex items-center gap-2 px-3 py-1.5 border-b ${data.isDark ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-50 hover:bg-slate-50'} group transition-colors`}>
            <div className="flex gap-1 shrink-0 nodrag">
              <label className="flex items-center cursor-pointer text-[10px]" title="기본키 (PK)">
                <input type="checkbox" checked={col.isPk} onChange={(e) => updateColumn(col.id, 'isPk', e.target.checked)} className="hidden" />
                <div className={`p-1 rounded-md transition-all ${col.isPk ? 'bg-amber-100 text-amber-600 shadow-sm' : (data.isDark ? 'text-slate-500 hover:bg-slate-600' : 'text-slate-300 hover:bg-slate-200')}`}><VscKey size={14} /></div>
              </label>
              <label className="flex items-center cursor-pointer text-[10px]" title="외래키 (FK)">
                <input type="checkbox" checked={col.isFk} onChange={(e) => updateColumn(col.id, 'isFk', e.target.checked)} className="hidden" />
                <div className={`p-1 rounded-md transition-all ${col.isFk ? 'bg-blue-100 text-blue-600 shadow-sm' : (data.isDark ? 'text-slate-500 hover:bg-slate-600' : 'text-slate-300 hover:bg-slate-200')}`}><VscKey size={14} style={{ transform: 'rotate(180deg)' }} /></div>
              </label>
            </div>
            <input value={col.name} onChange={(e) => updateColumn(col.id, 'name', e.target.value)} className={`nodrag flex-1 text-[12px] font-bold bg-transparent outline-none min-w-0 ${data.isDark ? 'text-slate-200' : 'text-slate-700'}`} placeholder="column_name" />
            <select value={col.type} onChange={(e) => updateColumn(col.id, 'type', e.target.value)} className={`nodrag text-[10px] font-mono font-black border-none rounded-md px-1.5 py-1 outline-none w-[80px] shrink-0 cursor-pointer transition-colors ${data.isDark ? 'bg-slate-900 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <option>VARCHAR</option><option>INT</option><option>BIGINT</option><option>DATETIME</option><option>BOOLEAN</option><option>TEXT</option>
            </select>
            <button onClick={() => deleteColumn(col.id)} className="nodrag text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md"><VscTrash size={14} /></button>
          </div>
        ))}
        <button onClick={addColumn} className={`nodrag p-2.5 w-full text-center text-[12px] font-extrabold transition-colors flex items-center justify-center gap-1.5 ${data.isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 bg-slate-50/50 hover:bg-indigo-50 hover:text-indigo-600'}`}>
          <VscAdd size={14}/> 새 속성 추가
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 🌟 2. 시스템 데이터 플로우 커스텀 노드
// ==========================================
const SystemNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const updateLabel = (e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
  const deleteNode = () => setNodes((nds) => nds.filter((n) => n.id !== id));

  const getStyle = () => {
    if (data.color) return { bg: data.color, border: 'border-transparent', text: 'text-white', icon: <VscGlobe className="text-slate-800" size={20}/> };
    if (data.isDark) {
      switch(data.type) {
        case 'client': return { bg: 'bg-blue-900/40', border: 'border-blue-700', text: 'text-blue-200', icon: <VscGlobe className="text-blue-400" size={20}/> };
        case 'server': return { bg: 'bg-emerald-900/40', border: 'border-emerald-700', text: 'text-emerald-200', icon: <VscServer className="text-emerald-400" size={20}/> };
        case 'db': return { bg: 'bg-orange-900/40', border: 'border-orange-700', text: 'text-orange-200', icon: <VscDatabase className="text-orange-400" size={20}/> };
        case 'cloud': return { bg: 'bg-purple-900/40', border: 'border-purple-700', text: 'text-purple-200', icon: <VscCloud className="text-purple-400" size={20}/> };
        default: return { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-200', icon: <VscAdd size={20}/> };
      }
    } else {
      switch(data.type) {
        case 'client': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', icon: <VscGlobe className="text-blue-600" size={20}/> };
        case 'server': return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: <VscServer className="text-emerald-600" size={20}/> };
        case 'db': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', icon: <VscDatabase className="text-orange-600" size={20}/> };
        case 'cloud': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900', icon: <VscCloud className="text-purple-600" size={20}/> };
        default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', icon: <VscAdd size={20}/> };
      }
    }
  };
  const style = getStyle();

  return (
    <div className={`relative min-w-[180px] px-4 py-3 flex items-center gap-3 rounded-2xl border-2 ${style.bg} ${style.border} shadow-lg transition-all duration-200 ${selected ? 'ring-4 ring-indigo-500/50 scale-[1.05] shadow-indigo-500/40' : 'hover:shadow-xl'}`}>
      <Handle type="target" position={Position.Top} id="top-t" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Bottom} id="bottom-s" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />
      <Handle type="target" position={Position.Left} id="left-t" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />
      <Handle type="source" position={Position.Right} id="right-s" className="w-3 h-3 bg-slate-400 border-2 border-white shadow-sm" />

      <div className={`p-2 rounded-xl shadow-sm shrink-0 ${data.color ? 'bg-white/90' : (data.isDark ? 'bg-slate-800' : 'bg-white')}`}>{style.icon}</div>
      <input value={data.label} onChange={updateLabel} className={`nodrag bg-transparent font-black text-[14px] outline-none w-full ${style.text}`} placeholder="컴포넌트 이름" />
      
      <button onClick={deleteNode} className="nodrag absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-red-600 hover:scale-110"><VscTrash size={14} /></button>
    </div>
  );
};

// ==========================================
// 📌 3. 포스트잇 (Sticky Note) 커스텀 노드
// ==========================================
const StickyNode = ({ id, data, selected }) => {
  const { setNodes } = useReactFlow();
  const updateText = (e) => setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, text: e.target.value } } : n));
  const deleteNode = () => setNodes((nds) => nds.filter((n) => n.id !== id));

  const bgColor = data.color || (data.isDark ? '#b45309' : '#fef08a');
  const textColor = data.isDark ? 'text-white' : 'text-slate-800';

  return (
    <div className={`w-[220px] h-[220px] flex flex-col shadow-lg transition-all duration-200 ${selected ? 'ring-4 ring-yellow-400/50 scale-[1.02]' : 'hover:shadow-xl'}`} style={{ backgroundColor: bgColor, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' }}>
      <div className="custom-drag-handle h-8 w-full cursor-move bg-black/10 flex justify-between items-center px-2">
        <VscNote className="text-black/30 ml-1" size={14}/>
        <button onMouseDown={(e)=>e.stopPropagation()} onClick={deleteNode} className="nodrag text-black/40 hover:text-red-600 hover:bg-white/20 p-1 rounded transition-colors"><VscTrash size={14}/></button>
      </div>
      <textarea className={`nodrag w-full flex-1 bg-transparent resize-none outline-none p-3 text-[13px] font-medium leading-relaxed ${textColor}`} value={data.text} onChange={updateText} placeholder="메모나 주석을 자유롭게 남겨보세요..." />
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

  // 플로우/ERD 상태
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState([{ id: 'f1', type: 'systemNode', position: { x: 100, y: 200 }, data: { label: 'Web Browser', type: 'client', isDark } }, { id: 'f2', type: 'systemNode', position: { x: 500, y: 200 }, data: { label: 'Spring Boot API', type: 'server', isDark } }]);
  const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState([{ id: 'e1-2', source: 'f1', target: 'f2', sourceHandle: 'right-s', targetHandle: 'left-t', label: 'REST API 요청', animated: true, type: 'smoothstep', style: { stroke: '#6366f1', strokeWidth: 2 } }]);
  const flowNodeTypes = useMemo(() => ({ systemNode: SystemNode, stickyNode: StickyNode }), []);

  const [erdNodes, setErdNodes, onErdNodesChange] = useNodesState([{ id: 'table-1', type: 'tableNode', position: { x: 100, y: 100 }, dragHandle: '.custom-drag-handle', data: { name: 'USER', columns: [{ id: uuidv4(), name: 'id', type: 'INT', isPk: true, isFk: false }], isDark } }]);
  const [erdEdges, setErdEdges, onErdEdgesChange] = useEdgesState([]);
  const erdNodeTypes = useMemo(() => ({ tableNode: TableNode, stickyNode: StickyNode }), []);
  
  const [requirements, setRequirements] = useState([{ id: uuidv4(), category: '에디터', name: '실시간 동시편집', desc: '웹소켓을 활용한 딜레이 없는 코드 에디팅', note: '핵심' }]);
  const [apiSpecs, setApiSpecs] = useState([{ id: uuidv4(), method: 'GET', endpoint: '/api/workspace', desc: '워크스페이스 목록 조회' }]);

  // Undo / Redo 상태 관리
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // 모달 상태
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [generatedSql, setGeneratedSql] = useState('');
  const [isSqlImportModalOpen, setIsSqlImportModalOpen] = useState(false);
  const [sqlImportText, setSqlImportText] = useState('');
  const [isLinterModalOpen, setIsLinterModalOpen] = useState(false);
  const [linterIssues, setLinterIssues] = useState([]);
  const [isJavaModalOpen, setIsJavaModalOpen] = useState(false);
  const [javaFiles, setJavaFiles] = useState([]);
  const [selectedJavaIndex, setSelectedJavaIndex] = useState(0);

  const [reqSearch, setReqSearch] = useState('');
  const [apiSearch, setApiSearch] = useState('');
  const [canvasSearch, setCanvasSearch] = useState('');
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [newReq, setNewReq] = useState({ category: '', name: '', desc: '', note: '' });
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [newApi, setNewApi] = useState({ method: 'GET', endpoint: '', desc: '' });
  const [insertTarget, setInsertTarget] = useState(null); 
  const [contextMenu, setContextMenu] = useState(null);
  const [edgeStyle, setEdgeStyle] = useState('smoothstep');

  const getSnapshot = useCallback(() => JSON.stringify({ requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges }), [requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges]);

  // Undo/Redo 기록
  const recordHistory = useCallback(() => {
    setPast(p => [...p, getSnapshot()].slice(-50));
    setFuture([]);
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

  const saveSnapshot = useCallback((label = '수동 저장') => {
    const snapshot = {
      id: uuidv4(),
      timestamp: new Date().toLocaleString(),
      label,
      data: { requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges }
    };
    setHistoryList(prev => [snapshot, ...prev].slice(0, 20)); 
    toast.success(`'${label}'(으)로 스냅샷 저장 완료!`, { icon: '📸' });
  }, [requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges]);

  const restoreSnapshot = (snapshot) => {
    if(!window.confirm(`'${snapshot.label}'(${snapshot.timestamp}) 상태로 되돌리시겠습니까? 현재 작업 내역은 덮어씌워집니다.`)) return;
    recordHistory(); 
    setRequirements(snapshot.data.requirements); setApiSpecs(snapshot.data.apiSpecs); setErdNodes(snapshot.data.erdNodes); setErdEdges(snapshot.data.erdEdges); setFlowNodes(snapshot.data.flowNodes); setFlowEdges(snapshot.data.flowEdges); setIsHistoryModalOpen(false);
    toast.success('버전 복구가 완료되었습니다.', { icon: '⏪' });
  };

  const deleteSnapshot = (e, id) => {
    e.stopPropagation();
    setHistoryList(prev => prev.filter(h => h.id !== id));
  };

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
    if (savedHistory) {
      try { setHistoryList(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, [setFlowNodes, setFlowEdges, setErdNodes, setErdEdges]);

  useEffect(() => { localStorage.setItem(SAVE_KEY, getSnapshot()); }, [getSnapshot]);
  useEffect(() => { localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList)); }, [historyList]);

  useEffect(() => {
    const closeMenu = () => { setContextMenu(null); setOpenMenu(null); };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveSnapshot('단축키(Ctrl+S) 저장'); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); handleRedo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, saveSnapshot]);

  // ----------------------------------------------------
  // 무결성 검사 대시보드
  // ----------------------------------------------------
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

    setLinterIssues(issues);
    setIsLinterModalOpen(true);
    if (issues.length === 0) toast.success("모든 설계가 완벽합니다!", { icon: '✅' });
  };

  // ----------------------------------------------------
  // Spring Boot Java 코드 자동 생성
  // ----------------------------------------------------
  const handleGenerateJavaCode = () => {
    const files = [];
    erdNodes.filter(n => n.type === 'tableNode').forEach(n => {
      const className = n.data.name.charAt(0).toUpperCase() + n.data.name.slice(1).toLowerCase();
      let code = `package com.project.domain;\n\nimport jakarta.persistence.*;\nimport lombok.*;\n\n@Entity\n@Getter\n@Setter\n@NoArgsConstructor\n@Table(name="${n.data.name}")\npublic class ${className} {\n\n`;
      n.data.columns.forEach(c => {
        if(c.isPk) code += `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n`;
        let javaType = 'String';
        if(c.type.includes('INT')) javaType = c.type === 'BIGINT' ? 'Long' : 'Integer';
        if(c.type.includes('BOOLEAN')) javaType = 'Boolean';
        if(c.type.includes('DATETIME')) javaType = 'java.time.LocalDateTime';
        code += `    private ${javaType} ${c.name.toLowerCase()};\n\n`;
      });
      code += `}\n`;
      files.push({ filename: `domain/${className}.java`, code });
    });

    const apiGroups = {};
    apiSpecs.forEach(api => {
      if(!api.endpoint) return;
      const root = api.endpoint.split('/')[1] || 'common';
      if(!apiGroups[root]) apiGroups[root] = [];
      apiGroups[root].push(api);
    });

    Object.keys(apiGroups).forEach(root => {
      const className = root.charAt(0).toUpperCase() + root.slice(1) + 'Controller';
      let code = `package com.project.controller;\n\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.http.ResponseEntity;\n\n@RestController\n@RequestMapping("/${root}")\npublic class ${className} {\n\n`;
      apiGroups[root].forEach((api, idx) => {
        const methodAnnotation = `@${api.method.charAt(0).toUpperCase() + api.method.slice(1).toLowerCase()}Mapping`;
        const path = api.endpoint.replace(`/${root}`, '');
        const methodName = `${api.method.toLowerCase()}${root.charAt(0).toUpperCase() + root.slice(1)}${idx}`;
        code += `    // ${api.desc}\n`;
        code += `    ${methodAnnotation}("${path}")\n`;
        code += `    public ResponseEntity<?> ${methodName}() {\n`;
        code += `        return ResponseEntity.ok().build();\n`;
        code += `    }\n\n`;
      });
      code += `}\n`;
      files.push({ filename: `controller/${className}.java`, code });
    });

    if (files.length === 0) return toast.error("생성할 테이블이나 API 명세가 없습니다.");
    setJavaFiles(files); setSelectedJavaIndex(0); setIsJavaModalOpen(true);
  };

  const copyJavaCode = () => {
    navigator.clipboard.writeText(javaFiles[selectedJavaIndex].code);
    toast.success(`${javaFiles[selectedJavaIndex].filename} 복사 완료!`);
  };

  // ----------------------------------------------------
  // 💡 직관적인 이름으로 개편된 추출 기능들
  // ----------------------------------------------------
  const handleImportSQL = () => {
    if(!sqlImportText.trim()) return toast.error("SQL 문을 입력해주세요.");
    recordHistory();
    try {
      const tableRegex = /CREATE\s+TABLE\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;
      let match; const newNodes = []; let x = 100, y = 100, count = 0;
      while ((match = tableRegex.exec(sqlImportText)) !== null) {
        const tableName = match[1]; const colsStr = match[2];
        const colLines = colsStr.split(',').map(l => l.trim()).filter(l => l);
        const columns = [];
        colLines.forEach(line => {
           const parts = line.split(/\s+/);
           if (parts.length >= 2 && !line.toUpperCase().includes('PRIMARY KEY (') && !line.toUpperCase().includes('FOREIGN KEY')) {
               const isPk = line.toUpperCase().includes('PRIMARY KEY');
               columns.push({ id: uuidv4(), name: parts[0], type: parts[1].replace(/\([0-9]+\)/, ''), isPk, isFk: false });
           }
        });
        newNodes.push({ id: uuidv4(), type: 'tableNode', position: { x, y }, dragHandle: '.custom-drag-handle', data: { name: tableName, columns, isDark } });
        x += 320; if(x > 1000) { x = 100; y += 280; }
        count++;
      }
      if(count === 0) throw new Error("분석 가능한 문장이 없습니다.");
      setErdNodes(prev => [...prev, ...newNodes]); setIsSqlImportModalOpen(false); setSqlImportText('');
      toast.success(`${count}개의 테이블 생성 완료!`, { icon: '🧙‍♂️' });
    } catch (e) { toast.error("SQL 파싱 실패: " + e.message); }
  };

  // 💡 명칭 변경: Swagger -> 표준 API 규약(JSON)
  const handleExportApiJson = () => {
    const paths = {};
    apiSpecs.forEach(api => {
       if(!api.endpoint) return;
       const ep = api.endpoint.startsWith('/') ? api.endpoint : `/${api.endpoint}`;
       if(!paths[ep]) paths[ep] = {};
       paths[ep][api.method.toLowerCase()] = { summary: api.desc || "No description", responses: { '200': { description: 'Successful response' } } };
    });
    const swagger = { openapi: '3.0.0', info: { title: 'Auto-generated API', version: '1.0.0' }, paths };
    const blob = new Blob([JSON.stringify(swagger, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `api-standard-spec-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success("API 표준 문서(Swagger) 다운로드 완료", { icon: '🚀' });
  };

  // 💡 명칭 변경: Mermaid -> 다이어그램 텍스트 변환
  const handleExportDiagramText = (type) => {
    let md = '';
    if (type === 'erd') {
      md += 'erDiagram\n';
      erdNodes.filter(n=>n.type==='tableNode').forEach(n => {
        md += `  ${n.data.name} {\n`;
        n.data.columns.forEach(c => { md += `    ${c.type} ${c.name} ${c.isPk?'PK':''}\n`; });
        md += `  }\n`;
      });
      erdEdges.forEach(e => {
        const src = erdNodes.find(n => n.id === e.source)?.data?.name;
        const tgt = erdNodes.find(n => n.id === e.target)?.data?.name;
        if(src && tgt) md += `  ${src} ||--o{ ${tgt} : "${e.label||'relates'}"\n`;
      });
    } else {
      md += 'graph TD\n';
      flowNodes.filter(n=>n.type==='systemNode').forEach(n => { md += `  ${n.id}[${n.data.label}]\n`; });
      flowEdges.forEach(e => { md += `  ${e.source} -->|${e.label||''}| ${e.target}\n`; });
    }
    const blob = new Blob([md], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `diagram-code-${type}-${Date.now()}.txt`; a.click(); URL.revokeObjectURL(url);
    toast.success("다이어그램 텍스트 코드(Mermaid) 변환 완료", { icon: '📝' });
  };

  const changeNodeColor = (nodeId, color, isErd = true) => {
    recordHistory();
    const setNodesFunc = isErd ? setErdNodes : setFlowNodes;
    setNodesFunc(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, color } } : n));
    setContextMenu(null);
  };

  const handlePasteRequirements = (e) => {
    const pasteData = e.clipboardData.getData('text/plain'); if (!pasteData) return;
    const rows = pasteData.split('\n').filter(r => r.trim() !== '');
    if (rows.length > 0 && rows[0].includes('\t')) {
      e.preventDefault(); recordHistory();
      const newItems = rows.map(row => {
        const cols = row.split('\t'); return { id: uuidv4(), category: cols[0]||'', name: cols[1]||'', desc: cols[2]||'', note: cols[3]||'' };
      });
      setRequirements(prev => [...prev, ...newItems]); toast.success(`${newItems.length}개의 엑셀 데이터를 붙여넣었습니다!`, { icon: '📋' });
    }
  };

  const handlePasteApi = (e) => {
    const pasteData = e.clipboardData.getData('text/plain'); if (!pasteData) return;
    const rows = pasteData.split('\n').filter(r => r.trim() !== '');
    if (rows.length > 0 && rows[0].includes('\t')) {
      e.preventDefault(); recordHistory();
      const newItems = rows.map(row => {
        const cols = row.split('\t'); let method = cols[0]?.toUpperCase() || 'GET'; if(!['GET','POST','PUT','DELETE'].includes(method)) method = 'GET';
        return { id: uuidv4(), method, endpoint: cols[1]||'', desc: cols[2]||'' };
      });
      setApiSpecs(prev => [...prev, ...newItems]); toast.success(`${newItems.length}개의 엑셀 데이터를 붙여넣었습니다!`, { icon: '📋' });
    }
  };

  const onFlowConnect = useCallback((params) => {
    recordHistory(); const label = window.prompt("연결 선의 설명(라벨)을 입력하세요.", "요청");
    setFlowEdges((eds) => addEdge({ ...params, label, animated: true, type: edgeStyle, style: { stroke: isDark ? '#818cf8' : '#6366f1', strokeWidth: 2 }, labelStyle: { fill: isDark ? '#fff' : '#1e293b', fontWeight: 700, fontSize: 12 } }, eds));
  }, [setFlowEdges, edgeStyle, isDark, recordHistory]);

  const onErdConnect = useCallback((params) => {
    recordHistory(); setErdEdges((eds) => addEdge({ ...params, type: edgeStyle, animated: true, style: { stroke: isDark ? '#94a3b8' : '#94a3b8', strokeWidth: 2 } }, eds));
  }, [setErdEdges, edgeStyle, isDark, recordHistory]);

  const onEdgeDoubleClick = (e, edge, setEdgesFunc) => { e.stopPropagation(); recordHistory(); if(window.confirm('삭제하시겠습니까?')) setEdgesFunc((eds) => eds.filter((ed) => ed.id !== edge.id)); };
  const handleRightClick = (e, type, targetId = null) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, type, targetId }); };

  const moveItem = (listType, id, direction) => {
    recordHistory(); const isReq = listType === 'req'; const list = isReq ? requirements : apiSpecs; const setList = isReq ? setRequirements : setApiSpecs;
    const idx = list.findIndex(item => item.id === id); if (idx < 0) return;
    const newList = [...list];
    if (direction === 'up' && idx > 0) { [newList[idx - 1], newList[idx]] = [newList[idx], newList[idx - 1]]; setList(newList); } 
    else if (direction === 'down' && idx < list.length - 1) { [newList[idx], newList[idx + 1]] = [newList[idx + 1], newList[idx]]; setList(newList); }
    setContextMenu(null);
  };

  const handleAddFlowNode = (type) => { recordHistory(); setFlowNodes(nds => [...nds, { id: uuidv4(), type: 'systemNode', position: { x: 100 + (nds.length*30)%300, y: 100 + (nds.length*30)%300 }, data: { label: 'New Component', type, isDark } }]); };
  const handleAddStickyNode = (isErd = true) => { recordHistory(); const setNodesFunc = isErd ? setErdNodes : setFlowNodes; setNodesFunc(nds => [...nds, { id: uuidv4(), type: 'stickyNode', position: { x: 100 + (nds.length*30)%300, y: 100 + (nds.length*30)%300 }, data: { text: '', isDark } }]); };
  const handleAutoLayoutFlow = () => { recordHistory(); setFlowNodes(nds => nds.map((node, i) => ({ ...node, position: { x: (i % 4) * 300 + 100, y: Math.floor(i / 4) * 200 + 100 } }))); toast.success('자동 정렬 완료'); };
  const duplicateFlowNode = (nodeId) => { recordHistory(); const target = flowNodes.find(n => n.id === nodeId); if (target) { setFlowNodes(nds => [...nds, { ...target, id: uuidv4(), position: { x: target.position.x + 30, y: target.position.y + 30 } }]); } };
  
  const handleAddTable = () => { recordHistory(); setErdNodes(nds => [...nds, { id: uuidv4(), type: 'tableNode', position: { x: 100, y: 100 }, dragHandle: '.custom-drag-handle', data: { name: 'NEW_TABLE', columns: [], isDark } }]); };
  const handleAutoLayoutERD = () => { recordHistory(); setErdNodes(nds => nds.map((node, i) => ({ ...node, position: { x: (i % 3) * 350 + 100, y: Math.floor(i / 3) * 300 + 100 } }))); toast.success('자동 정렬 완료'); };
  const duplicateTable = (nodeId) => { recordHistory(); const target = erdNodes.find(n => n.id === nodeId); if (target) { setErdNodes(nds => [...nds, { ...target, id: uuidv4(), position: { x: target.position.x + 30, y: target.position.y + 30 }, data: { ...target.data, name: `${target.data.name}_COPY`, columns: target.data?.columns?.map(c => ({...c, id: uuidv4()})) || [] } }]); } };

  const handleExportImage = (className) => {
    const el = document.querySelector(className); if (!el) return; toast.loading('이미지 추출 중...', { id: 'img' });
    toPng(el, { backgroundColor: isDark ? '#0f172a' : '#f8fafc' }).then((dataUrl) => {
      const a = document.createElement('a'); a.download = `architecture.png`; a.href = dataUrl; a.click(); toast.success('저장 완료', { id: 'img' });
    }).catch(() => toast.error('실패', { id: 'img' }));
  };

  const handleExportSql = () => {
    let sql = `-- Devw ERD Generated SQL\n-- Date: ${new Date().toLocaleString()}\n\n`;
    erdNodes.filter(n=>n.type==='tableNode').forEach(node => {
      sql += `CREATE TABLE ${node.data.name} (\n`;
      const cols = node.data.columns.map((c) => { let line = `  ${c.name} ${c.type}`; if (c.isPk) line += ` PRIMARY KEY`; return line; });
      sql += cols.join(',\n'); sql += `\n);\n\n`;
    });
    setGeneratedSql(sql); setShowSqlModal(true);
  };
  const copySql = () => { navigator.clipboard.writeText(generatedSql); toast.success('SQL 복사 완료!'); setShowSqlModal(false); };

  const updateReq = (id, field, value) => { recordHistory(); setRequirements(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r)); };
  const updateApi = (id, field, value) => { recordHistory(); setApiSpecs(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a)); };

  const handleAddReq = () => {
    recordHistory(); const newItem = { ...newReq, id: uuidv4() };
    if (insertTarget?.type === 'req') { const idx = requirements.findIndex(r => r.id === insertTarget.id); const arr = [...requirements]; arr.splice(idx + 1, 0, newItem); setRequirements(arr); } else { setRequirements([...requirements, newItem]); }
    setNewReq({ category: '', name: '', desc: '', note: '' }); setIsReqModalOpen(false); setInsertTarget(null); toast.success('추가됨');
  };
  const handleDeleteReq = (id) => { recordHistory(); setRequirements(prev => prev.filter(r => r.id !== id)); toast.error('삭제됨'); };

  const handleAddApi = () => {
    recordHistory(); const newItem = { ...newApi, id: uuidv4() };
    if (insertTarget?.type === 'api') { const idx = apiSpecs.findIndex(a => a.id === insertTarget.id); const arr = [...apiSpecs]; arr.splice(idx + 1, 0, newItem); setApiSpecs(arr); } else { setApiSpecs([...apiSpecs, newItem]); }
    setNewApi({ method: 'GET', endpoint: '', desc: '' }); setIsApiModalOpen(false); setInsertTarget(null); toast.success('추가됨');
  };
  const handleDeleteApi = (id) => { recordHistory(); setApiSpecs(prev => prev.filter(a => a.id !== id)); toast.error('삭제됨'); };

  const filteredReqs = requirements.filter(r => r.name.includes(reqSearch) || r.desc.includes(reqSearch) || r.category.includes(reqSearch));
  const filteredApis = apiSpecs.filter(a => a.endpoint.includes(apiSearch) || a.desc.includes(apiSearch));

  useEffect(() => { setFlowEdges(eds => eds.map(e => ({ ...e, type: edgeStyle }))); setErdEdges(eds => eds.map(e => ({ ...e, type: edgeStyle }))); }, [edgeStyle, setFlowEdges, setErdEdges]);

  // 다크모드 메인 래퍼 스타일
  const wrapperClass = isDark ? "bg-[#0f172a] text-slate-100" : "bg-[#f1f5f9] text-slate-900";
  const panelClass = isDark ? "bg-[#1e293b] border-slate-700 shadow-2xl" : "bg-white border-slate-200 shadow-xl";
  const tableHeadClass = isDark ? "bg-slate-800/80 border-slate-700 text-slate-300 backdrop-blur-md" : "bg-slate-50/80 border-slate-200 text-slate-600 backdrop-blur-md";
  const tableRowClass = isDark ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-100 hover:bg-indigo-50/30";
  const inputClass = isDark ? "focus:bg-slate-800 focus:ring-indigo-500 text-slate-200" : "focus:bg-white focus:ring-indigo-400 text-slate-800";

  const handleImportProject = (e) => {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.requirements) setRequirements(parsed.requirements); if (parsed.apiSpecs) setApiSpecs(parsed.apiSpecs); if (parsed.erdNodes) setErdNodes(parsed.erdNodes); if (parsed.erdEdges) setErdEdges(parsed.erdEdges); if (parsed.flowNodes) setFlowNodes(parsed.flowNodes); if (parsed.flowEdges) setFlowEdges(parsed.flowEdges);
        toast.success("프로젝트를 불러왔습니다.");
      } catch (err) { toast.error("잘못된 형식의 파일입니다."); }
    }; reader.readAsText(file); e.target.value = ''; 
  };
  
  const handleExportMarkdown = (type) => {
    let mdContent = "";
    if (type === 'req') { mdContent = "# 요구사항 명세서\n\n| 구분 | 기능명 | 세부 명세 | 비고 |\n|---|---|---|---|\n"; requirements.forEach(req => { mdContent += `| ${req.category} | **${req.name}** | ${req.desc} | ${req.note} |\n`; }); } 
    else { mdContent = "# API 명세서\n\n| Method | Endpoint URL | Description |\n|---|---|---|\n"; apiSpecs.forEach(api => { mdContent += `| \`${api.method}\` | **${api.endpoint}** | ${api.desc} |\n`; }); }
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${type}-${Date.now()}.md`; a.click(); URL.revokeObjectURL(url);
    toast.success("마크다운 파일로 추출 완료");
  };
  
  const handleExportProject = () => {
    const blob = new Blob([JSON.stringify({ requirements, apiSpecs, erdNodes, erdEdges, flowNodes, flowEdges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `architecture-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success("전체 프로젝트가 백업 파일로 저장되었습니다.");
  };

  const renderTabs = () => (
    <div className={`inline-flex p-1.5 rounded-xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'} backdrop-blur-sm z-10 m-4`}>
      {[{ id: 'requirements', label: '요구사항' }, { id: 'erd', label: 'ERD 설계' }, { id: 'flow', label: '시스템 구조' }, { id: 'api', label: 'API 명세' }].map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative px-6 py-2.5 text-[14px] font-bold rounded-lg transition-all outline-none whitespace-nowrap ${activeTab === tab.id ? (isDark ? 'text-white shadow-lg' : 'text-slate-800 shadow-md') : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
          {activeTab === tab.id && <motion.div layoutId="pillTab" className={`absolute inset-0 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-white'}`} style={{ zIndex: -1 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
          {tab.label}
        </button>
      ))}
    </div>
  );

  const EmptyState = ({ type }) => (
    <div className="flex flex-col items-center justify-center h-full w-full opacity-60">
      <VscInbox size={64} className={`mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
      <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>아직 작성된 {type}가 없습니다.</h3>
      <p className={`text-[14px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>우클릭하여 추가하거나, 엑셀 복사/붙여넣기(Ctrl+V)를 통해 시작해보세요.</p>
    </div>
  );

  return (
    <div className={`w-screen h-screen flex flex-col font-sans overflow-hidden transition-colors duration-300 ${wrapperClass}`}>
      <Toaster position="top-center" toastOptions={{ duration: 2500, style: { fontWeight: 'bold', fontSize: '13px', borderRadius: '12px', background: isDark ? '#1e293b' : '#fff', color: isDark ? '#fff' : '#000' } }} />
      <MenuBar /> 

      {/* 우클릭 메뉴 */}
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
                <button onClick={() => { setInsertTarget({type: 'req', id: contextMenu.targetId}); setIsReqModalOpen(true); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-emerald-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-emerald-500/20':'hover:bg-emerald-50'}`}><VscAdd size={16}/> 아래에 새 항목 삽입</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { handleDeleteReq(contextMenu.targetId); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-red-500/20':'hover:bg-red-50'}`}><VscTrash size={16}/> 항목 삭제</button>
              </>
            )}
            {contextMenu.type === 'api' && contextMenu.targetId && (
              <>
                <button onClick={() => moveItem('api', contextMenu.targetId, 'up')} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-100 text-slate-800'}`}><VscArrowUp size={16}/> 위로 이동</button>
                <button onClick={() => moveItem('api', contextMenu.targetId, 'down')} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark?'hover:bg-slate-700 text-slate-200':'hover:bg-slate-100 text-slate-800'}`}><VscArrowDown size={16}/> 아래로 이동</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { setInsertTarget({type: 'api', id: contextMenu.targetId}); setIsApiModalOpen(true); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-emerald-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-emerald-500/20':'hover:bg-emerald-50'}`}><VscAdd size={16}/> 아래에 새 API 삽입</button>
                <div className={`h-px my-1 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}></div>
                <button onClick={() => { handleDeleteApi(contextMenu.targetId); setContextMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[13px] font-bold text-red-500 flex items-center gap-2 transition-colors ${isDark?'hover:bg-red-500/20':'hover:bg-red-50'}`}><VscTrash size={16}/> API 삭제</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 히스토리 모달 */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[600px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="font-black text-lg flex items-center gap-2"><VscHistory size={22} className="text-indigo-500"/> 스냅샷 히스토리 (버전 관리)</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className={`p-6 flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                {historyList.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <VscHistory size={48} className="text-slate-300 mb-4"/>
                    <p className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>저장된 히스토리가 없습니다.<br/>도구 메뉴의 '스냅샷 저장'을 이용해보세요.</p>
                  </div>
                ) : (
                  historyList.map((hist, idx) => (
                    <div key={hist.id} className={`p-4 rounded-xl flex items-center justify-between border transition-all group ${isDark ? 'bg-slate-800 border-slate-700 hover:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-400'}`}>
                      <div>
                        <h4 className="font-bold text-[14px] mb-1 flex items-center gap-2">
                          {hist.label} 
                          {idx === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">최신</span>}
                        </h4>
                        <p className={`text-[12px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{hist.timestamp}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => deleteSnapshot(e, hist.id)} className="px-3 py-1.5 text-[12px] font-bold text-red-500 hover:bg-red-50 rounded-lg">삭제</button>
                        <button onClick={() => restoreSnapshot(hist)} className="px-3 py-1.5 text-[12px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 shadow-md"><VscDebugStepBack/> 이 버전으로 복구</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL Import 모달 (명칭 직관화) */}
      <AnimatePresence>
        {isSqlImportModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[600px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="font-black text-lg flex items-center gap-2"><VscDatabase size={22} className="text-indigo-500"/> SQL 코드로 테이블 그리기</h3>
                <button onClick={() => setIsSqlImportModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className="p-6 flex flex-col gap-3">
                <p className={`text-[13px] font-medium flex items-center gap-2 ${isDark?'text-slate-400':'text-slate-500'}`}><VscInfo className="text-blue-500"/> <code>CREATE TABLE</code> 형식의 SQL 코드를 붙여넣으면 표로 만들어 줍니다.</p>
                <textarea value={sqlImportText} onChange={e=>setSqlImportText(e.target.value)} placeholder="CREATE TABLE users ( id INT PRIMARY KEY, name VARCHAR );" className={`w-full h-[240px] p-4 text-[13px] font-mono outline-none resize-none rounded-xl border-2 transition-colors ${isDark ? 'bg-slate-900 border-slate-700 focus:border-indigo-500 text-emerald-400' : 'bg-white border-slate-200 focus:border-indigo-400 text-slate-800'}`} />
              </div>
              <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}>
                <button onClick={() => setIsSqlImportModalOpen(false)} className="px-5 py-2 rounded-xl font-bold text-[14px] text-slate-500 hover:bg-slate-200/50 transition-colors">취소</button>
                <button onClick={handleImportSQL} className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-[14px] transition-colors">자동 완성하기 🪄</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL Export 모달 */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[600px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="font-black text-lg flex items-center gap-2"><VscSave size={22} className="text-indigo-500"/> 변환된 SQL 쿼리</h3>
                <button onClick={() => setShowSqlModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <textarea readOnly value={generatedSql} className={`w-full h-[350px] p-6 text-emerald-400 font-mono text-[13px] outline-none resize-none custom-scrollbar ${isDark ? 'bg-slate-900' : 'bg-slate-900'}`} />
              <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`}>
                <button onClick={() => setShowSqlModal(false)} className="px-5 py-2 rounded-xl font-bold text-[14px] text-slate-500 hover:bg-slate-200/50 transition-colors">닫기</button>
                <button onClick={copySql} className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 text-[14px] transition-colors">복사하기</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Linter (무결성 검사) 모달 */}
      <AnimatePresence>
        {isLinterModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[600px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="font-black text-lg flex items-center gap-2"><VscCheckAll size={22} className="text-emerald-500"/> 아키텍처 무결성 검사 리포트</h3>
                <button onClick={() => setIsLinterModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className={`p-6 flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                {linterIssues.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center">
                    <VscCheckAll size={48} className="text-emerald-400 mb-4"/>
                    <p className={`font-bold text-[15px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>누락된 정보나 연결 오류가 없습니다. 완벽합니다!</p>
                  </div>
                ) : (
                  linterIssues.map((issue, idx) => (
                    <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border ${issue.type === 'error' ? (isDark ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200') : (isDark ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200')}`}>
                      {issue.type === 'error' ? <VscWarning size={20} className="text-red-500 shrink-0 mt-0.5"/> : <VscInfo size={20} className="text-yellow-500 shrink-0 mt-0.5"/>}
                      <div>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md mb-1.5 inline-block ${issue.type === 'error' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'}`}>{issue.tab}</span>
                        <p className={`text-[13px] font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{issue.msg}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Java Code 프리뷰 모달 */}
      <AnimatePresence>
        {isJavaModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className={`w-[900px] h-[650px] rounded-3xl shadow-2xl overflow-hidden flex flex-col ${panelClass}`}>
              <div className={`px-6 py-5 border-b flex justify-between items-center shrink-0 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <h3 className="font-black text-lg flex items-center gap-2"><VscCode size={22} className="text-indigo-500"/> Spring Boot 소스코드 생성기</h3>
                <button onClick={() => setIsJavaModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><VscClose size={24}/></button>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className={`w-64 border-r overflow-y-auto p-3 flex flex-col gap-1 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <p className={`text-[11px] font-bold mb-2 px-2 pt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>생성된 Java 파일 목록</p>
                  {javaFiles.map((file, idx) => (
                    <button key={idx} onClick={() => setSelectedJavaIndex(idx)} className={`text-left px-3 py-2 rounded-lg text-[13px] font-mono transition-colors truncate ${selectedJavaIndex === idx ? 'bg-indigo-500 text-white font-bold shadow-md' : (isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-white')}`}>
                      {file.filename}
                    </button>
                  ))}
                </div>
                <div className={`flex-1 relative flex flex-col ${isDark ? 'bg-[#0d1117]' : 'bg-[#1e1e1e]'}`}>
                  <div className="absolute top-4 right-4"><button onClick={copyJavaCode} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[13px] font-bold backdrop-blur-sm transition-colors border border-white/20 shadow-lg flex items-center gap-1.5"><VscCopy size={14}/> 코드 복사</button></div>
                  <textarea readOnly value={javaFiles[selectedJavaIndex]?.code} className="w-full h-full p-6 text-emerald-400 font-mono text-[14px] bg-transparent outline-none resize-none custom-scrollbar leading-relaxed" />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 px-6 py-5 overflow-hidden flex flex-col min-h-0">
        
        {/* 상단 헤더 메뉴 (Undo, Redo, 드롭다운 통합) */}
        <div className="mb-5 flex items-center justify-between shrink-0 relative z-[99]">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <span className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30">🏗️</span> 
                시스템 기획설계 센터
              </h1>
              <p className={`mt-2 text-[14px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>프로젝트의 요구사항부터 데이터베이스 ERD, API 명세까지 한 곳에서 시각적으로 설계하세요.</p>
            </div>

            {/* Undo / Redo 버튼 */}
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

            {/* 개발 도구 드롭다운 */}
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
                      <button onClick={() => { handleGenerateJavaCode(); setOpenMenu(null); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-colors ${isDark ? 'hover:bg-slate-700 text-indigo-400' : 'hover:bg-indigo-50 text-indigo-700'}`}>
                        <VscCode size={16}/> Java 코드 자동 생성
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 파일 및 버전 관리 드롭다운 */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')} className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-[13px] font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 flex items-center gap-2 transition-all hover:-translate-y-0.5">
                <VscFiles size={16}/> 파일 및 저장 <VscChevronDown size={14} className={openMenu === 'file' ? 'rotate-180 transition-transform' : 'transition-transform'}/>
              </button>
              <AnimatePresence>
                {openMenu === 'file' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className={`absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl border overflow-hidden z-[999] ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="p-2 flex flex-col">
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
                        <VscDesktopDownload size={16}/> 전체 프로젝트 백업하기
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl shadow-xl border flex flex-col flex-1 overflow-hidden relative min-h-0 z-10 ${panelClass}`}>
          
          {renderTabs()}

          <div className={`flex-1 overflow-hidden relative min-h-0 flex flex-col ${isDark ? 'bg-[#0f172a]' : 'bg-slate-50/50'} rounded-b-3xl`}>
            <AnimatePresence mode="wait">
              
              {/* 📋 요구사항 탭 */}
              {activeTab === 'requirements' && (
                <motion.div key="req" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 max-w-[1400px] w-full mx-auto h-full flex flex-col min-h-0">
                  <div className="flex justify-between items-end mb-4 shrink-0">
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-2">요구사항 명세서 <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>Excel 붙여넣기 지원 (Ctrl+V)</span></h2>
                      <p className={`text-[13px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>엑셀에서 셀을 복사하여 빈 화면에 붙여넣으면 표가 자동 생성됩니다.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className={`flex items-center border-2 rounded-xl px-3 py-2 shadow-sm focus-within:border-indigo-500 transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <VscSearch className="text-slate-400 mr-2" size={16} />
                        <input value={reqSearch} onChange={e=>setReqSearch(e.target.value)} placeholder="검색..." className="text-[13px] outline-none w-40 bg-transparent font-medium" />
                      </div>
                      <button onClick={() => handleExportMarkdown('req')} className={`px-4 py-2 border-2 text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><VscMarkdown size={16}/> 마크다운</button>
                      <button onClick={handleAddReq} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:bg-indigo-700 flex items-center gap-2 transition-colors"><VscAdd size={16}/> 새 항목 추가</button>
                    </div>
                  </div>
                  
                  {requirements.length === 0 ? <EmptyState type="요구사항" /> : (
                  <div className={`flex-1 overflow-y-auto rounded-2xl shadow-sm border min-h-0 ${panelClass} custom-scrollbar`}>
                    <table className="w-full text-left border-collapse relative">
                      <thead className={`sticky top-0 z-10 shadow-sm backdrop-blur-xl ${tableHeadClass}`}>
                        <tr><th className="p-4 font-black text-[13px] w-[15%]">구분</th><th className="p-4 font-black text-[13px] w-[25%]">기능명</th><th className="p-4 font-black text-[13px] w-[45%]">세부 명세</th><th className="p-4 font-black text-[13px] w-[10%]">비고</th><th className="p-4 font-black text-[13px] text-center w-[5%]">삭제</th></tr>
                      </thead>
                      <tbody onPaste={handlePasteRequirements}>
                        {filteredReqs.map((req) => (
                          <tr key={req.id} onContextMenu={(e) => handleRightClick(e, 'req', req.id)} className={`border-b transition-colors ${tableRowClass}`}>
                            <td className="p-3 font-bold text-[13px]"><input value={req.category} onChange={(e)=>updateReq(req.id, 'category', e.target.value)} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 transition-colors ${inputClass}`} /></td>
                            <td className="p-3 font-bold text-[13px]"><input value={req.name} onChange={(e)=>updateReq(req.id, 'name', e.target.value)} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 transition-colors ${inputClass}`} /></td>
                            <td className="p-3 text-[13px] font-medium"><textarea value={req.desc} onChange={(e)=>updateReq(req.id, 'desc', e.target.value)} rows={1} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 resize-none custom-scrollbar transition-colors ${inputClass}`} /></td>
                            <td className="p-3"><input value={req.note} onChange={(e)=>updateReq(req.id, 'note', e.target.value)} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 text-[11px] font-bold ${isDark?'text-slate-400':'text-slate-500'} transition-colors ${inputClass}`} /></td>
                            <td className="p-3 text-center"><button onClick={() => handleDeleteReq(req.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><VscTrash size={16}/></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </motion.div>
              )}

              {/* 🗄️ ERD 탭 */}
              {activeTab === 'erd' && (
                <motion.div key="erd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-dot-pattern">
                  <ReactFlowProvider>
                    <ReactFlow snapToGrid={true} snapGrid={[20, 20]} selectionMode={SelectionMode.Partial} panOnScroll nodes={erdNodes} edges={erdEdges} onNodesChange={onErdNodesChange} onEdgesChange={onErdEdgesChange} onConnect={onErdConnect} nodeTypes={erdNodeTypes} fitView minZoom={0.1} maxZoom={2} onPaneContextMenu={(e) => handleRightClick(e, 'erdPane')} onNodeContextMenu={(e, node) => handleRightClick(e, 'erdNode', node.id)} onEdgeDoubleClick={(e, edge) => onEdgeDoubleClick(e, edge, setErdEdges)}>
                      <Background color={isDark ? "#334155" : "#cbd5e1"} gap={20} size={1.5} />
                      <Controls className={`shadow-xl border-none rounded-xl m-6 overflow-hidden ${isDark ? 'bg-slate-800 fill-white' : 'bg-white'}`} />
                      
                      <div className="absolute top-6 right-6 z-50">
                        <div className={`flex items-center border rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                           <VscSearch className="text-slate-400 mr-2" size={18} />
                           <input value={canvasSearch} onChange={e=>setCanvasSearch(e.target.value)} placeholder="테이블/컬럼 검색" className="text-[13px] outline-none w-44 bg-transparent font-bold" />
                        </div>
                      </div>
                      
                      <MiniMap position="bottom-right" nodeStrokeWidth={3} zoomable pannable style={{ borderRadius: '16px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', margin: '24px', backgroundColor: isDark ? '#0f172a' : '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} nodeColor={(n) => (canvasSearch && n.data.name?.toLowerCase().includes(canvasSearch.toLowerCase())) ? '#ef4444' : (n.type === 'stickyNode' ? '#eab308' : (isDark ? '#475569' : '#cbd5e1'))} />
                      
                      <motion.div drag dragMomentum={false} dragElastic={0} className={`absolute z-50 shadow-2xl rounded-2xl border overflow-hidden backdrop-blur-xl ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`} style={{ bottom: "2rem", left: "50%", x: "-50%" }} initial={false}>
                        <div className="px-2 py-2 flex items-center gap-1.5 flex-nowrap w-max max-w-[90vw]">
                          
                          <div className="flex items-center justify-center p-2 text-slate-400 hover:text-indigo-500 cursor-move shrink-0 active:scale-95 transition-transform"><VscGripper size={20} /></div>
                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                          
                          <div className="flex px-1 gap-1">
                            <button onClick={()=>handleAddTable()} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscAdd className="text-indigo-500 mb-1" size={18}/><span className="text-[10px] font-bold">새 테이블</span></button>
                            <button onClick={()=>handleAddStickyNode(true)} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscNote className="text-yellow-500 mb-1" size={18}/><span className="text-[10px] font-bold">메모장</span></button>
                            
                            {/* 💡 [명칭 직관화] SQL 역공학 -> SQL 코드로 그리기 */}
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
                            <button onClick={handleExportSql} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscSave className="text-emerald-500 mb-1" size={18}/><span className="text-[10px] font-bold">SQL 내보내기</span></button>
                            <button onClick={()=>handleExportDiagramText('erd')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscGoToFile className="text-pink-500 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">텍스트 다이어그램</span></button>
                            <button onClick={()=>handleExportImage('.react-flow__viewport')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscFileMedia className="text-blue-500 mb-1" size={18}/><span className="text-[10px] font-bold">PNG 다운</span></button>
                          </div>
                        </div>
                      </motion.div>
                    </ReactFlow>
                  </ReactFlowProvider>
                </motion.div>
              )}

              {/* 🌊 시스템 데이터 플로우 탭 */}
              {activeTab === 'flow' && (
                <motion.div key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-dot-pattern">
                  <ReactFlowProvider>
                    <ReactFlow snapToGrid={true} snapGrid={[20, 20]} selectionMode={SelectionMode.Partial} panOnScroll nodes={flowNodes} edges={flowEdges} onNodesChange={onFlowNodesChange} onEdgesChange={onFlowEdgesChange} onConnect={onFlowConnect} nodeTypes={flowNodeTypes} fitView minZoom={0.2} maxZoom={2} onEdgeDoubleClick={(e, edge) => onEdgeDoubleClick(e, edge, setFlowEdges)} onNodeContextMenu={(e, node) => handleRightClick(e, 'flowNode', node.id)}>
                      <Background color={isDark ? "#334155" : "#cbd5e1"} gap={20} size={1} />
                      <Controls className={`shadow-xl border-none rounded-xl m-6 overflow-hidden ${isDark ? 'bg-slate-800 fill-white' : 'bg-white'}`} />
                      
                      <div className="absolute top-6 right-6 z-50">
                        <div className={`flex items-center border rounded-2xl px-4 py-2.5 shadow-xl backdrop-blur-md ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'}`}>
                           <VscSearch className="text-slate-400 mr-2" size={18} />
                           <input value={canvasSearch} onChange={e=>setCanvasSearch(e.target.value)} placeholder="노드 검색" className="text-[13px] outline-none w-40 bg-transparent font-bold" />
                        </div>
                      </div>

                      <MiniMap position="bottom-right" nodeStrokeWidth={3} zoomable pannable style={{ borderRadius: '16px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', margin: '24px', backgroundColor: isDark ? '#0f172a' : '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} nodeColor={(n) => (canvasSearch && n.data.label?.toLowerCase().includes(canvasSearch.toLowerCase())) ? '#ef4444' : (n.type === 'stickyNode' ? '#eab308' : (isDark ? '#475569' : '#cbd5e1'))} />
                      
                      <motion.div drag dragMomentum={false} dragElastic={0} className={`absolute z-50 shadow-2xl rounded-2xl border overflow-hidden backdrop-blur-xl ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'}`} style={{ bottom: "2rem", left: "50%", x: "-50%" }} initial={false}>
                        <div className="px-2 py-2 flex items-center gap-1 flex-nowrap w-max max-w-[90vw]">
                          <div className="flex items-center justify-center p-2 text-slate-400 hover:text-indigo-500 cursor-move shrink-0 active:scale-95 transition-transform"><VscGripper size={20} /></div>
                          <div className={`w-px h-6 mx-1 shrink-0 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>

                          <div className="flex px-1 gap-1">
                            <button onClick={()=>handleAddFlowNode('client')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700 text-blue-300':'hover:bg-blue-50 text-blue-600'}`}><VscGlobe size={18} className="mb-1"/><span className="text-[10px] font-bold">Client</span></button>
                            <button onClick={()=>handleAddFlowNode('server')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700 text-emerald-300':'hover:bg-emerald-50 text-emerald-600'}`}><VscServer size={18} className="mb-1"/><span className="text-[10px] font-bold">Server</span></button>
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
                            <button onClick={()=>handleExportDiagramText('flow')} className={`flex flex-col items-center justify-center w-[72px] h-14 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><VscGoToFile className="text-pink-500 mb-1" size={18}/><span className="text-[10px] font-bold whitespace-nowrap">텍스트 다이어그램</span></button>
                            <button onClick={()=>handleExportImage('.react-flow__viewport')} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${isDark?'hover:bg-slate-700':'hover:bg-slate-100'}`}><VscFileMedia className="text-indigo-500 mb-1" size={18}/><span className="text-[10px] font-bold">PNG 다운</span></button>
                          </div>
                        </div>
                      </motion.div>
                    </ReactFlow>
                  </ReactFlowProvider>
                </motion.div>
              )}

              {/* 📋 API 탭 */}
              {activeTab === 'api' && (
                <motion.div key="api" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 max-w-[1400px] w-full mx-auto h-full flex flex-col min-h-0">
                  <div className="flex justify-between items-end mb-4 shrink-0">
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-2">REST API 명세서 <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>Excel 붙여넣기 지원 (Ctrl+V)</span></h2>
                      {/* 💡 [설명 직관화] */}
                      <p className={`text-[13px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>작성된 명세를 다른 개발자가 바로 쓸 수 있는 <b>표준 포맷(Swagger/OpenAPI JSON)</b>으로 변환해 드립니다.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className={`flex items-center border-2 rounded-xl px-3 py-2 shadow-sm focus-within:border-indigo-500 transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <VscSearch className="text-slate-400 mr-2" size={16} />
                        <input value={apiSearch} onChange={e=>setApiSearch(e.target.value)} placeholder="API 검색..." className="text-[13px] outline-none w-40 bg-transparent font-medium" />
                      </div>
                      
                      {/* 💡 [명칭 직관화] 버튼 이름 변경 */}
                      <button onClick={handleExportApiJson} className="px-4 py-2 bg-emerald-600 text-white text-[13px] font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-700 flex items-center gap-2 transition-colors"><VscPulse size={16}/> 표준 API 문서 다운로드 (JSON)</button>
                      <button onClick={() => handleExportMarkdown('api')} className={`px-4 py-2 border-2 text-[13px] font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><VscMarkdown size={16}/> 마크다운</button>
                      <button onClick={handleAddApi} className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-bold rounded-xl shadow-md shadow-indigo-500/20 hover:bg-indigo-700 flex items-center gap-2 transition-colors"><VscAdd size={16}/> 새 API 추가</button>
                    </div>
                  </div>

                  {apiSpecs.length === 0 ? <EmptyState type="API 명세" /> : (
                  <div className={`flex-1 overflow-y-auto rounded-2xl shadow-sm border min-h-0 ${panelClass} custom-scrollbar`}>
                    <table className="w-full text-left border-collapse relative">
                      <thead className={`sticky top-0 z-10 shadow-sm backdrop-blur-xl ${tableHeadClass}`}><tr><th className="p-4 font-black text-[13px] w-[15%] text-center">Method</th><th className="p-4 font-black text-[13px] w-[35%]">Endpoint URL</th><th className="p-4 font-black text-[13px] w-[40%]">설명 (Description)</th><th className="p-4 font-black text-[13px] text-center w-[10%]">삭제</th></tr></thead>
                      <tbody onPaste={handlePasteApi}>
                        {filteredApis.map((api) => {
                          const hasError = api.endpoint && !api.endpoint.startsWith('/');
                          return (
                          <tr key={api.id} onContextMenu={(e) => handleRightClick(e, 'api', api.id)} className={`border-b font-mono transition-colors ${tableRowClass}`}>
                            <td className="p-3 text-center">
                              <select value={api.method} onChange={(e)=>updateApi(api.id, 'method', e.target.value)} className={`px-3 py-1.5 text-[12px] font-black rounded-lg border outline-none cursor-pointer shadow-sm ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                                <option className="text-blue-600">GET</option><option className="text-emerald-600">POST</option><option className="text-amber-600">PUT</option><option className="text-red-600">DELETE</option>
                              </select>
                            </td>
                            <td className="p-3 font-bold text-[13px] flex items-center gap-2">
                              <input value={api.endpoint} onChange={(e)=>updateApi(api.id, 'endpoint', e.target.value)} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 transition-colors ${inputClass} ${hasError ? 'text-red-500 bg-red-500/10' : ''}`} />
                              {hasError && <VscWarning className="text-red-500 shrink-0 drop-shadow-md" title="URL은 '/'로 시작해야 합니다." />}
                            </td>
                            <td className="p-3 font-sans text-[13px] font-medium">
                              <textarea value={api.desc} onChange={(e)=>updateApi(api.id, 'desc', e.target.value)} rows={1} className={`w-full bg-transparent outline-none rounded-lg px-2 py-1.5 resize-none custom-scrollbar transition-colors ${inputClass}`} />
                            </td>
                            <td className="p-3 text-center"><button onClick={() => handleDeleteApi(api.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><VscTrash size={16}/></button></td>
                          </tr>
                        )})}
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
    </div>
  );
}