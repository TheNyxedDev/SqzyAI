import { useState, useRef } from 'react';
import {
  Plus,
  RotateCw,
  Settings,
  History,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Layout,
  Code2,
  Zap,
} from 'lucide-react';
import Editor, { loader } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- CONSTANTS ---
const VANILLA_SPRITE = 'https://iamEvanYT.github.io/Vanilla/icons/icons.svg';
const ICON_SIZE = 16;

const SERVICE_ICONS: Record<string, number> = {
  // Services
  Workspace: 19,
  Players: 21,
  Lighting: 13,
  MaterialService: 73,
  ReplicatedFirst: 70,
  ReplicatedStorage: 70,
  ServerScriptService: 71,
  ServerStorage: 69,
  StarterGui: 46,
  StarterPack: 20,
  StarterPlayer: 79,
  Teams: 23,
  SoundService: 31,
  TextChatService: 33,

  // Organization
  Folder: 77,
  Model: 78,
  Configuration: 52,

  // Scripts
  Script: 6,
  LocalScript: 18,
  ModuleScript: 76,

  // Physics & Parts
  Part: 1,
  MeshPart: 8,
  SpawnLocation: 25,
  WedgePart: 2,
  CornerWedgePart: 3,
  CylinderPart: 4,
  SpherePart: 5,
  TrussPart: 12,
  Seat: 34,
  VehicleSeat: 35,
  Attachment: 38,
  Bone: 39,

  // Values
  StringValue: 4,
  IntValue: 4,
  NumberValue: 4,
  BoolValue: 4,
  ObjectValue: 4,
  Vector3Value: 4,
  CFrameValue: 4,
  Color3Value: 4,
  BrickColorValue: 4,

  // UI
  ScreenGui: 46,
  SurfaceGui: 46,
  BillboardGui: 46,
  Frame: 47,
  ScrollingFrame: 48,
  TextLabel: 49,
  TextButton: 50,
  TextBox: 51,
  ImageLabel: 52,
  ImageButton: 53,
  ViewportFrame: 54,
  VideoFrame: 55,
  CanvasGroup: 56,

  // Networking
  RemoteEvent: 75,
  RemoteFunction: 74,
  BindableEvent: 67,
  BindableFunction: 66,

  // Lighting & Effects
  PointLight: 14,
  SpotLight: 15,
  SurfaceLight: 16,
  ParticleEmitter: 65,
  Trail: 64,
  Beam: 63,
  Fire: 62,
  Smoke: 61,
  Sparkles: 60,

  // Audio
  Sound: 31,
  SoundGroup: 32,

  // Character
  Humanoid: 9,
  Animator: 10,
  Animation: 11,
};

const OBJECT_CATEGORIES = [
  {
    name: 'Organization & Logic',
    items: ['Folder', 'Model', 'Configuration']
  },
  {
    name: 'Scripts & Code',
    items: ['Script', 'LocalScript', 'ModuleScript']
  },
  {
    name: '3D Parts & Geometry',
    items: ['Part', 'SpherePart', 'WedgePart', 'CornerWedgePart', 'CylinderPart', 'TrussPart', 'SpawnLocation', 'Seat', 'VehicleSeat']
  },
  {
    name: 'Values',
    items: ['StringValue', 'IntValue', 'NumberValue', 'BoolValue', 'ObjectValue', 'Vector3Value', 'CFrameValue', 'Color3Value']
  },
  {
    name: 'UI / Graphical Interface',
    items: ['ScreenGui', 'SurfaceGui', 'BillboardGui', 'Frame', 'ScrollingFrame', 'TextLabel', 'TextButton', 'TextBox', 'ImageLabel', 'ImageButton', 'ViewportFrame', 'CanvasGroup', 'UICorner', 'UIStroke', 'UIGradient', 'UIListLayout', 'UIGridLayout', 'UIAspectRatioConstraint']
  },
  {
    name: 'Physics & Constraints',
    items: ['Attachment', 'Bone', 'WeldConstraint', 'NoCollisionConstraint', 'HingeConstraint', 'BallSocketConstraint', 'SpringConstraint', 'PrismaticConstraint', 'CylindricalConstraint', 'RopeConstraint', 'LinearVelocity', 'AngularVelocity']
  },
  {
    name: 'Lighting & Visual Effects',
    items: ['PointLight', 'SpotLight', 'SurfaceLight', 'ParticleEmitter', 'Trail', 'Beam', 'Fire', 'Smoke', 'Sparkles']
  },
  {
    name: 'Audio',
    items: ['Sound', 'SoundGroup']
  },
  {
    name: 'Characters & Animation',
    items: ['Humanoid', 'Animator', 'Animation', 'Shirt', 'Pants', 'Accessory']
  },
  {
    name: 'Networking & Events',
    items: ['RemoteEvent', 'RemoteFunction', 'BindableEvent', 'BindableFunction']
  }
];

const ROBLOX_SERVICES = [
  'Workspace', 'Players', 'Lighting', 'MaterialService', 'NetworkClient',
  'ReplicatedFirst', 'ReplicatedStorage', 'ServerScriptService', 'ServerStorage',
  'StarterGui', 'StarterPack', 'StarterPlayer', 'Teams', 'SoundService', 'TextChatService'
];

// --- COMPONENTS ---

const VanillaIcon = ({ id, className }: { id: number | string, className?: string }) => {
  const iconId = typeof id === 'string' ? (SERVICE_ICONS[id] ?? 0) : id;
  return (
    <div
      className={cn("w-4 h-4 flex-shrink-0", className)}
      style={{
        backgroundImage: `url(${VANILLA_SPRITE})`,
        backgroundPosition: `-${iconId * ICON_SIZE}px 0px`,
        backgroundSize: 'auto 16px',
        imageRendering: 'pixelated'
      }}
    />
  );
};

// --- TYPES ---

interface FileNode {
  name: string;
  path: string;
  kind: 'file' | 'directory';
  handle?: FileSystemHandle;
  children?: FileNode[];
  isOpen?: boolean;
  service?: string;
  isModified?: boolean;
}

interface Tab {
  name: string;
  path: string;
  content: string;
  handle?: FileSystemFileHandle;
  isModified: boolean;
}

// Configure Monaco Loader to include Luau-friendly highlighting
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
  },
});

const AI_MODELS = [
  { id: 'gpt-5.4-nano', name: 'openai/gpt-5.4-nano', provider: 'puter' },
  { id: 'mercury-2', name: 'inception/mercury-2', provider: 'puter' },
  { id: 'claude-sonnet-4-6', name: 'anthropic/claude-sonnet-4-6', provider: 'puter' },
  { id: 'claude-opus-4-6', name: 'anthropic/claude-opus-4-6', provider: 'puter' },
  { id: 'gemini-3.1-pro-preview', name: 'google/gemini-3.1-pro-preview', provider: 'puter' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'google/gemini-3.1-flash-lite-preview', provider: 'puter' },
  { id: 'glm-5.1', name: 'z-ai/glm-5.1', provider: 'puter' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'nvidia/nemotron-3-super-120b-a12b:free', provider: 'openrouter' },
  { id: 'arcee-ai/trinity-large-preview:free', name: 'arcee-ai/trinity-large-preview:free', provider: 'openrouter' },
  { id: 'minimax/minimax-m2.5:free', name: 'minimax/minimax-m2.5:free', provider: 'openrouter' },
];

// --- MAIN APP ---

export default function App() {
  const [activeModelId, setActiveModelId] = useState(() => localStorage.getItem('sq_model') || 'gpt-5.4-nano');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sq_api_key') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sq_api_key') || '');
  const [mode, setMode] = useState<'agentic' | 'planning' | 'debugging'>('agentic');

  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number | null>(null);
  const [isRojoConnected, setIsRojoConnected] = useState(false);
  const [rojoDirHandle, setRojoDirHandle] = useState<FileSystemDirectoryHandle | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRojoGuideOpen, setIsRojoGuideOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedParentNode, setSelectedParentNode] = useState<FileNode | null>(null);

  const editorRef = useRef<any>(null);

  // --- FILE SYSTEM LOGIC ---

  const connectFolder = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setRojoDirHandle(handle);
      setIsRojoConnected(true);
      await refreshFileTree(handle);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshFileTree = async (rootHandle: FileSystemDirectoryHandle) => {
    let srcHandle: FileSystemDirectoryHandle | null = null;
    try {
      srcHandle = await rootHandle.getDirectoryHandle('src');
    } catch {
      // No src folder
    }

    const services: Record<string, FileNode> = {};
    ROBLOX_SERVICES.forEach(s => {
      services[s] = {
        name: s,
        path: s,
        kind: 'directory',
        children: [],
        isOpen: false,
        service: s
      };
    });

    if (srcHandle) {
      const scan = async (handle: FileSystemDirectoryHandle, parentNode: FileNode) => {
        for await (const entry of (handle as any).values()) {
          const path = `${parentNode.path}/${entry.name}`;
          const node: FileNode = {
            name: entry.name,
            path,
            kind: entry.kind as 'file' | 'directory',
            handle: entry,
            children: entry.kind === 'directory' ? [] : undefined
          };

          if (entry.kind === 'directory') {
            await scan(entry as FileSystemDirectoryHandle, node);
          }
          parentNode.children?.push(node);
        }
      };

      for await (const entry of (srcHandle as any).values()) {
        if (entry.kind === 'directory') {
          let targetService = '';
          if (entry.name === 'server') targetService = 'ServerScriptService';
          else if (entry.name === 'client') targetService = 'StarterPlayer';
          else if (entry.name === 'shared') targetService = 'ReplicatedStorage';

          if (targetService && services[targetService]) {
            await scan(entry as FileSystemDirectoryHandle, services[targetService]);
          }
        }
      }
    }

    setFileTree(Object.values(services));
  };

  const createObject = async (parent: FileNode, className: string, name: string) => {
    if (!parent.handle || parent.kind !== 'directory') return;

    let fileName = `${name}.${className}`;
    let isFolder = true;

    if (className === 'Script') {
      fileName = `${name}.server.luau`;
      isFolder = false;
    } else if (className === 'LocalScript') {
      fileName = `${name}.client.luau`;
      isFolder = false;
    } else if (className === 'ModuleScript') {
      fileName = `${name}.luau`;
      isFolder = false;
    } else if (className === 'Folder') {
      fileName = name;
      isFolder = true;
    }

    try {
      if (isFolder) {
        await (parent.handle as FileSystemDirectoryHandle).getDirectoryHandle(fileName, { create: true });
      } else {
        const fileHandle = await (parent.handle as FileSystemDirectoryHandle).getFileHandle(fileName, { create: true });
        const writable = await (fileHandle as any).createWritable();
        await writable.write('-- Generated by Squeeze IDE');
        await writable.close();
      }

      if (rojoDirHandle) await refreshFileTree(rojoDirHandle);
      setIsCreateModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const openFile = async (node: FileNode) => {
    if (node.kind === 'directory') return;

    const existingIndex = tabs.findIndex(t => t.path === node.path);
    if (existingIndex !== -1) {
      setActiveTabIndex(existingIndex);
      return;
    }

    try {
      const file = await (node.handle as FileSystemFileHandle).getFile();
      const content = await file.text();
      const newTab: Tab = {
        name: node.name,
        path: node.path,
        content,
        handle: node.handle as FileSystemFileHandle,
        isModified: false
      };
      setTabs(prev => {
        const next = [...prev, newTab];
        setActiveTabIndex(next.length - 1);
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const closeTab = (index: number) => {
    const newTabs = [...tabs];
    newTabs.splice(index, 1);
    setTabs(newTabs);
    if (activeTabIndex === index) {
      setActiveTabIndex(newTabs.length > 0 ? Math.max(0, index - 1) : null);
    } else if (activeTabIndex !== null && activeTabIndex > index) {
      setActiveTabIndex(activeTabIndex - 1);
    }
  };

  const saveCurrentFile = async () => {
    if (activeTabIndex === null || !tabs[activeTabIndex]) return;
    const tab = tabs[activeTabIndex];
    const content = editorRef.current?.getValue();

    if (tab.handle) {
      try {
        const writable = await (tab.handle as any).createWritable();
        await writable.write(content);
        await writable.close();

        const newTabs = [...tabs];
        newTabs[activeTabIndex] = { ...tab, content, isModified: false };
        setTabs(newTabs);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // --- MONACO SETUP ---

  const handleEditorWillMount = (monaco: any) => {
    // Define Lemonade Theme
    monaco.editor.defineTheme('lemonade-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'a8e44d', fontStyle: 'bold' },
        { token: 'string', foreground: 'f1fa8c' },
        { token: 'number', foreground: 'bd93f9' },
        { token: 'operator', foreground: 'ff79c6' },
        { token: 'function', foreground: '50fa7b' },
        { token: 'type', foreground: '8be9fd' },
        { token: 'identifier', foreground: 'e4e4f0' },
        { token: 'variable.language', foreground: 'ff79c6' }, // for self
      ],
      colors: {
        'editor.background': '#0b0b10',
        'editor.foreground': '#e4e4f0',
        'editorCursor.foreground': '#a8e44d',
        'editor.lineHighlightBackground': '#1a1a24',
        'editorLineNumber.foreground': '#44475a',
        'editor.selectionBackground': '#44475a88',
        'editorIndentGuide.background': '#282a36',
        'editor.bracketPairGui.foreground1': '#a8e44d',
        'editor.bracketPairGui.foreground2': '#ff79c6',
        'editor.bracketPairGui.foreground3': '#8be9fd',
        'editorWidget.background': '#14141b',
        'editorWidget.border': '#ffffff10',
        'editorSuggestWidget.background': '#14141b',
        'editorSuggestWidget.border': '#ffffff10',
        'editorSuggestWidget.selectedBackground': '#a8e44d20',
        'list.hoverBackground': '#ffffff05',
      }
    });

    // Register Luau-specific keywords and providers
    monaco.languages.registerCompletionItemProvider('lua', {
      provideCompletionItems: () => {
        const suggestions = [
          ...['task', 'Enum', 'Instance', 'Vector3', 'CFrame', 'Color3', 'Rect', 'UDim', 'UDim2', 'game', 'workspace', 'script'].map(k => ({
            label: k,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: k
          })),
          ...['Workspace', 'Players', 'Lighting', 'ReplicatedStorage', 'ServerStorage', 'ServerScriptService', 'StarterGui', 'StarterPack', 'StarterPlayer', 'SoundService', 'Teams'].map(s => ({
            label: s,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: s
          }))
        ];
        return { suggestions };
      }
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Smoother typing and appearance
    editor.updateOptions({
      cursorSmoothCaretAnimation: 'on',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontLigatures: true,
      fontSize: 13,
      lineHeight: 24,
      minimap: { enabled: true },
      bracketPairColorization: { enabled: true },
      padding: { top: 16, bottom: 16 },
      automaticLayout: true,
      scrollBeyondLastLine: false,
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentFile();
    });
  };

  // --- RENDER HELPERS ---

  const renderFileNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = node.isOpen;
    const isService = !!node.service;

    let iconId: number | string = 77;
    if (isService) iconId = node.service!;
    else if (node.kind === 'file') {
      if (node.name.includes('.server.')) iconId = 'Script';
      else if (node.name.includes('.client.')) iconId = 'LocalScript';
      else if (node.name.includes('.luau') || node.name.includes('.lua')) iconId = 'ModuleScript';
      else iconId = 'Script';
    }

    return (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-white/5 transition-colors group relative",
            node.kind === 'file' && "pl-8",
            selectedParentNode?.path === node.path && "bg-lime-400/5 text-white"
          )}
          style={{ paddingLeft: depth > 0 ? `${depth * 12 + 12}px` : undefined }}
          onClick={() => {
            if (node.kind === 'directory') {
              node.isOpen = !node.isOpen;
              setFileTree([...fileTree]);
              setSelectedParentNode(node);
            } else {
              openFile(node);
            }
          }}
        >
          {node.kind === 'directory' && (
            <div className="w-3.5 h-3.5 flex items-center justify-center text-white/40">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
          <VanillaIcon id={iconId} />
          <span className={cn(
            "text-[12px] truncate select-none",
            isService ? "font-bold text-white/90" : "text-white/70",
            selectedParentNode?.path === node.path && "text-lime-400"
          )}>
            {node.name.replace(/\.(server|client)?\.luau?$/, '')}
          </span>
          {node.isModified && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-auto" />}
          {selectedParentNode?.path === node.path && node.kind === 'directory' && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-lime-400" />
          )}
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children
              .sort((a, b) => {
                if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map(child => renderFileNode(child, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMsg = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsTyping(true);

    try {
      const selectedModelObj = AI_MODELS.find(m => m.id === activeModelId) || AI_MODELS[0];
      let aiResponseText = "";

      const activeFile = activeTabIndex !== null ? tabs[activeTabIndex] : null;
      let systemPrompt = `You are an expert Roblox Lua/Luau autonomous coding agent. 
The chat interface is strictly for instructions, reasoning, terminology, and normal conversation. DO NOT output code blocks like \`\`\`lua in the chat.
Coding ALWAYS happens in the editor natively. To write, modify, or create a script, you MUST use the following exact XML format:
<file path="Full/Path/To/Script.luau">
-- Your complete code here
</file>

You can create documents wherever and whenever you want. Always provide the full absolute path such as "ServerScriptService/Main.server.luau".
If the user is asking you to modify an existing file, output the ENTIRE updated file content within the <file> tags.`;

      if (activeFile && editorRef.current) {
        systemPrompt += `\n\nThe user is currently focusing on this file path: '${activeFile.path}'.\nHere is its current content:\n<current_file>\n${editorRef.current.getValue()}\n</current_file>\n`;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: 'Thinking...' }]);

      let currentTabs = [...tabs];
      let currentActiveIndex = activeTabIndex;

      const processResponseText = (fullResponse: string) => {
        const fileTagRegex = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)(?:<\/file>|$)/g;
        let match;
        let chatText = fullResponse;
        let files: { path: string, content: string }[] = [];

        while ((match = fileTagRegex.exec(fullResponse)) !== null) {
          files.push({ path: match[1], content: match[2].trimStart() });
        }

        chatText = chatText.replace(/<file\s+path=["']([^"']+)["']\s*>[\s\S]*?(?:<\/file>|$)/g, '').replace(/```xml\s*```/g, '').replace(/```\s*```/g, '').trim();

        setMessages(prev => {
          const newM = [...prev];
          if (newM.length > 0 && newM[newM.length - 1].role === 'assistant') {
            newM[newM.length - 1] = { ...newM[newM.length - 1], content: chatText || (files.length > 0 ? "Coding..." : "Thinking...") };
          }
          return newM;
        });

        if (files.length > 0) {
          const latestFile = files[files.length - 1];

          let tabIndex = currentTabs.findIndex(t => t.path === latestFile.path);
          if (tabIndex === -1) {
            currentTabs.push({
              name: latestFile.path.split('/').pop() || 'NewScript.luau',
              path: latestFile.path,
              content: latestFile.content,
              isModified: true
            });
            tabIndex = currentTabs.length - 1;
          } else {
            currentTabs[tabIndex] = { ...currentTabs[tabIndex], content: latestFile.content, isModified: true };
          }

          if (currentActiveIndex !== tabIndex) {
            currentActiveIndex = tabIndex;
            setActiveTabIndex(tabIndex);
          }

          if (editorRef.current && currentActiveIndex === tabIndex) {
            const model = editorRef.current.getModel();
            if (model && model.getValue() !== latestFile.content) {
              editorRef.current.setValue(latestFile.content);
            }
          }
        }
      };

      let fullResponse = "";

      if (selectedModelObj.provider === 'puter') {
        const response = await (window as any).puter.ai.chat(
          `${systemPrompt}\n\nUser Message: ${currentInput}`,
          { model: selectedModelObj.id, stream: true }
        );

        if (response && typeof response[Symbol.asyncIterator] === 'function') {
          for await (const part of response) {
            fullResponse += part?.text || "";
            processResponseText(fullResponse);
          }
        } else {
          fullResponse = typeof response === 'string' ? response : (response?.message?.content || response?.text || JSON.stringify(response));
          processResponseText(fullResponse);
        }
      } else {
        const defaultKey = "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";
        const keyToUse = apiKey || defaultKey;

        const messagesToSend = [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })).filter(m => m.role !== 'system'),
          { role: "user", content: currentInput }
        ];

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${keyToUse}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: selectedModelObj.id,
            messages: messagesToSend,
            stream: true
          })
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
                  try {
                    const data = JSON.parse(trimmed.slice(6));
                    if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                      fullResponse += data.choices[0].delta.content;
                      processResponseText(fullResponse);
                    }
                  } catch (e) { }
                }
              }
            }
          }
        }
      }

      setTabs([...currentTabs]);
      setIsTyping(false);

      setMessages(prev => {
        const newM = [...prev];
        const lastMsg = newM[newM.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && (lastMsg.content === 'Coding...' || lastMsg.content === 'Thinking...')) {
          newM[newM.length - 1] = { ...lastMsg, content: `I have updated the files in your editor.` };
        }
        return newM;
      });

    } catch (err: any) {
      setIsTyping(false);
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    }
  };



  return (
    <div className="flex flex-col h-screen bg-[#0e0e12] text-[#e4e4f0] font-sans selection:bg-lime-400/30 overflow-hidden">
      {/* TOPBAR */}
      <div className="h-11 bg-[#14141b] border-b border-white/10 flex items-center px-4 gap-3 z-50">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-6 h-6 bg-lime-400 rounded-md flex items-center justify-center text-black font-bold text-sm shadow-[0_0_10px_rgba(168,228,77,0.3)] group-hover:scale-105 transition-transform">🍋</div>
          <span className="font-extrabold text-[15px] tracking-tight text-lime-400">Squeeze</span>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <div className="flex items-center bg-[#1a1a24] border border-white/5 rounded-md px-2 py-1 gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            className="bg-transparent border-none outline-none text-[11px] font-mono font-bold uppercase tracking-wider cursor-pointer text-white/80"
          >
            <option value="agentic" className="bg-[#1a1a24]">🟢 Agentic</option>
            <option value="planning" className="bg-[#1a1a24]">🔵 Planning</option>
            <option value="debugging" className="bg-[#1a1a24]">🟠 Debugging</option>
          </select>
        </div>

        <div className="flex-1 flex justify-center overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[11px] text-white/40 font-mono max-w-[400px]">
            <span className="text-lime-400/50 truncate shrink-0">{AI_MODELS.find(m => m.id === activeModelId)?.name || 'Select Model'}</span>
            <span className="text-white/10">|</span>
            <span className="truncate">{activeTabIndex !== null ? tabs[activeTabIndex]?.path : 'No file open'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-md text-[11px] font-mono transition-all border shrink-0",
              isRojoConnected ? "bg-lime-400/10 border-lime-400/20 text-lime-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white"
            )}
            onClick={() => setIsRojoGuideOpen(true)}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", isRojoConnected ? "bg-lime-400 animate-pulse shadow-[0_0_8px_rgba(168,228,77,0.8)]" : "bg-white/20")} />
            Rojo Sync
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-md hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* EXPLORER */}
        <div className="w-64 bg-[#14141b] border-r border-white/10 flex flex-col shrink-0">
          <div className="h-9 px-3 flex items-center justify-between border-b border-white/5 bg-[#1a1a24]/50">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Explorer</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => rojoDirHandle && refreshFileTree(rojoDirHandle)}
                className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <RotateCw size={14} />
              </button>
              <button
                onClick={() => {
                  setSelectedParentNode(fileTree[0]); // Default to first service (e.g. Workspace)
                  setIsCreateModalOpen(true);
                }}
                className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {!isRojoConnected ? (
              <div className="px-6 py-8 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20">
                  <Layout size={24} />
                </div>
                <p className="text-[11px] text-white/30 leading-relaxed">
                  Connect a Rojo project folder to sync your Roblox environment.
                </p>
                <button
                  onClick={connectFolder}
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 text-[11px] font-bold py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Connect Folder
                </button>
                <button
                  onClick={() => setIsRojoGuideOpen(true)}
                  className="text-[10px] text-lime-400 hover:underline cursor-pointer"
                >
                  How to setup Rojo?
                </button>
              </div>
            ) : (
              fileTree.map(node => renderFileNode(node))
            )}
          </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0b0b10]">
          {/* TABS */}
          <div className="h-9 bg-[#14141b] border-b border-white/10 flex overflow-x-auto no-scrollbar">
            {tabs.map((tab, i) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabIndex(i)}
                className={cn(
                  "flex items-center gap-2 px-3 border-r border-white/5 cursor-pointer min-w-[120px] max-w-[200px] transition-all relative group shrink-0",
                  activeTabIndex === i ? "bg-[#0b0b10] text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70"
                )}
              >
                <VanillaIcon id={tab.name.includes('.server.') ? 'Script' : tab.name.includes('.client.') ? 'LocalScript' : 'ModuleScript'} />
                <span className="text-[11px] truncate">{tab.name.replace(/\.(server|client)?\.luau?$/, '')}</span>
                {tab.isModified && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />}
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(i); }}
                  className={cn(
                    "p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity ml-auto",
                    activeTabIndex === i && "opacity-100"
                  )}
                >
                  <X size={12} />
                </button>
                {activeTabIndex === i && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400" />}
              </div>
            ))}
          </div>

          {/* EDITOR */}
          <div className="flex-1 relative overflow-hidden">
            {activeTabIndex === null ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-lime-400/5 border border-lime-400/10 flex items-center justify-center text-lime-400/20">
                  <Code2 size={40} />
                </div>
                <div>
                  <h3 className="text-white/60 font-bold">Squeeze IDE</h3>
                  <p className="text-white/20 text-[11px] max-w-[240px] mt-1 leading-relaxed">
                    Select a file from the explorer to begin coding or ask the AI to generate a system.
                  </p>
                </div>
              </div>
            ) : (
              <Editor
                height="100%"
                language="lua"
                theme="lemonade-theme"
                value={tabs[activeTabIndex]?.content}
                beforeMount={handleEditorWillMount}
                onMount={handleEditorDidMount}
              />
            )}
          </div>

          {/* STATUS BAR */}
          <div className="h-6 bg-[#1a1a24] border-t border-white/10 flex items-center px-3 gap-4 text-[10px] text-white/40 font-mono shrink-0">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", isRojoConnected ? "bg-lime-400" : "bg-white/20")} />
              {isRojoConnected ? "Synced with Rojo" : "Offline"}
            </div>
            <div className="w-px h-3 bg-white/10" />
            <div>Luau</div>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <span>Ln 1, Col 1</span>
              <span>UTF-8</span>
              <button
                onClick={saveCurrentFile}
                className={cn(
                  "flex items-center gap-1 hover:text-white transition-colors cursor-pointer",
                  activeTabIndex !== null && tabs[activeTabIndex].isModified && "text-orange-400"
                )}
              >
                <History size={12} />
                History
              </button>
            </div>
          </div>
        </div>

        {/* CHAT SIDEBAR */}
        <div className="w-[360px] bg-[#14141b] border-l border-white/10 flex flex-col shrink-0">
          <div className="h-11 px-4 flex items-center justify-between border-b border-white/10 bg-[#1a1a24]/50">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-lime-400 fill-lime-400/20" />
              <span className="font-bold text-[13px]">AI Assistant</span>
            </div>
            <button
              onClick={() => setMessages([])}
              className="p-1.5 rounded-md hover:bg-white/5 text-white/20 hover:text-white transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-4 opacity-40">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                  <Plus size={24} />
                </div>
                <p className="text-[12px]">Ask me to build a system, debug code, or plan architecture. I'll code right in your editor.</p>
              </div>
            )}

            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex flex-col gap-2 max-w-[90%]",
                  m.role === 'user' ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div className={cn(
                  "px-3 py-2 rounded-2xl text-[12px] leading-relaxed shadow-sm whitespace-pre-wrap",
                  m.role === 'user'
                    ? "bg-lime-400 text-black rounded-tr-none font-medium"
                    : "bg-white/5 border border-white/10 text-white/80 rounded-tl-none"
                )}>
                  {m.content}
                </div>

                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity ml-1 mt-0.5">
                    <button className="text-white/30 hover:text-white transition-colors cursor-pointer"><ThumbsUp size={12} /></button>
                    <button className="text-white/30 hover:text-white transition-colors cursor-pointer"><ThumbsDown size={12} /></button>
                    <button className="text-white/30 hover:text-white transition-colors cursor-pointer"><Copy size={12} /></button>
                  </div>
                )}
              </motion.div>
            ))}

            {isTyping && (
              <div className="flex gap-1 p-2 bg-white/5 rounded-full w-fit animate-pulse ml-2">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400" />
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400/30" />
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/10 flex flex-col gap-3 bg-[#0e0e12]">
            <div className="flex items-center gap-2 mb-1">
              <select
                value={activeModelId}
                onChange={(e) => {
                  setActiveModelId(e.target.value);
                  localStorage.setItem('sq_model', e.target.value);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[11px] text-lime-400 outline-none cursor-pointer hover:bg-white/10 focus:border-lime-400/50 focus:bg-[#1a1a24] transition-all"
                title="Select AI Model"
              >
                <optgroup label="Puter.js Models (Free)">
                  {AI_MODELS.filter(m => m.provider === 'puter').map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
                <optgroup label="OpenRouter Models">
                  {AI_MODELS.filter(m => m.provider === 'openrouter').map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="relative group">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask Squeeze..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-[12px] text-white outline-none focus:border-lime-400/50 focus:bg-white/[0.08] transition-all resize-none min-h-[44px] max-h-[120px]"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="absolute right-2 bottom-2 p-1.5 bg-lime-400 rounded-lg text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(168,228,77,0.4)] disabled:opacity-50 disabled:scale-100 cursor-pointer"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="text-white/40" />
                  Settings
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">OpenRouter API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="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"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[13px] outline-none focus:border-lime-400/50 transition-all text-white"
                  />
                  <p className="text-[10px] text-white/20">Keys are stored locally in your browser.</p>
                </div>
              </div>
              <div className="p-6 bg-[#0e0e12] flex gap-3">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-lime-400 text-black font-bold hover:bg-lime-300 transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isRojoGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRojoGuideOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <RotateCw className="text-lime-400" />
                  Rojo Setup Guide
                </h2>
                <button onClick={() => setIsRojoGuideOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[70vh] flex flex-col gap-6 no-scrollbar">
                <div className="grid grid-cols-[32px_1fr] gap-4">
                  <div className="w-8 h-8 rounded-lg bg-lime-400 text-black flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Install Rojo CLI</h3>
                    <p className="text-[12px] text-white/40 leading-relaxed mb-3">
                      Use Aftman or download the executable from GitHub.
                    </p>
                    <code className="block bg-black/40 p-3 rounded-lg text-[11px] font-mono text-lime-400 border border-white/5">
                      aftman add rojo-rbx/rojo@7.4.1
                    </code>
                  </div>
                </div>

                <div className="grid grid-cols-[32px_1fr] gap-4">
                  <div className="w-8 h-8 rounded-lg bg-lime-400 text-black flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Initialize Project</h3>
                    <p className="text-[12px] text-white/40 leading-relaxed mb-3">
                      Run <code className="text-lime-400">rojo init</code> in your project folder.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[32px_1fr] gap-4">
                  <div className="w-8 h-8 rounded-lg bg-lime-400 text-black flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Start Rojo Serve</h3>
                    <p className="text-[12px] text-white/40 leading-relaxed mb-3">
                      Run the server and connect with the Studio plugin.
                    </p>
                    <code className="block bg-black/40 p-3 rounded-lg text-[11px] font-mono text-lime-400 border border-white/5">
                      rojo serve
                    </code>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-2">How Squeeze works</h4>
                  <p className="text-[12px] text-white/60 leading-relaxed">
                    Squeeze writes directly to your local file system. When Rojo is running, it watches these files and syncs them into Roblox Studio instantly.
                  </p>
                </div>
              </div>
              <div className="p-6 bg-[#0e0e12] flex gap-3">
                <button
                  onClick={() => { setIsRojoGuideOpen(false); connectFolder(); }}
                  className="flex-1 py-3 rounded-xl bg-lime-400 text-black font-bold hover:bg-lime-300 transition-colors shadow-[0_0_20px_rgba(168,228,77,0.2)] cursor-pointer"
                >
                  Connect Folder Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-[#1a1a24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Plus className="text-lime-400" />
                  Insert Object
                </h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                {OBJECT_CATEGORIES.map(category => (
                  <div key={category.name} className="flex flex-col gap-2">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2">{category.name}</h3>
                    <div className="flex flex-col gap-1">
                      {category.items.map(item => (
                        <button
                          key={item}
                          onClick={() => {
                            const name = prompt(`Enter name for the new ${item}:`, item);
                            if (name && selectedParentNode) createObject(selectedParentNode, item, name);
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white text-[12px] transition-all group text-left"
                        >
                          <VanillaIcon id={item} className="opacity-60 group-hover:opacity-100" />
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
