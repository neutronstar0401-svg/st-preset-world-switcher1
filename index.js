/**
 * 预设与世界书智能切换管家 (Preset & WorldInfo Switcher)
 * 版本: v1.1.0
 * 特性: 全端自适应 (手机/平板/电脑)、屏幕居中、精细条目开关、无损预设与世界书绑定
 */
(function () {
    const MODULE_NAME = 'st_preset_world_switcher';
    let activeTab = 'triggers'; // triggers | preset | worldinfo | backup
    let mobileView = 'editor'; // 'list' | 'editor'
    let currentProfileId = null;
    let searchQuery = '';

    function getST() {
        return (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) ? SillyTavern.getContext() : null;
    }

    function showToast(msg, type = 'info') {
        if (typeof toastr !== 'undefined' && toastr[type]) {
            toastr[type](msg);
        } else {
            console.log(`[PWS-${type.toUpperCase()}] ${msg}`);
        }
    }

    function getSettings() {
        const ctx = getST();
        if (!ctx) {
            return {
                enabled: true,
                defaultProfileId: '',
                profiles: [
                    {
                        id: 'prof_default',
                        name: '默认配置方案',
                        presetName: '',
                        applyPromptToggles: false,
                        promptStates: {},
                        chatWorld: '',
                        entryStates: {},
                        bindings: { chats: [], characters: [] }
                    }
                ]
            };
        }

        if (!ctx.extensionSettings[MODULE_NAME]) {
            ctx.extensionSettings[MODULE_NAME] = {
                enabled: true,
                defaultProfileId: '',
                profiles: [
                    {
                        id: 'prof_' + Date.now(),
                        name: '默认方案',
                        presetName: '',
                        applyPromptToggles: false,
                        promptStates: {},
                        chatWorld: '',
                        entryStates: {},
                        bindings: { chats: [], characters: [] }
                    }
                ]
            };
        }
        return ctx.extensionSettings[MODULE_NAME];
    }

    function saveSettings() {
        const ctx = getST();
        if (ctx && typeof ctx.saveSettingsDebounced === 'function') {
            ctx.saveSettingsDebounced();
        }
    }

    function getCurrentTarget() {
        const ctx = getST();
        if (!ctx) return { chatId: '', charKey: '', charDisplayName: '' };
        const chatId = String(ctx.chatId || '').trim();
        let charKey = '';
        let charDisplayName = '';

        if (ctx.characterId !== undefined && ctx.characters && ctx.characters[ctx.characterId]) {
            const charObj = ctx.characters[ctx.characterId];
            charKey = charObj.avatar || charObj.name || String(ctx.characterId);
            charDisplayName = charObj.name || charObj.avatar || '当前角色';
        } else if (ctx.groupId) {
            charKey = `group:${ctx.groupId}`;
            charDisplayName = `群组 (${ctx.groupId})`;
        }

        return { chatId, charKey, charDisplayName };
    }

    // 匹配并应用方案
    async function onChatChanged() {
        const ctx = getST();
        if (!ctx) return;
        const s = getSettings();
        if (!s.enabled) return;

        const { chatId, charKey } = getCurrentTarget();
        let matched = null;
        let reason = '';

        // 1. 优先匹配具体聊天绑定
        if (chatId) {
            matched = s.profiles.find(p => p.bindings?.chats?.includes(chatId));
            if (matched) reason = `聊天特定绑定 (${chatId.slice(0, 10)}...)`;
        }
        // 2. 其次匹配角色卡绑定
        if (!matched && charKey) {
            matched = s.profiles.find(p => p.bindings?.characters?.includes(charKey));
            if (matched) reason = `角色卡绑定 (${charKey})`;
        }
        // 3. 兜底匹配全局默认方案
        if (!matched && s.defaultProfileId) {
            matched = s.profiles.find(p => p.id === s.defaultProfileId);
            if (matched) reason = '全局默认方案';
        }

        if (matched) {
            await applyProfile(matched, reason);
        }
    }

    // 执行应用方案
    async function applyProfile(p, reason) {
        if (!p) return;
        const ctx = getST();
        if (!ctx) {
            showToast(`已应用方案：${p.name} (${reason || '手动'})`, 'success');
            return;
        }

        try {
            // 1. 切换预设
            if (p.presetName && ctx.getPresetManager) {
                const pm = ctx.getPresetManager();
                if (pm && typeof pm.selectPreset === 'function') {
                    await pm.selectPreset(p.presetName);
                }
            }

            // 2. 预设内部条目开关
            if (p.applyPromptToggles && p.promptStates && Object.keys(p.promptStates).length > 0) {
                const states = p.promptStates;
                if (ctx.oai_settings?.prompt_order) {
                    for (const b of ctx.oai_settings.prompt_order) {
                        if (Array.isArray(b?.order)) {
                            for (const it of b.order) {
                                if (it && Object.prototype.hasOwnProperty.call(states, it.identifier)) {
                                    it.enabled = Boolean(states[it.identifier]);
                                }
                            }
                        }
                    }
                }
                saveSettings();
            }

            // 3. 切换世界书
            if (p.chatWorld && ctx.chatMetadata) {
                ctx.chatMetadata['world_info'] = p.chatWorld;
                if (ctx.saveMetadata) await ctx.saveMetadata();
            }

            // 4. 世界书条目UID精细开关
            if (p.entryStates && typeof p.entryStates === 'object' && ctx.loadWorldInfo && ctx.saveWorldInfo) {
                for (const [bName, uids] of Object.entries(p.entryStates)) {
                    try {
                        const book = await ctx.loadWorldInfo(bName);
                        if (book?.entries) {
                            let mod = false;
                            for (const [uid, enable] of Object.entries(uids)) {
                                const entry = book.entries[uid];
                                if (entry && Boolean(entry.disable) === Boolean(enable)) {
                                    entry.disable = !enable;
                                    mod = true;
                                }
                            }
                            if (mod) await ctx.saveWorldInfo(bName, book, true);
                        }
                    } catch (err) {
                        console.error('[PWS] 世界书条目更新失败:', err);
                    }
                }
            }

            showToast(`已成功切换方案：${p.name} (${reason || '手动'})`, 'success');
        } catch (e) {
            console.error('[PWS] 应用方案异常:', e);
            showToast(`方案切换异常: ${e.message}`, 'error');
        }
    }

    // 辅助转义
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // 打开居中、响应式大弹窗
    function openManagerModal() {
        $('#pws-modal-backdrop').remove();
        const s = getSettings();
        if (!s.profiles || s.profiles.length === 0) {
            s.profiles = [{
                id: 'prof_' + Date.now(),
                name: '默认方案',
                presetName: '',
                applyPromptToggles: false,
                promptStates: {},
                chatWorld: '',
                entryStates: {},
                bindings: { chats: [], characters: [] }
            }];
        }

        // 当前选中的方案
        let currentProfile = s.profiles.find(p => p.id === currentProfileId) || s.profiles[0];
        currentProfileId = currentProfile.id;

        const { chatId, charKey, charDisplayName } = getCurrentTarget();

        // 渲染外层框架结构
        const modalHtml = `
        <div id="pws-modal-backdrop" role="dialog" aria-modal="true">
            <div id="pws-modal-container">
                <!-- 顶部栏 -->
                <div class="pws-modal-header">
                    <div class="pws-header-title-box">
                        <div class="pws-header-icon">⚡</div>
                        <div class="pws-modal-title">预设与世界书智能切换管家</div>
                    </div>
                    <div class="pws-header-right">
                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem; margin-right:8px;">
                            <input type="checkbox" id="pws-modal-global-enable" ${s.enabled ? 'checked' : ''} />
                            <span>自动切换总开关</span>
                        </label>
                        <button id="pws-modal-close" class="pws-btn pws-btn-sm" title="关闭弹窗 (Esc)">✕ 关闭</button>
                    </div>
                </div>

                <!-- 移动端视区切换器 -->
                <div class="pws-mobile-view-tabs">
                    <button class="pws-mobile-view-btn ${mobileView === 'list' ? 'active' : ''}" data-view="list">
                        📋 方案列表 (${s.profiles.length})
                    </button>
                    <button class="pws-mobile-view-btn ${mobileView === 'editor' ? 'active' : ''}" data-view="editor">
                        ⚙ 当前方案配置
                    </button>
                </div>

                <!-- 上下文状态条 (当前聊天与角色卡) -->
                <div class="pws-context-banner">
                    <div class="pws-context-info">
                        <div class="pws-context-item">
                            <span style="opacity:0.75;">当前会话:</span>
                            <span class="pws-tag-val" title="${escapeHtml(chatId || '未打开会话')}">${escapeHtml(chatId ? chatId.slice(0, 16) + (chatId.length > 16 ? '...' : '') : '未选择')}</span>
                        </div>
                        <div class="pws-context-item">
                            <span style="opacity:0.75;">当前卡片:</span>
                            <span class="pws-tag-val" title="${escapeHtml(charKey || '未选择卡片')}">${escapeHtml(charDisplayName || charKey || '未选择')}</span>
                        </div>
                    </div>
                    <div class="pws-quick-actions">
                        <button id="pws-quick-bind-chat" class="pws-btn pws-btn-sm">
                            ${chatId && currentProfile.bindings?.chats?.includes(chatId) ? '✓ 已绑当前会话' : '+ 绑定当前会话'}
                        </button>
                        <button id="pws-quick-bind-char" class="pws-btn pws-btn-sm">
                            ${charKey && currentProfile.bindings?.characters?.includes(charKey) ? '✓ 已绑当前角色' : '+ 绑定当前角色'}
                        </button>
                    </div>
                </div>

                <!-- 双栏主体区 -->
                <div class="pws-modal-body ${mobileView === 'list' ? 'show-list-view' : ''}">
                    <!-- 左侧方案列表 -->
                    <div class="pws-sidebar">
                        <div class="pws-sidebar-toolbar">
                            <button id="pws-create-profile-btn" class="pws-btn pws-btn-primary" style="width:100%;">
                                + 新建方案
                            </button>
                            <input type="text" id="pws-filter-input" class="pws-search-input" placeholder="搜索方案名称..." value="${escapeHtml(searchQuery)}" />
                        </div>
                        <div class="pws-profile-list" id="pws-profile-items-box">
                            <!-- 动态注入方案卡片 -->
                        </div>
                    </div>

                    <!-- 右侧详情编辑区 -->
                    <div class="pws-editor-container" id="pws-editor-box">
                        <!-- 动态注入编辑内容 -->
                    </div>
                </div>
            </div>
        </div>
        `;

        $('body').append(modalHtml);

        // 渲染左侧方案列表卡片
        function renderSidebar() {
            const listEl = $('#pws-profile-items-box');
            let filtered = s.profiles;
            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                filtered = s.profiles.filter(p => p.name.toLowerCase().includes(q));
            }

            if (filtered.length === 0) {
                listEl.html('<div style="text-align:center; padding:24px 12px; opacity:0.6; font-size:0.85rem;">无匹配方案</div>');
                return;
            }

            let html = '';
            for (const p of filtered) {
                const isSelected = p.id === currentProfile.id;
                const isDefault = p.id === s.defaultProfileId;
                const chatCount = p.bindings?.chats?.length || 0;
                const charCount = p.bindings?.characters?.length || 0;

                html += `
                <div class="pws-profile-card ${isSelected ? 'active' : ''}" data-id="${p.id}">
                    <div class="pws-pcard-header">
                        <span class="pws-pcard-name">${escapeHtml(p.name)}</span>
                        ${isDefault ? '<span class="pws-badge pws-badge-blue">全局默认</span>' : ''}
                    </div>
                    <div class="pws-pcard-desc">
                        <span>💬 聊天:${chatCount}</span>
                        <span>👤 角色:${charCount}</span>
                        ${p.presetName ? `<span style="overflow:hidden; text-overflow:ellipsis; max-width:80px;">⚙ ${escapeHtml(p.presetName)}</span>` : ''}
                    </div>
                </div>
                `;
            }
            listEl.html(html);
        }

        // 渲染右侧方案编辑区
        function renderEditor() {
            const editorEl = $('#pws-editor-box');
            const ctx = getST();
            const pm = ctx?.getPresetManager ? ctx.getPresetManager() : null;
            const pList = pm?.getPresetList ? pm.getPresetList() : [];
            const pArr = Array.isArray(pList) ? pList : Object.keys(pList || {});
            const currentWiName = ctx?.chatMetadata ? ctx.chatMetadata['world_info'] : '';
            const isDefault = currentProfile.id === s.defaultProfileId;

            // 预设下拉选项
            let presetOptions = `<option value="">-- 不修改预设 (保持当前不变) --</option>`;
            for (const name of pArr) {
                presetOptions += `<option value="${escapeHtml(name)}" ${currentProfile.presetName === name ? 'selected' : ''}>${escapeHtml(name)}</option>`;
            }

            // 绑定列表 chips
            const chatChips = (currentProfile.bindings?.chats || []).map(c => `
                <span class="pws-chip">
                    <span>💬 ${escapeHtml(c.slice(0, 16))}</span>
                    <span class="pws-chip-del" data-action="del-chat" data-val="${escapeHtml(c)}">✕</span>
                </span>
            `).join('');

            const charChips = (currentProfile.bindings?.characters || []).map(k => `
                <span class="pws-chip">
                    <span>👤 ${escapeHtml(k)}</span>
                    <span class="pws-chip-del" data-action="del-char" data-val="${escapeHtml(k)}">✕</span>
                </span>
            `).join('');

            // 提示词条目数
            const promptItemCount = Object.keys(currentProfile.promptStates || {}).length;
            // 世界书条目规则
            const worldBookCount = Object.keys(currentProfile.entryStates || {}).length;

            editorEl.html(`
                <!-- 方案标题栏与主操作按钮 -->
                <div class="pws-editor-header">
                    <div class="pws-name-group">
                        <span style="font-size:0.86rem; font-weight:600; white-space:nowrap;">方案名称:</span>
                        <input type="text" id="pws-curr-name-input" class="pws-input-text" value="${escapeHtml(currentProfile.name)}" placeholder="方案名称..." />
                    </div>
                    <div class="pws-editor-actions">
                        <button id="pws-apply-now-btn" class="pws-btn pws-btn-primary" title="立即激活此方案">⚡ 立即生效</button>
                        <button id="pws-copy-prof-btn" class="pws-btn pws-btn-sm" title="复制此方案为新方案">复制</button>
                        <button id="pws-del-prof-btn" class="pws-btn pws-btn-danger pws-btn-sm" title="删除此方案">删除</button>
                    </div>
                </div>

                <!-- 选项卡导航栏 -->
                <div class="pws-tab-bar">
                    <button class="pws-tab-item ${activeTab === 'triggers' ? 'active' : ''}" data-tab="triggers">🎯 触发与绑定规则</button>
                    <button class="pws-tab-item ${activeTab === 'preset' ? 'active' : ''}" data-tab="preset">⚙ 预设与Prompt项</button>
                    <button class="pws-tab-item ${activeTab === 'worldinfo' ? 'active' : ''}" data-tab="worldinfo">📖 世界书与条目</button>
                    <button class="pws-tab-item ${activeTab === 'backup' ? 'active' : ''}" data-tab="backup">💾 导出与备份</button>
                </div>

                <!-- 选项卡内容 -->
                <div class="pws-tab-content">
                    <!-- Tab 1: 触发与绑定规则 -->
                    <div class="pws-tab-pane" style="display: ${activeTab === 'triggers' ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>🌐 全局默认方案设置</span>
                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem;">
                                    <input type="checkbox" id="pws-set-default-check" ${isDefault ? 'checked' : ''} />
                                    <span>设为全局默认方案</span>
                                </label>
                            </div>
                            <div class="pws-section-hint">当切换到的聊天或角色未绑定任何专属方案时，将自动兜底应用此方案。</div>
                        </div>

                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>💬 绑定的聊天记录 (${currentProfile.bindings?.chats?.length || 0})</span>
                                <button id="pws-add-cur-chat-btn" class="pws-btn pws-btn-sm">
                                    ${chatId && currentProfile.bindings?.chats?.includes(chatId) ? '解绑当前聊天' : '+ 绑定当前会话'}
                                </button>
                            </div>
                            <div class="pws-section-hint">当打开这些聊天记录时，会自动切换为此方案。</div>
                            <div class="pws-chips-container">
                                ${chatChips || '<span style="font-size:0.8rem; opacity:0.6;">暂无绑定的聊天记录</span>'}
                            </div>
                        </div>

                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>👤 绑定的角色卡 / 群组 (${currentProfile.bindings?.characters?.length || 0})</span>
                                <button id="pws-add-cur-char-btn" class="pws-btn pws-btn-sm">
                                    ${charKey && currentProfile.bindings?.characters?.includes(charKey) ? '解绑当前角色' : '+ 绑定当前角色'}
                                </button>
                            </div>
                            <div class="pws-section-hint">当切换到这些角色或群组时，自动生效此方案。</div>
                            <div class="pws-chips-container">
                                ${charChips || '<span style="font-size:0.8rem; opacity:0.6;">暂无绑定的角色卡</span>'}
                            </div>
                        </div>
                    </div>

                    <!-- Tab 2: 预设与Prompt项 -->
                    <div class="pws-tab-pane" style="display: ${activeTab === 'preset' ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>🎯 目标预设</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                                <select id="pws-preset-select" class="pws-input-text" style="max-width:360px;">
                                    ${presetOptions}
                                </select>
                            </div>
                            <div class="pws-section-hint">切换此方案时，将自动调用 SillyTavern 的预设管理器加载该预设。</div>
                        </div>

                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>🎛 预设内部条目精细开关 (Prompt Order)</span>
                                <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.85rem;">
                                    <input type="checkbox" id="pws-apply-prompt-check" ${currentProfile.applyPromptToggles ? 'checked' : ''} />
                                    <span>同步切换内部条目启用状态</span>
                                </label>
                            </div>
                            <div class="pws-section-hint">可记录特定条目（如越狱、主设定、思绪等）的开关状态并精准复原。</div>
                            <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
                                <button id="pws-snap-prompt-btn" class="pws-btn">📸 录入当前酒馆提示词条目状态</button>
                                <span style="font-size:0.82rem; opacity:0.7;">已录入条目: <b>${promptItemCount}</b> 项</span>
                            </div>

                            ${promptItemCount > 0 ? `
                                <div class="pws-entry-scroll-box" style="margin-top:8px;">
                                    ${Object.entries(currentProfile.promptStates).map(([id, state]) => `
                                        <div class="pws-entry-row">
                                            <span style="font-family:monospace; font-size:0.82rem;">${escapeHtml(id)}</span>
                                            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                                <input type="checkbox" class="pws-prompt-item-check" data-id="${escapeHtml(id)}" ${state ? 'checked' : ''} />
                                                <span style="font-size:0.8rem;">${state ? '启用' : '禁用'}</span>
                                            </label>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Tab 3: 世界书与条目 -->
                    <div class="pws-tab-pane" style="display: ${activeTab === 'worldinfo' ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>📖 聊天世界书绑定</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                <input type="text" id="pws-world-input" class="pws-input-text" style="max-width:360px;" placeholder="填入世界书名称..." value="${escapeHtml(currentProfile.chatWorld || '')}" />
                                <button id="pws-fill-cur-world-btn" class="pws-btn pws-btn-sm" title="填入当前会话正在使用的世界书">填入当前世界书 (${escapeHtml(currentWiName || '无')})</button>
                            </div>
                            <div class="pws-section-hint">切换此方案时，会自动将此聊天绑定的主世界书更新为指定的世界书。</div>
                        </div>

                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>📑 世界书条目 UID 精准开关</span>
                            </div>
                            <div class="pws-section-hint">支持对世界书内个别条目（如特定角色设定、背景章节）进行开关管理，无需整本替换。</div>
                            <div style="display:flex; align-items:center; gap:8px; margin-top:4px; flex-wrap:wrap;">
                                <button id="pws-snap-world-btn" class="pws-btn">📸 一键录入当前世界书所有条目状态</button>
                                <span style="font-size:0.82rem; opacity:0.7;">已录入规则: <b>${worldBookCount}</b> 本世界书</span>
                            </div>

                            ${worldBookCount > 0 ? `
                                <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                                    ${Object.entries(currentProfile.entryStates).map(([bookName, entries]) => `
                                        <div style="border:1px solid var(--pws-border); border-radius:6px; padding:8px 10px; background:rgba(0,0,0,0.2);">
                                            <div style="font-weight:600; font-size:0.88rem; margin-bottom:6px;">📕 ${escapeHtml(bookName)} (${Object.keys(entries).length} 项)</div>
                                            <div class="pws-entry-scroll-box" style="max-height:160px;">
                                                ${Object.entries(entries).map(([uid, enabled]) => `
                                                    <div class="pws-entry-row">
                                                        <span style="font-family:monospace; font-size:0.8rem;">UID: ${escapeHtml(uid)}</span>
                                                        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                                                            <input type="checkbox" class="pws-entry-item-check" data-book="${escapeHtml(bookName)}" data-uid="${escapeHtml(uid)}" ${enabled ? 'checked' : ''} />
                                                            <span style="font-size:0.8rem;">${enabled ? '启用' : '禁用'}</span>
                                                        </label>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Tab 4: 备份与导入导出 -->
                    <div class="pws-tab-pane" style="display: ${activeTab === 'backup' ? 'flex' : 'none'}; flex-direction:column; gap:12px;">
                        <div class="pws-section-card">
                            <div class="pws-section-title">
                                <span>📤 配置备份与还原</span>
                            </div>
                            <div class="pws-section-hint">您可以导出方案为 JSON 文件，或者将已导出的方案复制导入到其他设备中。</div>
                            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
                                <button id="pws-export-json-btn" class="pws-btn">📋 复制所有方案 JSON 到剪贴板</button>
                                <button id="pws-import-json-btn" class="pws-btn">📥 导入配置 JSON</button>
                            </div>
                            <textarea id="pws-json-io-box" class="pws-input-text" style="height:120px; font-family:monospace; font-size:0.8rem; margin-top:6px;" placeholder="粘贴导入的 JSON 数据..."></textarea>
                        </div>
                    </div>
                </div>
            `);

            // 绑定详情区内的各类事件
            bindEditorEvents();
        }

        // 详情区事件监听
        function bindEditorEvents() {
            const ctx = getST();
            const { chatId, charKey } = getCurrentTarget();

            // 方案名称实时修改
            $('#pws-curr-name-input').off('input').on('input', function () {
                currentProfile.name = $(this).val();
                saveSettings();
                renderSidebar();
            });

            // 立即应用当前方案
            $('#pws-apply-now-btn').off('click').on('click', () => {
                applyProfile(currentProfile, '手动执行');
            });

            // 复制当前方案
            $('#pws-copy-prof-btn').off('click').on('click', () => {
                const cloned = JSON.parse(JSON.stringify(currentProfile));
                cloned.id = 'prof_' + Date.now();
                cloned.name = `${currentProfile.name} (副本)`;
                s.profiles.push(cloned);
                currentProfile = cloned;
                currentProfileId = cloned.id;
                saveSettings();
                showToast(`已复制方案为「${cloned.name}」`, 'success');
                renderSidebar();
                renderEditor();
            });

            // 删除当前方案
            $('#pws-del-prof-btn').off('click').on('click', () => {
                if (s.profiles.length <= 1) {
                    showToast('至少需要保留一个方案！', 'warning');
                    return;
                }
                if (confirm(`确定要删除方案「${currentProfile.name}」吗？`)) {
                    s.profiles = s.profiles.filter(p => p.id !== currentProfile.id);
                    currentProfile = s.profiles[0];
                    currentProfileId = currentProfile.id;
                    saveSettings();
                    showToast('已删除方案', 'info');
                    renderSidebar();
                    renderEditor();
                }
            });

            // 选项卡切换
            $('.pws-tab-item').off('click').on('click', function () {
                activeTab = $(this).data('tab');
                renderEditor();
            });

            // 设为全局默认方案
            $('#pws-set-default-check').off('change').on('change', function () {
                if ($(this).is(':checked')) {
                    s.defaultProfileId = currentProfile.id;
                } else if (s.defaultProfileId === currentProfile.id) {
                    s.defaultProfileId = '';
                }
                saveSettings();
                renderSidebar();
                renderEditor();
            });

            // 绑定/解绑当前会话
            $('#pws-add-cur-chat-btn').off('click').on('click', () => {
                if (!chatId) {
                    showToast('当前未打开任何会话！', 'warning');
                    return;
                }
                if (!currentProfile.bindings) currentProfile.bindings = { chats: [], characters: [] };
                if (!currentProfile.bindings.chats) currentProfile.bindings.chats = [];

                if (currentProfile.bindings.chats.includes(chatId)) {
                    currentProfile.bindings.chats = currentProfile.bindings.chats.filter(c => c !== chatId);
                    showToast('已从该方案解绑当前会话', 'info');
                } else {
                    currentProfile.bindings.chats.push(chatId);
                    showToast('已绑定当前会话至此方案', 'success');
                }
                saveSettings();
                updateContextBanner();
                renderSidebar();
                renderEditor();
            });

            // 绑定/解绑当前角色
            $('#pws-add-cur-char-btn').off('click').on('click', () => {
                if (!charKey) {
                    showToast('当前未选择任何角色卡！', 'warning');
                    return;
                }
                if (!currentProfile.bindings) currentProfile.bindings = { chats: [], characters: [] };
                if (!currentProfile.bindings.characters) currentProfile.bindings.characters = [];

                if (currentProfile.bindings.characters.includes(charKey)) {
                    currentProfile.bindings.characters = currentProfile.bindings.characters.filter(k => k !== charKey);
                    showToast('已从该方案解绑当前角色', 'info');
                } else {
                    currentProfile.bindings.characters.push(charKey);
                    showToast('已绑定当前角色至此方案', 'success');
                }
                saveSettings();
                updateContextBanner();
                renderSidebar();
                renderEditor();
            });

            // 单个 Chip 删除事件
            $('.pws-chip-del').off('click').on('click', function () {
                const action = $(this).data('action');
                const val = String($(this).data('val'));
                if (action === 'del-chat' && currentProfile.bindings?.chats) {
                    currentProfile.bindings.chats = currentProfile.bindings.chats.filter(c => c !== val);
                } else if (action === 'del-char' && currentProfile.bindings?.characters) {
                    currentProfile.bindings.characters = currentProfile.bindings.characters.filter(k => k !== val);
                }
                saveSettings();
                updateContextBanner();
                renderSidebar();
                renderEditor();
            });

            // 预设选择
            $('#pws-preset-select').off('change').on('change', function () {
                currentProfile.presetName = $(this).val();
                saveSettings();
                renderSidebar();
            });

            // 同步 Prompt 条目启用开关
            $('#pws-apply-prompt-check').off('change').on('change', function () {
                currentProfile.applyPromptToggles = $(this).is(':checked');
                saveSettings();
            });

            // 拍照录入当前酒馆提示词条目状态
            $('#pws-snap-prompt-btn').off('click').on('click', () => {
                const order = ctx?.oai_settings?.prompt_order?.[0]?.order || [];
                currentProfile.promptStates = {};
                for (const it of order) {
                    if (it?.identifier) {
                        currentProfile.promptStates[it.identifier] = Boolean(it.enabled);
                    }
                }
                currentProfile.applyPromptToggles = true;
                saveSettings();
                showToast(`已录入 ${Object.keys(currentProfile.promptStates).length} 个提示词条目当前开关！`, 'success');
                renderEditor();
            });

            // 单个提示词条目勾选
            $('.pws-prompt-item-check').off('change').on('change', function () {
                const id = $(this).data('id');
                const checked = $(this).is(':checked');
                if (!currentProfile.promptStates) currentProfile.promptStates = {};
                currentProfile.promptStates[id] = checked;
                saveSettings();
                $(this).next().text(checked ? '启用' : '禁用');
            });

            // 世界书名称输入
            $('#pws-world-input').off('input').on('input', function () {
                currentProfile.chatWorld = $(this).val();
                saveSettings();
            });

            // 填入当前世界书
            $('#pws-fill-cur-world-btn').off('click').on('click', () => {
                const curWi = ctx?.chatMetadata ? ctx.chatMetadata['world_info'] : '';
                if (!curWi) {
                    showToast('当前聊天未绑定世界书！', 'warning');
                    return;
                }
                $('#pws-world-input').val(curWi).trigger('input');
            });

            // 拍照录入当前世界书条目 UID 状态
            $('#pws-snap-world-btn').off('click').on('click', async () => {
                const wiName = currentProfile.chatWorld || (ctx?.chatMetadata ? ctx.chatMetadata['world_info'] : '');
                if (!wiName || !ctx?.loadWorldInfo) {
                    showToast('请先输入或绑定要录入的世界书名称！', 'warning');
                    return;
                }
                try {
                    const bData = await ctx.loadWorldInfo(wiName);
                    if (!bData?.entries) {
                        showToast(`世界书「${wiName}」中无条目数据！`, 'warning');
                        return;
                    }
                    if (!currentProfile.entryStates) currentProfile.entryStates = {};
                    currentProfile.entryStates[wiName] = {};
                    for (const e of Object.values(bData.entries)) {
                        currentProfile.entryStates[wiName][e.uid] = !e.disable;
                    }
                    saveSettings();
                    showToast(`已成功录入「${wiName}」共 ${Object.keys(currentProfile.entryStates[wiName]).length} 条状态！`, 'success');
                    renderEditor();
                } catch (e) {
                    showToast(`读取世界书失败: ${e.message}`, 'error');
                }
            });

            // 单个世界书条目勾选
            $('.pws-entry-item-check').off('change').on('change', function () {
                const book = $(this).data('book');
                const uid = $(this).data('uid');
                const checked = $(this).is(':checked');
                if (currentProfile.entryStates?.[book]) {
                    currentProfile.entryStates[book][uid] = checked;
                    saveSettings();
                    $(this).next().text(checked ? '启用' : '禁用');
                }
            });

            // 导出配置 JSON
            $('#pws-export-json-btn').off('click').on('click', () => {
                const dataStr = JSON.stringify(s, null, 2);
                $('#pws-json-io-box').val(dataStr);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(dataStr)
                        .then(() => showToast('已将完整配置 JSON 复制到剪贴板！', 'success'))
                        .catch(() => showToast('已生成配置，请手动从输入框复制', 'info'));
                } else {
                    showToast('已生成配置，请从下方文本框复制', 'info');
                }
            });

            // 导入配置 JSON
            $('#pws-import-json-btn').off('click').on('click', () => {
                const val = $('#pws-json-io-box').val().trim();
                if (!val) {
                    showToast('请先在文本框中粘贴要导入的 JSON！', 'warning');
                    return;
                }
                try {
                    const parsed = JSON.parse(val);
                    if (parsed.profiles && Array.isArray(parsed.profiles)) {
                        s.profiles = parsed.profiles;
                        if (parsed.defaultProfileId !== undefined) s.defaultProfileId = parsed.defaultProfileId;
                        if (parsed.enabled !== undefined) s.enabled = parsed.enabled;
                        currentProfile = s.profiles[0];
                        currentProfileId = currentProfile.id;
                        saveSettings();
                        showToast('成功导入配置！', 'success');
                        renderSidebar();
                        renderEditor();
                    } else {
                        showToast('JSON 格式无效，缺少 profiles 数组！', 'error');
                    }
                } catch (e) {
                    showToast('JSON 解析失败，请检查格式！', 'error');
                }
            });
        }

        // 更新顶部上下文快捷操作状态
        function updateContextBanner() {
            const { chatId, charKey } = getCurrentTarget();
            const isChatBound = chatId && currentProfile.bindings?.chats?.includes(chatId);
            const isCharBound = charKey && currentProfile.bindings?.characters?.includes(charKey);

            $('#pws-quick-bind-chat').text(isChatBound ? '✓ 已绑当前会话' : '+ 绑定当前会话');
            $('#pws-quick-bind-char').text(isCharBound ? '✓ 已绑当前角色' : '+ 绑定当前角色');
        }

        // 全局自动切换总开关切换
        $('#pws-modal-global-enable').on('change', function () {
            s.enabled = $(this).is(':checked');
            saveSettings();
            $('#pws-glob-enable').prop('checked', s.enabled);
        });

        // 移动端视图切换（方案列表 vs 详情）
        $('.pws-mobile-view-btn').on('click', function () {
            mobileView = $(this).data('view');
            $('.pws-mobile-view-btn').removeClass('active');
            $(this).addClass('active');
            if (mobileView === 'list') {
                $('.pws-modal-body').addClass('show-list-view');
            } else {
                $('.pws-modal-body').removeClass('show-list-view');
            }
        });

        // 搜索方案过滤
        $('#pws-filter-input').on('input', function () {
            searchQuery = $(this).val();
            renderSidebar();
        });

        // 新建方案
        $('#pws-create-profile-btn').on('click', () => {
            const newP = {
                id: 'prof_' + Date.now(),
                name: `方案 ${s.profiles.length + 1}`,
                presetName: '',
                applyPromptToggles: false,
                promptStates: {},
                chatWorld: '',
                entryStates: {},
                bindings: { chats: [], characters: [] }
            };
            s.profiles.push(newP);
            currentProfile = newP;
            currentProfileId = newP.id;
            saveSettings();
            renderSidebar();
            renderEditor();

            // 移动端自动切到编辑页
            if ($(window).width() <= 768) {
                mobileView = 'editor';
                $('.pws-mobile-view-btn').removeClass('active');
                $('[data-view="editor"]').addClass('active');
                $('.pws-modal-body').removeClass('show-list-view');
            }
        });

        // 方案切换点击
        $(document).off('click', '.pws-profile-card').on('click', '.pws-profile-card', function () {
            const id = $(this).data('id');
            const found = s.profiles.find(p => p.id === id);
            if (found) {
                currentProfile = found;
                currentProfileId = found.id;
                renderSidebar();
                renderEditor();
                updateContextBanner();

                // 移动端点击方案后自动切入编辑页
                if ($(window).width() <= 768) {
                    mobileView = 'editor';
                    $('.pws-mobile-view-btn').removeClass('active');
                    $('[data-view="editor"]').addClass('active');
                    $('.pws-modal-body').removeClass('show-list-view');
                }
            }
        });

        // 顶部快捷绑定按钮
        $('#pws-quick-bind-chat').on('click', () => {
            $('#pws-add-cur-chat-btn').trigger('click');
        });
        $('#pws-quick-bind-char').on('click', () => {
            $('#pws-add-cur-char-btn').trigger('click');
        });

        // 关闭弹窗
        $('#pws-modal-close').on('click', () => $('#pws-modal-backdrop').remove());
        $('#pws-modal-backdrop').on('click', function (e) {
            if (e.target === this) $('#pws-modal-backdrop').remove();
        });

        // ESC 关闭
        $(document).off('keydown.pws').on('keydown.pws', function (e) {
            if (e.key === 'Escape') {
                $('#pws-modal-backdrop').remove();
            }
        });

        // 初始化首次渲染
        renderSidebar();
        renderEditor();
        updateContextBanner();
    }

    // 在 SillyTavern 右侧扩展面板注入优雅抽屉
    function initDrawer() {
        if ($('#pws-main-drawer').length) return;
        const s = getSettings();

        const drawerHtml = `
        <div id="pws-main-drawer" class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>⚡ 智能切换管家</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" style="padding:10px; display:flex; flex-direction:column; gap:10px;">
                <label class="checkbox_label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                    <input type="checkbox" id="pws-glob-enable" ${s.enabled ? 'checked' : ''} />
                    <span>启用切卡/切聊天自动切换</span>
                </label>
                <button id="pws-open-dialog-btn" class="menu_button" style="width:100%; font-weight:600; padding:8px 12px;">
                    ⚙ 打开方案管理中心 (居中全功能)
                </button>
            </div>
        </div>`;

        const $c = $('#extensions_settings2').length ? $('#extensions_settings2') : $('#extensions_settings');
        if ($c.length) $c.append(drawerHtml);
        else if ($('#extensions').length) $('#extensions').append(drawerHtml);

        $('#pws-glob-enable').on('change', function () {
            s.enabled = $(this).is(':checked');
            saveSettings();
        });

        $('#pws-open-dialog-btn').on('click', openManagerModal);
    }

    // 绑定酒馆生命周期
    jQuery(function () {
        const ctx = getST();
        if (ctx && ctx.eventSource && ctx.eventTypes?.CHAT_CHANGED) {
            ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, onChatChanged);
        }
        setTimeout(initDrawer, 1200);
    });

    // 暴露至全局以便调试或快捷调用
    window.PWS = {
        open: openManagerModal,
        getSettings,
        applyProfile,
        onChatChanged
    };
})();
