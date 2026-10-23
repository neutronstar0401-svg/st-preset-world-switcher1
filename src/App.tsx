import React, { useState } from 'react';
import {
  Sliders,
  BookOpen,
  Smartphone,
  Monitor,
  Tablet,
  Copy,
  Check,
  Zap,
  Plus,
  Trash2,
  Share2,
  FileCode,
  Sparkles,
  Search,
  Info
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  presetName: string;
  applyPromptToggles: boolean;
  promptStates: Record<string, boolean>;
  chatWorld: string;
  entryStates: Record<string, Record<string, boolean>>;
  bindings: {
    chats: string[];
    characters: string[];
  };
}

const INITIAL_PROFILES: Profile[] = [
  {
    id: 'prof_cyberpunk',
    name: '赛博朋克深度角色扮演',
    presetName: 'Cyberpunk-Depth-V2',
    applyPromptToggles: true,
    promptStates: {
      'jailbreak': true,
      'nsfw_guidelines': true,
      'world_lore_preface': true,
      'deep_thinking_cot': true,
      'secondary_characters': false
    },
    chatWorld: '夜之城生存编年史',
    entryStates: {
      '夜之城生存编年史': {
        'uid_01_afterlife_bar': true,
        'uid_02_arasaka_tower': true,
        'uid_03_trauma_team': false,
        'uid_04_cyberware_rules': true
      }
    },
    bindings: {
      chats: ['chat_20261023_cyberpunk', 'chat_arasaka_raid'],
      characters: ['露西 (Lucy)', 'v_cyberpunk_male']
    }
  },
  {
    id: 'prof_fantasy',
    name: '中世纪奇幻冒险',
    presetName: 'Fantasy-Roleplay-V3',
    applyPromptToggles: false,
    promptStates: {
      'magic_system_prompt': true,
      'medieval_tone_enhancer': true
    },
    chatWorld: '艾尔登大陆编年史',
    entryStates: {
      '艾尔登大陆编年史': {
        'uid_rune_magic': true,
        'uid_dragon_curse': true
      }
    },
    bindings: {
      chats: ['chat_fantasy_dungeon'],
      characters: ['梅琳娜 (Melina)']
    }
  },
  {
    id: 'prof_code_helper',
    name: '高精度代码助手',
    presetName: 'Code-Architect-Max',
    applyPromptToggles: true,
    promptStates: {
      'strict_typescript': true,
      'no_fluff_cot': true
    },
    chatWorld: '',
    entryStates: {},
    bindings: {
      chats: ['chat_ts_refactor'],
      characters: []
    }
  }
];

const PRESETS = [
  'Cyberpunk-Depth-V2',
  'Fantasy-Roleplay-V3',
  'Code-Architect-Max',
  'Claude-3.7-Thinking-Default',
  'Mistral-Large-Creative',
  'Llama-3.3-70B-Chat'
];

export default function App() {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'features'>('preview');
  const [codeFileTab, setCodeFileTab] = useState<'index.js' | 'style.css' | 'manifest.json'>('index.js');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 扩展运行状态模拟
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [defaultProfileId, setDefaultProfileId] = useState('prof_cyberpunk');
  const [profiles, setProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('prof_cyberpunk');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [detailTab, setDetailTab] = useState<'triggers' | 'preset' | 'worldinfo' | 'backup'>('triggers');
  const [mobileSubView, setMobileSubView] = useState<'list' | 'editor'>('editor');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 模拟酒馆当前上下文
  const [currentChatId, setCurrentChatId] = useState('chat_20261023_cyberpunk');
  const [currentCharKey, setCurrentCharKey] = useState('露西 (Lucy)');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('已复制到剪贴板！');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  const handleAddProfile = () => {
    const newProf: Profile = {
      id: 'prof_' + Date.now(),
      name: `新配置方案 ${profiles.length + 1}`,
      presetName: '',
      applyPromptToggles: false,
      promptStates: {},
      chatWorld: '',
      entryStates: {},
      bindings: { chats: [], characters: [] }
    };
    setProfiles([...profiles, newProf]);
    setSelectedProfileId(newProf.id);
    setMobileSubView('editor');
    showToast(`已创建方案「${newProf.name}」`);
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) {
      showToast('至少需要保留一个方案！');
      return;
    }
    const filtered = profiles.filter(p => p.id !== id);
    setProfiles(filtered);
    setSelectedProfileId(filtered[0].id);
    showToast('方案已删除');
  };

  const handleDuplicateProfile = (prof: Profile) => {
    const cloned: Profile = {
      ...JSON.parse(JSON.stringify(prof)),
      id: 'prof_' + Date.now(),
      name: `${prof.name} (副本)`
    };
    setProfiles([...profiles, cloned]);
    setSelectedProfileId(cloned.id);
    showToast(`已复制为「${cloned.name}」`);
  };

  const updateProfile = (updater: (p: Profile) => Profile) => {
    setProfiles(profiles.map(p => p.id === currentProfile.id ? updater(p) : p));
  };

  const toggleChatBinding = (chatId: string) => {
    if (!chatId) return;
    updateProfile(p => {
      const exists = p.bindings.chats.includes(chatId);
      const newChats = exists
        ? p.bindings.chats.filter(c => c !== chatId)
        : [...p.bindings.chats, chatId];
      return {
        ...p,
        bindings: { ...p.bindings, chats: newChats }
      };
    });
    showToast(currentProfile.bindings.chats.includes(chatId) ? '已解绑当前会话' : '已成功绑定当前会话');
  };

  const toggleCharBinding = (charKey: string) => {
    if (!charKey) return;
    updateProfile(p => {
      const exists = p.bindings.characters.includes(charKey);
      const newChars = exists
        ? p.bindings.characters.filter(k => k !== charKey)
        : [...p.bindings.characters, charKey];
      return {
        ...p,
        bindings: { ...p.bindings, characters: newChars }
      };
    });
    showToast(currentProfile.bindings.characters.includes(charKey) ? '已解绑当前角色' : '已成功绑定当前角色');
  };

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(sidebarSearch.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex flex-col font-sans">
      {/* 顶部工作台全局导航栏 */}
      <header className="h-14 border-b border-white/10 bg-[#12141c]/90 backdrop-blur px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              预设与世界书智能切换管家
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                v1.1.0 完美自适应居中版
              </span>
            </h1>
          </div>
        </div>

        {/* 视口切换器与模式 */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'preview' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>居中可视化预览</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>直接查看/复制代码</span>
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'features' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>功能总结清单</span>
          </button>
        </div>

        {/* 快捷按钮 */}
        <div className="flex items-center gap-2">
          {!isModalOpen && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-1.5 shadow"
            >
              <Zap className="w-3.5 h-3.5" />
              重新呼出居中大弹窗
            </button>
          )}
        </div>
      </header>

      {/* 消息提示浮层 */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-blue-600/90 text-white text-xs font-medium rounded-full shadow-lg backdrop-blur animate-fade-in flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          {toastMessage}
        </div>
      )}

      {/* TAB 1: 可视化自适应交互预览 */}
      {activeTab === 'preview' && (
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
          {/* 顶部模拟控制条 */}
          <div className="h-11 border-b border-white/5 bg-[#141722]/80 px-4 flex items-center justify-between text-xs shrink-0">
            {/* 设备屏幕视口模拟 */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">切换视口适配测试:</span>
              <div className="flex items-center bg-black/30 rounded-lg p-0.5 border border-white/10">
                <button
                  onClick={() => setDeviceMode('desktop')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    deviceMode === 'desktop' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3 h-3" /> 电脑宽屏 (居中卡片)
                </button>
                <button
                  onClick={() => setDeviceMode('tablet')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    deviceMode === 'tablet' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tablet className="w-3 h-3" /> 平板屏幕 (768px)
                </button>
                <button
                  onClick={() => setDeviceMode('mobile')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    deviceMode === 'mobile' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> 手机端 (抽屉/全屏)
                </button>
              </div>
            </div>

            {/* 模拟酒馆当前环境 */}
            <div className="flex items-center gap-4 text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">模拟当前聊天:</span>
                <select
                  value={currentChatId}
                  onChange={e => setCurrentChatId(e.target.value)}
                  className="bg-black/50 border border-white/15 rounded px-2 py-0.5 text-[11px] text-blue-300 outline-none"
                >
                  <option value="chat_20261023_cyberpunk">赛博朋克会话 (chat_cyberpunk)</option>
                  <option value="chat_fantasy_dungeon">地牢奇幻会话 (chat_fantasy)</option>
                  <option value="chat_ts_refactor">代码重构会话 (chat_ts)</option>
                  <option value="chat_random_unbound">未绑定的新对话 (chat_random)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">模拟当前角色:</span>
                <select
                  value={currentCharKey}
                  onChange={e => setCurrentCharKey(e.target.value)}
                  className="bg-black/50 border border-white/15 rounded px-2 py-0.5 text-[11px] text-purple-300 outline-none"
                >
                  <option value="露西 (Lucy)">露西 (Lucy)</option>
                  <option value="梅琳娜 (Melina)">梅琳娜 (Melina)</option>
                  <option value="group:night_city_squad">群组: 夜之城小队</option>
                  <option value="陌生NPC卡片">陌生NPC卡片 (未绑定)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 居中工作台内容区 */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
            {/* 设备外边框模拟 (当选择平板或手机时展示外壳) */}
            <div
              className={`transition-all duration-300 flex flex-col justify-center items-center ${
                deviceMode === 'desktop'
                  ? 'w-full h-full max-w-[1100px]'
                  : deviceMode === 'tablet'
                  ? 'w-[768px] h-[92%] rounded-2xl border-4 border-slate-700 bg-slate-900 shadow-2xl p-2'
                  : 'w-[390px] h-[96%] rounded-[36px] border-8 border-slate-800 bg-black shadow-2xl p-1 overflow-hidden'
              }`}
            >
              {/* 弹窗主体 */}
              {isModalOpen ? (
                <div
                  className={`w-full h-full flex flex-col bg-[#14161f] text-slate-100 border border-white/15 shadow-2xl relative overflow-hidden transition-all duration-200 ${
                    deviceMode === 'mobile' ? 'rounded-[28px]' : 'rounded-2xl max-h-[820px]'
                  }`}
                >
                  {/* 1. 顶部 Header */}
                  <div className="px-4 py-3 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm">
                        ⚡
                      </div>
                      <span className="font-bold text-sm tracking-tight truncate">
                        预设与世界书智能切换管家
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={globalEnabled}
                          onChange={e => {
                            setGlobalEnabled(e.target.checked);
                            showToast(e.target.checked ? '已开启全局自动切换' : '已停用自动切换');
                          }}
                          className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                        />
                        <span className="hidden sm:inline">自动切换总开关</span>
                        <span className="sm:hidden">开关</span>
                      </label>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs transition"
                        title="关闭弹窗"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* 2. 手机端视区切换标签 (在手机模式下显著展现双栏折叠) */}
                  {deviceMode === 'mobile' && (
                    <div className="flex border-b border-white/10 bg-black/30 shrink-0">
                      <button
                        onClick={() => setMobileSubView('list')}
                        className={`flex-1 py-2 text-xs font-semibold text-center transition ${
                          mobileSubView === 'list'
                            ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📋 方案列表 ({profiles.length})
                      </button>
                      <button
                        onClick={() => setMobileSubView('editor')}
                        className={`flex-1 py-2 text-xs font-semibold text-center transition ${
                          mobileSubView === 'editor'
                            ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/10'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        ⚙ 方案详情编辑
                      </button>
                    </div>
                  )}

                  {/* 3. 上下文状态 Banner (当前打开的会话与角色) */}
                  <div className="px-4 py-2 bg-blue-600/10 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">当前会话:</span>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-blue-300 max-w-[150px] truncate">
                          {currentChatId}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">当前角色:</span>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-purple-300 max-w-[150px] truncate">
                          {currentCharKey}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleChatBinding(currentChatId)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                          currentProfile.bindings.chats.includes(currentChatId)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-slate-300'
                        }`}
                      >
                        {currentProfile.bindings.chats.includes(currentChatId)
                          ? '✓ 已绑当前会话'
                          : '+ 绑定此会话'}
                      </button>
                      <button
                        onClick={() => toggleCharBinding(currentCharKey)}
                        className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                          currentProfile.bindings.characters.includes(currentCharKey)
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-slate-300'
                        }`}
                      >
                        {currentProfile.bindings.characters.includes(currentCharKey)
                          ? '✓ 已绑当前角色'
                          : '+ 绑定此角色'}
                      </button>
                    </div>
                  </div>

                  {/* 4. 双栏主体内容区 */}
                  <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* 左侧方案侧边栏 (手机模式下由 mobileSubView 控制) */}
                    {(deviceMode !== 'mobile' || mobileSubView === 'list') && (
                      <div className="w-64 sm:w-68 border-r border-white/10 flex flex-col bg-black/20 shrink-0">
                        <div className="p-3 border-b border-white/10 flex flex-col gap-2">
                          <button
                            onClick={handleAddProfile}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow"
                          >
                            <Plus className="w-3.5 h-3.5" /> 新建方案
                          </button>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                            <input
                              type="text"
                              value={sidebarSearch}
                              onChange={e => setSidebarSearch(e.target.value)}
                              placeholder="搜索方案..."
                              className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* 方案卡片列表 */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                          {filteredProfiles.map(p => {
                            const isSelected = p.id === currentProfile.id;
                            const isDefault = p.id === defaultProfileId;
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setSelectedProfileId(p.id);
                                  if (deviceMode === 'mobile') setMobileSubView('editor');
                                }}
                                className={`p-2.5 rounded-lg border transition cursor-pointer text-left select-none ${
                                  isSelected
                                    ? 'bg-blue-600/20 border-blue-500/60 shadow-sm'
                                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs text-white truncate">
                                    {p.name}
                                  </span>
                                  {isDefault && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono shrink-0">
                                      默认
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                                  <span>💬 {p.bindings.chats.length}</span>
                                  <span>👤 {p.bindings.characters.length}</span>
                                  {p.presetName && (
                                    <span className="text-slate-500 truncate max-w-[80px]">
                                      ⚙ {p.presetName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 右侧详情编辑区 (手机模式下由 mobileSubView 控制) */}
                    {(deviceMode !== 'mobile' || mobileSubView === 'editor') && (
                      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-black/10">
                        {/* 方案名与快捷控制 */}
                        <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/[0.02]">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <span className="text-xs text-slate-400 font-medium shrink-0">方案名:</span>
                            <input
                              type="text"
                              value={currentProfile.name}
                              onChange={e => updateProfile(p => ({ ...p, name: e.target.value }))}
                              className="flex-1 bg-black/40 border border-white/15 rounded-lg px-2.5 py-1 text-sm font-semibold text-white outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                showToast(`已成功立即应用方案：「${currentProfile.name}」！`);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
                            >
                              <Zap className="w-3.5 h-3.5" /> 立即应用生效
                            </button>
                            <button
                              onClick={() => handleDuplicateProfile(currentProfile)}
                              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-medium transition"
                              title="复制方案"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteProfile(currentProfile.id)}
                              className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition"
                              title="删除方案"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 选项卡栏 */}
                        <div className="flex border-b border-white/10 px-3 bg-black/20 overflow-x-auto scrollbar-none shrink-0">
                          <button
                            onClick={() => setDetailTab('triggers')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                              detailTab === 'triggers'
                                ? 'text-blue-400 border-blue-500 font-semibold'
                                : 'text-slate-400 border-transparent hover:text-white'
                            }`}
                          >
                            <Sliders className="w-3.5 h-3.5" /> 触发与绑定规则
                          </button>
                          <button
                            onClick={() => setDetailTab('preset')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                              detailTab === 'preset'
                                ? 'text-blue-400 border-blue-500 font-semibold'
                                : 'text-slate-400 border-transparent hover:text-white'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" /> 预设与Prompt项
                          </button>
                          <button
                            onClick={() => setDetailTab('worldinfo')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                              detailTab === 'worldinfo'
                                ? 'text-blue-400 border-blue-500 font-semibold'
                                : 'text-slate-400 border-transparent hover:text-white'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" /> 世界书与条目
                          </button>
                          <button
                            onClick={() => setDetailTab('backup')}
                            className={`px-3 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                              detailTab === 'backup'
                                ? 'text-blue-400 border-blue-500 font-semibold'
                                : 'text-slate-400 border-transparent hover:text-white'
                            }`}
                          >
                            <Share2 className="w-3.5 h-3.5" /> 备份与导出
                          </button>
                        </div>

                        {/* 选项卡详情区 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {/* TAB 1: 触发与绑定规则 */}
                          {detailTab === 'triggers' && (
                            <>
                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-white">🌐 全局默认方案</span>
                                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                      type="checkbox"
                                      checked={defaultProfileId === currentProfile.id}
                                      onChange={e => {
                                        setDefaultProfileId(e.target.checked ? currentProfile.id : '');
                                        showToast(e.target.checked ? '已将此方案设为全局默认兜底' : '已取消全局默认');
                                      }}
                                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                                    />
                                    <span>设为全局默认方案</span>
                                  </label>
                                </div>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  当切换到任何未绑定的聊天或角色时，自动采用此方案作为兜底。
                                </p>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-white">
                                    💬 绑定的聊天记录 ({currentProfile.bindings.chats.length})
                                  </span>
                                  <button
                                    onClick={() => toggleChatBinding(currentChatId)}
                                    className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-slate-200 transition"
                                  >
                                    {currentProfile.bindings.chats.includes(currentChatId)
                                      ? '解绑当前聊天'
                                      : '+ 绑定当前会话'}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {currentProfile.bindings.chats.length === 0 ? (
                                    <span className="text-xs text-slate-500">暂无绑定聊天</span>
                                  ) : (
                                    currentProfile.bindings.chats.map(c => (
                                      <span
                                        key={c}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-mono"
                                      >
                                        💬 {c}
                                        <button
                                          onClick={() => toggleChatBinding(c)}
                                          className="hover:text-red-400 font-bold"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-white">
                                    👤 绑定的角色卡 / 群组 ({currentProfile.bindings.characters.length})
                                  </span>
                                  <button
                                    onClick={() => toggleCharBinding(currentCharKey)}
                                    className="px-2.5 py-1 rounded text-xs bg-white/10 hover:bg-white/20 text-slate-200 transition"
                                  >
                                    {currentProfile.bindings.characters.includes(currentCharKey)
                                      ? '解绑当前角色'
                                      : '+ 绑定当前角色'}
                                  </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {currentProfile.bindings.characters.length === 0 ? (
                                    <span className="text-xs text-slate-500">暂无绑定角色</span>
                                  ) : (
                                    currentProfile.bindings.characters.map(k => (
                                      <span
                                        key={k}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs"
                                      >
                                        👤 {k}
                                        <button
                                          onClick={() => toggleCharBinding(k)}
                                          className="hover:text-red-400 font-bold"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            </>
                          )}

                          {/* TAB 2: 预设与Prompt项 */}
                          {detailTab === 'preset' && (
                            <>
                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                                <span className="font-semibold text-xs text-white">🎯 关联预设</span>
                                <select
                                  value={currentProfile.presetName}
                                  onChange={e => updateProfile(p => ({ ...p, presetName: e.target.value }))}
                                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                                >
                                  <option value="">-- 不修改预设 (保持当前不变) --</option>
                                  {PRESETS.map(preset => (
                                    <option key={preset} value={preset}>
                                      {preset}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-[11px] text-slate-400">
                                  切换至本方案时，自动通过 SillyTavern PresetManager 选定此预设。
                                </span>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-white">
                                    🎛 预设内部条目独立开关 (Prompt Order)
                                  </span>
                                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                      type="checkbox"
                                      checked={currentProfile.applyPromptToggles}
                                      onChange={e => updateProfile(p => ({ ...p, applyPromptToggles: e.target.checked }))}
                                      className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                                    />
                                    <span>同步启用独立开关</span>
                                  </label>
                                </div>

                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => {
                                      updateProfile(p => ({
                                        ...p,
                                        applyPromptToggles: true,
                                        promptStates: {
                                          'main_jailbreak': true,
                                          'deep_thought_reasoning': true,
                                          'world_lore_preface': true,
                                          'author_notes': false,
                                          'chat_history_depth': true
                                        }
                                      }));
                                      showToast('已录入当前提示词条目的全部开关！');
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition flex items-center gap-1.5"
                                  >
                                    📸 录入当前酒馆提示词条目状态
                                  </button>
                                  <span className="text-xs text-slate-400">
                                    已录入: {Object.keys(currentProfile.promptStates).length} 项
                                  </span>
                                </div>

                                {/* 条目开关列表 */}
                                {Object.keys(currentProfile.promptStates).length > 0 && (
                                  <div className="mt-2 border border-white/10 rounded-lg overflow-hidden divide-y divide-white/5 bg-black/30 max-h-48 overflow-y-auto">
                                    {Object.entries(currentProfile.promptStates).map(([id, enabled]) => (
                                      <div key={id} className="p-2.5 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                                        <span className="font-mono text-slate-300">{id}</span>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={enabled}
                                            onChange={e => {
                                              const checked = e.target.checked;
                                              updateProfile(p => ({
                                                ...p,
                                                promptStates: { ...p.promptStates, [id]: checked }
                                              }));
                                            }}
                                            className="w-4 h-4 rounded accent-blue-500"
                                          />
                                          <span className={enabled ? 'text-green-400' : 'text-slate-500'}>
                                            {enabled ? '启用' : '禁用'}
                                          </span>
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* TAB 3: 世界书与条目 */}
                          {detailTab === 'worldinfo' && (
                            <>
                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2">
                                <span className="font-semibold text-xs text-white">📖 聊天世界书切换</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={currentProfile.chatWorld}
                                    onChange={e => updateProfile(p => ({ ...p, chatWorld: e.target.value }))}
                                    placeholder="输入世界书名称..."
                                    className="flex-1 bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                                  />
                                  <button
                                    onClick={() => {
                                      updateProfile(p => ({ ...p, chatWorld: '夜之城生存编年史' }));
                                      showToast('已填入当前世界书「夜之城生存编年史」');
                                    }}
                                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-slate-200 transition shrink-0"
                                  >
                                    填入当前书
                                  </button>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  切换方案时，自动更新当前会话 metadata 中的主世界书名称。
                                </span>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-white">
                                    📑 世界书条目 UID 精准开关
                                  </span>
                                  <button
                                    onClick={() => {
                                      const book = currentProfile.chatWorld || '夜之城生存编年史';
                                      updateProfile(p => ({
                                        ...p,
                                        entryStates: {
                                          ...p.entryStates,
                                          [book]: {
                                            'uid_01_afterlife_bar': true,
                                            'uid_02_arasaka_tower': true,
                                            'uid_03_trauma_team': false,
                                            'uid_04_cyberware_rules': true
                                          }
                                        }
                                      }));
                                      showToast(`已录入「${book}」所有条目当前开关！`);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-xs bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 transition"
                                  >
                                    📸 录入当前条目状态
                                  </button>
                                </div>

                                {Object.keys(currentProfile.entryStates).length === 0 ? (
                                  <div className="text-xs text-slate-500 py-3 text-center">
                                    暂无录入的世界书条目细化规则，点击上方按钮一键录入。
                                  </div>
                                ) : (
                                  <div className="space-y-3 mt-1">
                                    {Object.entries(currentProfile.entryStates).map(([bookName, entries]) => (
                                      <div key={bookName} className="border border-white/10 rounded-lg p-2.5 bg-black/30">
                                        <div className="font-semibold text-xs text-blue-300 mb-2 flex items-center gap-1.5">
                                          📕 {bookName} ({Object.keys(entries).length} 项)
                                        </div>
                                        <div className="divide-y divide-white/5 border border-white/5 rounded">
                                          {Object.entries(entries).map(([uid, enabled]) => (
                                            <div key={uid} className="p-2 flex items-center justify-between text-xs">
                                              <span className="font-mono text-slate-300">{uid}</span>
                                              <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  checked={enabled}
                                                  onChange={e => {
                                                    const checked = e.target.checked;
                                                    updateProfile(p => ({
                                                      ...p,
                                                      entryStates: {
                                                        ...p.entryStates,
                                                        [bookName]: {
                                                          ...p.entryStates[bookName],
                                                          [uid]: checked
                                                        }
                                                      }
                                                    }));
                                                  }}
                                                  className="w-4 h-4 rounded accent-blue-500"
                                                />
                                                <span className={enabled ? 'text-green-400' : 'text-slate-500'}>
                                                  {enabled ? '启用' : '禁用'}
                                                </span>
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* TAB 4: 备份与导出 */}
                          {detailTab === 'backup' && (
                            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-3">
                              <span className="font-semibold text-xs text-white">💾 JSON 配置导入与导出</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleCopy(JSON.stringify(profiles, null, 2), 'json_all')}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                                >
                                  {copiedKey === 'json_all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                  复制所有方案 JSON
                                </button>
                              </div>
                              <textarea
                                readOnly
                                value={JSON.stringify({ enabled: globalEnabled, defaultProfileId, profiles }, null, 2)}
                                className="w-full h-36 bg-black/60 border border-white/15 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 outline-none"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-[#14161f] border border-white/10 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-white">弹窗已关闭</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    您可以点击下方按钮重新唤出居中管理弹窗。
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    重新打开切换管家
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 直接查看/复制代码 */}
      {activeTab === 'code' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f17]">
          {/* 代码文件选择卡 */}
          <div className="h-12 border-b border-white/10 bg-[#121520] px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCodeFileTab('index.js')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 ${
                  codeFileTab === 'index.js'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
              >
                <span>index.js</span>
                <span className="text-[10px] opacity-70">核心逻辑与居中自适应弹窗</span>
              </button>
              <button
                onClick={() => setCodeFileTab('style.css')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 ${
                  codeFileTab === 'style.css'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
              >
                <span>style.css</span>
                <span className="text-[10px] opacity-70">全端响应式与美观排版样式</span>
              </button>
              <button
                onClick={() => setCodeFileTab('manifest.json')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition flex items-center gap-2 ${
                  codeFileTab === 'manifest.json'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white bg-white/5'
                }`}
              >
                <span>manifest.json</span>
                <span className="text-[10px] opacity-70">酒馆扩展清单配置</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  fetch(`/${codeFileTab}`)
                    .then(r => r.text())
                    .then(t => handleCopy(t, codeFileTab));
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
              >
                {copiedKey === codeFileTab ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                一键复制 {codeFileTab}
              </button>
            </div>
          </div>

          {/* 代码视图区域 */}
          <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300 bg-black/60">
            <CodeViewer fileName={codeFileTab} />
          </div>
        </div>
      )}

      {/* TAB 3: 功能总结清单 */}
      {activeTab === 'features' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
          <div className="border border-blue-500/30 bg-blue-500/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              升级优化要点与全部保留功能总结
            </h2>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              本次重构升级彻底解决了原版在不同设备（手机、平板、电脑）上界面变形、左侧被挤压、弹窗无法居中或溢出屏幕等排版痛点，同时 100% 完整保留并强化了预设、世界书、条目开关和酒馆生命周期钩子的所有功能。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="font-bold text-sm text-blue-400 flex items-center gap-2">
                <Monitor className="w-4 h-4" /> 1. 屏幕绝对居中与全端自适应
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <b>电脑端</b>: 采用 Fixed Backdrop + Flex 绝对居中，锁定在屏幕正中，最大宽 1040px、高 86vh，圆角精致、投影沉浸。
                </li>
                <li>
                  <b>平板端</b>: 自动适配 768px 视口，保证左右双栏比例平衡，侧边栏与详情区均有独立纤细滚动条。
                </li>
                <li>
                  <b>手机端</b>: 自动转换为触控优化的移动端布局，贴底全屏抽屉，顶部提供「📋 方案列表」与「⚙ 方案配置」一键平滑切换，避免横向挤爆。
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                <Sliders className="w-4 h-4" /> 2. 方案触发与双向极速绑定
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <b>当前会话快速绑定</b>: 顶部状态栏自动抓取当前聊天 ID，一键点击「+ 绑定当前会话」或「解绑」。
                </li>
                <li>
                  <b>当前角色卡/群组绑定</b>: 自动抓取角色 Avatar / Name 或 group:id，支持绑定芯片化展示与单个删除。
                </li>
                <li>
                  <b>全局默认兜底方案</b>: 未命中特定绑定时，自动回退到勾选的全局默认方案。
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                <Zap className="w-4 h-4" /> 3. 预设切换与提示词条目细控
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <b>自动切换预设</b>: 通过酒馆 `PresetManager.selectPreset()` 自动加载方案指定的预设。
                </li>
                <li>
                  <b>提示词条目一键快照</b>: 点击「📸 录入当前状态」，自动扫描 `oai_settings.prompt_order` 并存储每个条目状态。
                </li>
                <li>
                  <b>条目级独立控制</b>: 列表可单独开启或禁用越狱、COT思绪、系统设定等条目。
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> 4. 世界书切换与条目UID开关
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
                <li>
                  <b>聊天世界书绑定</b>: 自动切换会话 `chatMetadata['world_info']`。
                </li>
                <li>
                  <b>世界书条目 UID 快照</b>: 读取目标世界书全部条目，录入 `entry.disable` 状态。
                </li>
                <li>
                  <b>精细分项开关</b>: 无需替换整本世界书，即可针对特定章节/人物条目执行针对性开关。
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 辅助代码展示组件
function CodeViewer({ fileName }: { fileName: string }) {
  const [code, setCode] = useState<string>('正在载入代码...');

  React.useEffect(() => {
    fetch(`/${fileName}`)
      .then(r => r.text())
      .then(t => setCode(t))
      .catch(err => setCode(`加载文件失败: ${err}`));
  }, [fileName]);

  return (
    <pre className="p-2 whitespace-pre overflow-x-auto text-[11.5px] font-mono leading-relaxed selection:bg-blue-500/30">
      {code}
    </pre>
  );
}
