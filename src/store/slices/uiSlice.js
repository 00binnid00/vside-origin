import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isSidebarVisible: true,
  isTerminalVisible: true,
  isAgentVisible: true,
  isAboutVisible: false,
  isProjectModalVisible: false,
  isCommandPaletteVisible: false,

  // 💡 [추가됨] 오른쪽 패널 (팀채팅 & AI) 접힘 상태 관리
  isRightPanelVisible: true,

  codeMapMode: null,

  activeBottomTab: "terminal",
  activeActivity: "editor",
  activeDocsTab: "api",
  activeMyPageTab: "profile",

  isRunning: false,
  isDebugMode: false,

  debugLine: null,
  debugVariables: {},
  breakpoints: [],

  terminalOutput: null,
  editorCmd: null,
  pendingCreation: null,

  agentMessages: [],
  selectedText: "",

  isVoiceConnected: false,

  isPreviewVisible: false,
  previewUrl: "",
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarVisible = !state.isSidebarVisible;
    },
    // 💡 [추가됨] 우측 패널 토글 리듀서
    toggleRightPanel: (state) => {
      state.isRightPanelVisible = !state.isRightPanelVisible;
    },
    toggleTerminal: (state) => {
      state.isTerminalVisible = !state.isTerminalVisible;
    },
    toggleAgent: (state) => {
      state.isAgentVisible = !state.isAgentVisible;
    },
    toggleAbout: (state) => {
      state.isAboutVisible = !state.isAboutVisible;
    },

    closeCommandPalette: (state) => {
      state.isCommandPaletteVisible = false;
    },
    toggleCommandPalette: (state) => {
      state.isCommandPaletteVisible = !state.isCommandPaletteVisible;
    },

    setCodeMapMode: (state, action) => {
      state.codeMapMode = action.payload;
    },
    closeCodeMap: (state) => {
      state.codeMapMode = null;
    },

    setActiveBottomTab: (state, action) => {
      state.activeBottomTab = action.payload;
    },
    setActiveActivity: (state, action) => {
      state.activeActivity = action.payload;
    },
    setActiveDocsTab: (state, action) => {
      state.activeDocsTab = action.payload;
    },
    setActiveMyPageTab: (state, action) => {
      state.activeMyPageTab = action.payload;
    },

    openProjectModal: (state) => {
      state.isProjectModalVisible = true;
    },
    closeProjectModal: (state) => {
      state.isProjectModalVisible = false;
    },

    setRunning: (state, action) => {
      state.isRunning = action.payload;
    },
    setDebugMode: (state, action) => {
      state.isDebugMode = action.payload;
    },
    setCurrentDebugLine: (state, action) => {
      state.debugLine = action.payload;
      if (action.payload) state.activeBottomTab = "output";
    },
    updateDebugVariables: (state, action) => {
      state.debugVariables = action.payload;
    },

    toggleBreakpoint: (state, action) => {
      const { path, line } = action.payload;
      const exists = state.breakpoints.find(
        (bp) => bp.path === path && bp.line === line,
      );

      if (exists) {
        state.breakpoints = state.breakpoints.filter(
          (bp) => bp.path !== path || bp.line !== line,
        );
      } else {
        state.breakpoints.push({ path, line });
      }
    },

    writeToTerminal: (state, action) => {
      state.terminalOutput = { text: action.payload };
    },
    clearTerminalOutput: (state) => {
      state.terminalOutput = { text: "__CLEAR__" };
    },
    triggerEditorCmd: (state, action) => {
      state.editorCmd = action.payload;
    },

    startCreation: (state, action) => {
      state.pendingCreation = action.payload;
    },
    endCreation: (state) => {
      state.pendingCreation = null;
    },

    addAgentMessage: (state, action) => {
      state.agentMessages.push(action.payload);
      state.isAgentVisible = true;
      state.isDebugMode = false;
    },
    clearAgentMessages: (state) => {
      state.agentMessages = [];
    },
    setSelectedText: (state, action) => {
      state.selectedText = action.payload;
    },

    setVoiceConnected: (state, action) => {
      state.isVoiceConnected = action.payload;
    },

    setIsPreviewVisible: (state, action) => {
      state.isPreviewVisible = action.payload;
    },
    setPreviewUrl: (state, action) => {
      state.previewUrl = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  toggleRightPanel, // 💡 export 추가
  toggleTerminal,
  toggleAgent,
  toggleAbout,
  setActiveBottomTab,
  setActiveActivity,
  setActiveDocsTab,
  setActiveMyPageTab,
  openProjectModal,
  closeProjectModal,
  setRunning,
  setDebugMode,
  setCurrentDebugLine,
  updateDebugVariables,
  toggleBreakpoint,
  writeToTerminal,
  clearTerminalOutput,
  triggerEditorCmd,
  startCreation,
  endCreation,
  closeCommandPalette,
  toggleCommandPalette,
  setCodeMapMode,
  closeCodeMap,
  addAgentMessage,
  clearAgentMessages,
  setSelectedText,
  setVoiceConnected,
  setIsPreviewVisible,
  setPreviewUrl,
} = uiSlice.actions;

export default uiSlice.reducer;