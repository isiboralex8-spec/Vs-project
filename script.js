let editor;

require.config({
 paths:{
  'vs':'https://unpkg.com/monaco-editor@0.45.0/min/vs'
 }
});

require(['vs/editor/editor.main'], function(){
    editor = monaco.editor.create(document.getElementById('editor'),{
        value:'',
        language:'javascript',
        theme:'vs',
        automaticLayout:true,
        fontSize: 14,
        fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
        fontLigatures: true,
        wordWrap: 'on',
        minimap: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        formatOnPaste: true,
        formatOnType: true
    });

    // HTML tag suggestions & Emmet boilerplate
    monaco.languages.registerCompletionItemProvider('html', {
        triggerCharacters: ['<', '!'],
        provideCompletionItems: () => {
            const tags = [
                'html','head','body','div','span','h1','h2','h3','h4','h5','h6',
                'p','a','ul','ol','li','section','article','header','footer','nav','main',
                'script','style','link','meta','title','img','button','input','form','label',
                'table','thead','tbody','tr','td','th','br','hr'
            ];
            
            let suggestions = tags.map(tag => {
                const isSelfClosing = ['br','hr','img','meta','link','input'].includes(tag);
                const insertText = isSelfClosing ? `<${tag} />` : `<${tag}>$1</${tag}>`;
                return {
                    label: tag,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: insertText,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'HTML tag',
                    documentation: `Insert <${tag}> tag`
                };
            });

            suggestions.push({
                label: '!',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>\${1:Document}</title>\n</head>\n<body>\n    \${2}\n</body>\n</html>`,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: 'HTML Boilerplate',
                documentation: 'Emmet-style HTML5 Boilerplate'
            });

            return { suggestions };
        }
    });
    
    editor.onDidChangeModelContent(() => {
        if(activeTabId){
            const activeTab = openTabs.find(t => t.id === activeTabId);
            if(activeTab && activeTab.content !== editor.getValue()){
                activeTab.content = editor.getValue();
                if (typeof saveFileSystem === 'function') saveFileSystem();
            }
        }
    });

    initEditorSync();
    renderEditor();
    
    // Sync theme with Monaco
    const savedTheme = localStorage.getItem('vscode-theme') || 'light';
    setTheme(savedTheme);
});

document.addEventListener('DOMContentLoaded', () => {
    initResizers();
    renderExplorer();
    initActivityBar();
    initTerminal();
    initKeyboardShortcuts();
    initContextMenu();
    initDropdowns();
    initTheme();
    initCommandPalette();
    
    // Welcome screen actions
    document.getElementById('welcome-new-file')?.addEventListener('click', () => {
        handleCreateNewFile();
    });
    document.getElementById('welcome-open-file')?.addEventListener('click', () => {
        handleOpenFile();
    });
    document.getElementById('welcome-open-folder')?.addEventListener('click', () => {
        handleOpenFolder();
    });
    document.getElementById('welcome-open-repo')?.addEventListener('click', () => {
        alert("Source Control is a mock panel.");
    });
});

// --- File System State ---
let fileSystem = {
    id: "root",
    name: "vscode-clone-project",
    type: "folder",
    expanded: true,
    children: [
        { id: "1", name: "index.html", type: "file", language: "html", content: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Clone</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>" },
        { id: "2", name: "style.css", type: "file", language: "css", content: "body {\n  background-color: #1e1e1e;\n  color: #d4d4d4;\n}" },
        { id: "3", name: "script.js", type: "file", language: "javascript", content: "console.log('Welcome to JS');\n\nfunction init() {\n  // do something\n}" },
        { id: "4", name: "lib", type: "folder", expanded: true, children: [
            { id: "5", name: "main.dart", type: "file", language: "dart", content: "import 'package:flutter/material.dart';\n\nvoid main() {\n  runApp(const MyApp());\n}\n\nclass MyApp extends StatelessWidget {\n  const MyApp({super.key});\n  @override\n  Widget build(BuildContext context) {\n    return MaterialApp(\n      home: Scaffold(\n        appBar: AppBar(title: const Text('Flutter App')),\n        body: const Center(child: Text('Hello World')),\n      ),\n    );\n  }\n}" }
        ]}
    ]
};

const savedFileSystem = localStorage.getItem('vscode-filesystem');
if (savedFileSystem) {
    try {
        fileSystem = JSON.parse(savedFileSystem);
    } catch (e) {
        console.error("Failed to parse saved file system");
    }
}

function saveFileSystem() {
    localStorage.setItem('vscode-filesystem', JSON.stringify(fileSystem));
}

let openTabs = [{ id: "welcome", name: "Welcome", type: "welcome" }];
let activeTabId = "welcome";

// --- Resizers ---
function initResizers() {
    const sidebar = document.getElementById('sidebar');
    const sidebarResizer = document.getElementById('sidebar-resizer');
    const bottomPanel = document.getElementById('bottom-panel');
    const panelResizer = document.getElementById('panel-resizer');
    
    let isResizingSidebar = false;
    let isResizingPanel = false;

    sidebarResizer.addEventListener('mousedown', (e) => {
        isResizingSidebar = true;
        sidebarResizer.classList.add('active');
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });

    panelResizer.addEventListener('mousedown', (e) => {
        isResizingPanel = true;
        panelResizer.classList.add('active');
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (isResizingSidebar) {
            const newWidth = e.clientX - 48; // 48px is the activity bar width
            if (newWidth > 150 && newWidth < 600) {
                sidebar.style.width = newWidth + 'px';
            }
        } else if (isResizingPanel) {
            const bottomOffset = window.innerHeight - e.clientY - 22; // 22px is the status bar
            if (bottomOffset > 100 && bottomOffset < window.innerHeight - 200) {
                bottomPanel.style.height = bottomOffset + 'px';
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizingSidebar) {
            isResizingSidebar = false;
            sidebarResizer.classList.remove('active');
            document.body.style.cursor = 'default';
        }
        if (isResizingPanel) {
            isResizingPanel = false;
            panelResizer.classList.remove('active');
            document.body.style.cursor = 'default';
        }
    });
}

// --- Explorer Rendering ---
function renderExplorer() {
    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = ''; 
    const rootEl = createTreeNode(fileSystem, 0);
    sidebarContent.appendChild(rootEl);
}

function createTreeNode(node, depth) {
    const el = document.createElement('div');
    el.className = 'tree-node';
    
    const nodeRow = document.createElement('div');
    nodeRow.className = 'tree-node-row';
    nodeRow.style.paddingLeft = (depth * 15 + 10) + 'px';
    
    const iconEl = document.createElement('i');
    if (node.type === 'folder') {
        iconEl.className = node.expanded ? 'fa-solid fa-chevron-down folder-icon' : 'fa-solid fa-chevron-right folder-icon';
        iconEl.style.marginRight = '5px';
        iconEl.style.width = '12px';
    } else {
        if (node.name.endsWith('.html')) iconEl.className = 'fa-brands fa-html5 file-icon html-icon';
        else if (node.name.endsWith('.css')) iconEl.className = 'fa-brands fa-css3-alt file-icon css-icon';
        else if (node.name.endsWith('.js')) iconEl.className = 'fa-brands fa-js file-icon js-icon';
        else if (node.name.endsWith('.dart')) iconEl.className = 'fa-brands fa-flutter file-icon dart-icon';
        else iconEl.className = 'fa-regular fa-file file-icon';
        
        iconEl.style.marginRight = '5px';
        iconEl.style.width = '14px';
        iconEl.style.textAlign = 'center';
    }
    
    const nameEl = document.createElement('span');
    nameEl.textContent = node.name;
    
    nodeRow.appendChild(iconEl);
    nodeRow.appendChild(nameEl);
    el.appendChild(nodeRow);
    
    nodeRow.addEventListener('click', (e) => {
        e.stopPropagation();
        if (node.type === 'folder') {
            node.expanded = !node.expanded;
            renderExplorer();
        } else {
            openFile(node);
        }
    });
    
    if (node.type === 'folder' && node.expanded && node.children) {
        const childrenContainer = document.createElement('div');
        node.children.forEach(child => {
            childrenContainer.appendChild(createTreeNode(child, depth + 1));
        });
        el.appendChild(childrenContainer);
    }
    return el;
}

// --- Editor and Tabs ---
function openFile(node) {
    const existingIndex = openTabs.findIndex(t => t.id === node.id);
    if (existingIndex === -1) {
        openTabs.push(node);
    }
    activeTabId = node.id;
    renderTabs();
    renderEditor();
}

function renderTabs() {
    const tabsContainer = document.getElementById('editor-tabs');
    tabsContainer.innerHTML = '';
    
    openTabs.forEach(tabData => {
        const tabEl = document.createElement('div');
        tabEl.className = 'tab ' + (tabData.id === activeTabId ? 'active' : '');
        
        let iconClass = 'fa-regular fa-file';
        let iconColor = '#555555';
        if (tabData.name.endsWith('.html')) { iconClass = 'fa-brands fa-html5'; iconColor = '#e34c26'; }
        if (tabData.name.endsWith('.css')) { iconClass = 'fa-brands fa-css3-alt'; iconColor = '#264de4'; }
        if (tabData.name.endsWith('.js')) { iconClass = 'fa-brands fa-js'; iconColor = '#f7df1e'; }
        if (tabData.name.endsWith('.dart')) { iconClass = 'fa-brands fa-flutter'; iconColor = '#0175C2'; }
        
        let iconHtml = `<i class="tab-icon ${iconClass}" style="color: ${iconColor}"></i>`;
        if (tabData.type === 'welcome') {
            iconHtml = `<img src="https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg" style="width: 14px; height: 14px; margin-right: 6px;" />`;
        }

        tabEl.innerHTML = `
            ${iconHtml}
            <span>${tabData.name}</span>
            <i class="fa-solid fa-xmark tab-close"></i>
        `;
        
        tabEl.addEventListener('click', () => {
            activeTabId = tabData.id;
            renderTabs();
            renderEditor();
        });
        
        const closeBtn = tabEl.querySelector('.tab-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tabData.id);
        });
        
        tabsContainer.appendChild(tabEl);
    });
}

function closeTab(id) {
    const index = openTabs.findIndex(t => t.id === id);
    if (index !== -1) {
        openTabs.splice(index, 1);
        if (openTabs.length > 0) {
            activeTabId = openTabs[Math.max(0, index - 1)].id;
        } else {
            activeTabId = null;
        }
        renderTabs();
        renderEditor();
    }
}

function renderEditor() {
    const langStatus = document.getElementById('status-language');
    const editorDiv = document.getElementById('editor');
    const welcomeScreen = document.getElementById('welcome-screen');

    if (activeTabId) {
        const activeTab = openTabs.find(t => t.id === activeTabId);
        if (activeTab && activeTab.type === 'welcome') {
            if (editorDiv) editorDiv.style.display = 'none';
            if (welcomeScreen) welcomeScreen.style.display = 'flex';
            if (langStatus) langStatus.textContent = '';
        } else if (editor) {
            if (editorDiv) editorDiv.style.display = 'block';
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            editor.setValue(activeTab.content || '');
            const lang = activeTab.language || "plaintext";
            monaco.editor.setModelLanguage(editor.getModel(), lang);
            if (langStatus) langStatus.textContent = lang.toUpperCase();
        }
    } else {
        if (editorDiv) editorDiv.style.display = 'none';
        if (welcomeScreen) welcomeScreen.style.display = 'flex';
        if (langStatus) langStatus.textContent = '';
    }
}

// --- Editor Sync ---
function initEditorSync() {
    const statusLineCol = document.getElementById('status-line-col');
    
    if (!editor) return;

    editor.onDidChangeCursorPosition((e) => {
        statusLineCol.textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });
}

// --- Terminal ---
let terminal;
function initTerminal() {
    const termContainer = document.getElementById('terminal-container');
    const closePanelBtn = document.getElementById('close-panel-btn');
    const bottomPanel = document.getElementById('bottom-panel');

    closePanelBtn.addEventListener('click', () => {
        bottomPanel.style.display = 'none';
    });

    if (window.Terminal && termContainer) {
        terminal = new Terminal({
            fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
            fontSize: 13,
            theme: {
                background: '#000000',
                foreground: '#d4d4d4',
                cursor: '#d4d4d4'
            },
            cursorBlink: true
        });
        
        terminal.open(termContainer);
        terminal.write('PS C:\\User\\Dev> ');

        let currentLine = '';
        terminal.onKey(e => {
            const ev = e.domEvent;
            const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

            if (ev.keyCode === 13) { // Enter
                terminal.write('\r\n');
                processCommandXterm(currentLine);
                currentLine = '';
                terminal.write('PS C:\\User\\Dev> ');
            } else if (ev.keyCode === 8) { // Backspace
                if (currentLine.length > 0) {
                    currentLine = currentLine.substring(0, currentLine.length - 1);
                    terminal.write('\b \b');
                }
            } else if (printable) {
                currentLine += e.key;
                terminal.write(e.key);
            }
        });
    }
}

function processCommandXterm(cmd) {
    const args = cmd.trim().split(' ');
    const command = args[0].toLowerCase();
    
    if (!command) return;

    if (command === 'help') {
        terminal.write('Available commands:\r\n help  - Show this message\r\n clear - Clear the terminal\r\n echo  - Print text to the terminal\r\n');
    } else if (command === 'clear') {
        terminal.clear();
    } else if (command === 'echo') {
        terminal.write(args.slice(1).join(' ') + '\r\n');
    } else {
        terminal.write('\x1b[31m' + command + ' : The term \'' + command + '\' is not recognized.\x1b[0m\r\n');
    }
}

// --- Activity Bar ---
function initActivityBar() {
    const activityIcons = document.querySelectorAll('.activity-top .activity-icon');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');

    activityIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            activityIcons.forEach(i => i.classList.remove('active'));
            icon.classList.add('active');
            
            const panel = icon.getAttribute('data-panel');
            sidebarTitle.textContent = panel.replace('-', ' ').toUpperCase();
            
            if (panel === 'explorer') {
                renderExplorer();
            } else if (panel === 'search') {
                renderSearch();
            } else {
                sidebarContent.innerHTML = `<div style="padding: 20px; text-align: center; color: #858585;">
                    <i class="${icon.querySelector('i').className}" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                    <p>This is the mock ${panel} panel.</p>
                </div>`;
            }
        });
    });
}

function renderSearch() {
    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
        <div class="search-container">
            <div class="search-input-wrapper">
                <i class="codicon codicon-search" style="color: var(--vscode-activityBar-inactiveFg);"></i>
                <input type="text" id="sidebar-search-input" placeholder="Search" autocomplete="off" spellcheck="false">
            </div>
            <div id="search-results" class="search-results"></div>
        </div>
    `;

    const searchInput = document.getElementById('sidebar-search-input');
    const resultsContainer = document.getElementById('search-results');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        resultsContainer.innerHTML = '';
        if (!query) return;

        const results = searchFiles(fileSystem, query);
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--vscode-activityBar-inactiveFg);">No results found.</div>';
            return;
        }

        results.forEach(res => {
            const fileEl = document.createElement('div');
            fileEl.className = 'search-result-file';
            fileEl.innerHTML = `<i class="codicon codicon-chevron-down"></i> ${res.file.name}`;
            
            const matchesContainer = document.createElement('div');
            
            res.matches.forEach(match => {
                const matchEl = document.createElement('div');
                matchEl.className = 'search-result-match';
                const start = Math.max(0, match.index - 10);
                const end = Math.min(match.line.length, match.index + query.length + 10);
                let snippet = match.line.substring(start, end);
                if (start > 0) snippet = '...' + snippet;
                if (end < match.line.length) snippet = snippet + '...';
                
                const regex = new RegExp(`(${query})`, 'gi');
                snippet = snippet.replace(regex, '<span style="background: rgba(255,255,0,0.3);">$1</span>');
                
                matchEl.innerHTML = snippet;
                matchEl.title = match.line;
                matchEl.addEventListener('click', () => {
                    openFile(res.file);
                });
                matchesContainer.appendChild(matchEl);
            });

            fileEl.addEventListener('click', () => {
                const icon = fileEl.querySelector('i');
                if (matchesContainer.style.display === 'none') {
                    matchesContainer.style.display = 'block';
                    icon.className = 'codicon codicon-chevron-down';
                } else {
                    matchesContainer.style.display = 'none';
                    icon.className = 'codicon codicon-chevron-right';
                }
            });

            resultsContainer.appendChild(fileEl);
            resultsContainer.appendChild(matchesContainer);
        });
    });
    
    // Auto focus search input
    setTimeout(() => searchInput.focus(), 50);
}

function searchFiles(node, query, results = []) {
    if (node.type === 'file' && node.content) {
        const lines = node.content.split('\n');
        const matches = [];
        lines.forEach((line, lineIdx) => {
            const index = line.toLowerCase().indexOf(query.toLowerCase());
            if (index !== -1) {
                matches.push({ lineIdx, line, index });
            }
        });
        if (matches.length > 0) {
            results.push({ file: node, matches });
        }
    } else if (node.children) {
        node.children.forEach(child => searchFiles(child, query, results));
    }
    return results;
}

// --- Context Menu ---
function initContextMenu() {
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.innerHTML = `
        <div class="context-item" id="ctx-new-file">New File</div>
        <div class="context-item" id="ctx-new-folder">New Folder</div>
        <div class="context-separator"></div>
        <div class="context-item" id="ctx-delete">Delete</div>
    `;
    document.body.appendChild(contextMenu);

    let activeNodeForContext = null;

    document.getElementById('sidebar-content').addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const row = e.target.closest('.tree-node-row');
        if (row) {
            document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('active'));
            row.classList.add('active');
            const nameNode = row.querySelector('span');
            if (nameNode) {
                 activeNodeForContext = findNodeByName(fileSystem, nameNode.textContent);
            }
        } else {
            activeNodeForContext = fileSystem;
        }

        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
    });

    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
        document.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('active'));
    });

    document.getElementById('ctx-new-file').addEventListener('click', () => {
        const parent = (activeNodeForContext && activeNodeForContext.type === 'folder') ? activeNodeForContext : fileSystem;
        handleCreateNewFile(parent);
    });

    document.getElementById('ctx-new-folder').addEventListener('click', () => {
        const parent = (activeNodeForContext && activeNodeForContext.type === 'folder') ? activeNodeForContext : fileSystem;
        handleCreateNewFolder(parent);
    });

    document.getElementById('ctx-delete').addEventListener('click', () => {
        if (activeNodeForContext && activeNodeForContext.id !== 'root') {
            if (confirm(`Delete '${activeNodeForContext.name}'?`)) {
                removeNode(fileSystem, activeNodeForContext.id);
                closeTab(activeNodeForContext.id);
                saveFileSystem();
                renderExplorer();
            }
        }
    });
}

function findNodeByName(node, name) {
    if (node.name === name) return node;
    if (node.children) {
        for (let child of node.children) {
            const found = findNodeByName(child, name);
            if (found) return found;
        }
    }
    return null;
}

function removeNode(parent, id) {
    if (parent.children) {
        const index = parent.children.findIndex(c => c.id === id);
        if (index > -1) {
            parent.children.splice(index, 1);
            return true;
        }
        for (let child of parent.children) {
            if (removeNode(child, id)) return true;
        }
    }
    return false;
}

function createFileNode(name) {
    let lang = 'plaintext';
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith('.js')) lang = 'javascript';
    else if (lowerName.endsWith('.html')) lang = 'html';
    else if (lowerName.endsWith('.css')) lang = 'css';
    else if (lowerName.endsWith('.json')) lang = 'json';
    else if (lowerName.endsWith('.dart')) lang = 'dart';
    
    return {
        id: Date.now().toString(),
        name: name,
        type: 'file',
        language: lang,
        content: ''
    };
}

function handleCreateNewFile(parentFolder = fileSystem) {
    const name = prompt("Enter file name:");
    if (name) {
        if (!parentFolder.children) parentFolder.children = [];
        const newNode = createFileNode(name);
        parentFolder.children.push(newNode);
        saveFileSystem();
        renderExplorer();
        openFile(newNode);
    }
}

function handleCreateNewFolder(parentFolder = fileSystem) {
    const name = prompt("Enter folder name:");
    if (name) {
        if (!parentFolder.children) parentFolder.children = [];
        parentFolder.children.push({
            id: Date.now().toString(),
            name: name,
            type: 'folder',
            expanded: true,
            children: []
        });
        saveFileSystem();
        renderExplorer();
    }
}

function handleOpenFile(parentFolder = fileSystem) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!parentFolder.children) parentFolder.children = [];
            const newNode = createFileNode(file.name);
            newNode.content = event.target.result;
            parentFolder.children.push(newNode);
            saveFileSystem();
            renderExplorer();
            openFile(newNode);
        };
        reader.readAsText(file);
    };
    input.click();
}

function handleOpenFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const rootName = files[0].webkitRelativePath.split('/')[0] || 'workspace';
        
        const newFileSystem = {
            id: 'root',
            name: rootName,
            type: 'folder',
            expanded: true,
            children: []
        };

        function getOrCreateFolder(parent, folderName) {
            let folder = parent.children.find(c => c.name === folderName && c.type === 'folder');
            if (!folder) {
                folder = {
                    id: Date.now().toString() + Math.random().toString().substr(2, 5),
                    name: folderName,
                    type: 'folder',
                    expanded: false,
                    children: []
                };
                parent.children.push(folder);
            }
            return folder;
        }

        const readFileAsync = (file) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => resolve('');
                reader.readAsText(file);
            });
        };

        for (let file of files) {
            const parts = file.webkitRelativePath.split('/');
            let currentFolder = newFileSystem;
            
            for (let i = 1; i < parts.length - 1; i++) {
                currentFolder = getOrCreateFolder(currentFolder, parts[i]);
            }
            
            const fileName = parts[parts.length - 1];
            const content = await readFileAsync(file);
            const fileNode = createFileNode(fileName);
            fileNode.content = content;
            fileNode.id = Date.now().toString() + Math.random().toString().substr(2, 5);
            currentFolder.children.push(fileNode);
        }

        fileSystem = newFileSystem;
        openTabs = [{ id: "welcome", name: "Welcome", type: "welcome" }];
        activeTabId = "welcome";
        
        saveFileSystem();
        renderExplorer();
        renderTabs();
        renderEditor();
    };
    input.click();
}

// --- Keyboard Shortcuts ---
function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    const statusBar = document.querySelector('.status-bar');
                    statusBar.style.opacity = '0.5';
                    setTimeout(() => statusBar.style.opacity = '1', 150);
                    break;
                case '\`':
                    e.preventDefault();
                    const panel = document.getElementById('bottom-panel');
                    if (panel) {
                        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
                    }
                    break;
            }
        }
    });
}

// --- Dropdown Menus ---
const menuData = {
    'menu-file': [{ label: 'New File...', shortcut: 'Ctrl+N' }, { label: 'Open File...', shortcut: 'Ctrl+O' }, { label: 'Open Folder...' }, { label: 'Save', shortcut: 'Ctrl+S' }, { type: 'separator' }, { label: 'Exit' }],
    'menu-edit': [{ label: 'Undo', shortcut: 'Ctrl+Z' }, { label: 'Redo', shortcut: 'Ctrl+Y' }, { type: 'separator' }, { label: 'Cut' }, { label: 'Copy' }, { label: 'Paste' }],
    'menu-selection': [{ label: 'Select All', shortcut: 'Ctrl+A' }, { label: 'Copy Line Up', shortcut: 'Shift+Alt+Up' }, { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down' }],
    'menu-view': [{ label: 'Command Palette...', shortcut: 'Ctrl+Shift+P' }, { type: 'separator' }, { label: 'Explorer', shortcut: 'Ctrl+Shift+E' }, { label: 'Search', shortcut: 'Ctrl+Shift+F' }, { type: 'separator' }, { label: 'Terminal', shortcut: 'Ctrl+`' }],
    'menu-go': [{ label: 'Go to File...', shortcut: 'Ctrl+P' }, { label: 'Go to Line/Column...', shortcut: 'Ctrl+G' }],
    'menu-run': [{ label: 'Start Debugging', shortcut: 'F5' }, { label: 'Run Without Debugging', shortcut: 'Ctrl+F5' }],
    'menu-terminal': [{ label: 'New Terminal', shortcut: 'Ctrl+Shift+`' }, { label: 'Split Terminal' }, { type: 'separator' }, { label: 'Clear Terminal' }],
    'menu-help': [{ label: 'Welcome' }, { label: 'Keyboard Shortcuts Reference' }, { label: 'About' }],
    'manage-menu-btn': [
        { label: 'Color Theme' },
        { type: 'separator' },
        { label: 'Settings', shortcut: 'Ctrl+,' }
    ]
};

function initDropdowns() {
    const menuItems = document.querySelectorAll('.title-bar-menu .menu-item');
    let activeDropdown = null;

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const menuId = item.id;
            if (activeDropdown && activeDropdown.id === `dropdown-${menuId}`) {
                closeDropdown();
            } else {
                showDropdown(item, menuId);
            }
        });

        item.addEventListener('mouseenter', () => {
            if (activeDropdown && !item.id.includes('manage')) {
                showDropdown(item, item.id);
            }
        });
    });

    const manageBtn = document.getElementById('manage-menu-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeDropdown && activeDropdown.id === 'dropdown-manage-menu-btn') {
                closeDropdown();
            } else {
                showDropdown(manageBtn, 'manage-menu-btn', true);
            }
        });
    }

    document.addEventListener('click', closeDropdown);

    function showDropdown(anchor, menuId, isBottom = false) {
        closeDropdown();
        const data = menuData[menuId];
        if (!data) return;

        anchor.classList.add('active');
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu active';
        dropdown.id = `dropdown-${menuId}`;
        
        const rect = anchor.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        
        if (isBottom) {
            dropdown.style.bottom = (window.innerHeight - rect.top) + 'px';
            dropdown.style.top = 'auto';
            dropdown.style.borderRadius = '4px 4px 0 0';
        } else {
            dropdown.style.top = rect.bottom + 'px';
        }

        data.forEach(entry => {
            if (entry.type === 'separator') {
                const sep = document.createElement('div');
                sep.className = 'dropdown-separator';
                dropdown.appendChild(sep);
            } else {
                const row = document.createElement('div');
                row.className = 'dropdown-item';
                row.innerHTML = `<span>${entry.label}</span>${entry.shortcut ? `<span class="shortcut">${entry.shortcut}</span>` : ''}`;
                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleMenuAction(entry.label);
                    closeDropdown();
                });
                dropdown.appendChild(row);
            }
        });

        document.body.appendChild(dropdown);
        activeDropdown = dropdown;
    }

    function handleMenuAction(label) {
        if (label === 'Color Theme') {
            toggleTheme();
        } else if (label === 'New File...') {
            handleCreateNewFile();
        } else if (label === 'Open File...') {
            handleOpenFile();
        } else if (label === 'Open Folder...') {
            handleOpenFolder();
        } else if (label === 'Save') {
            const statusBar = document.querySelector('.status-bar');
            if (statusBar) {
                statusBar.style.opacity = '0.5';
                setTimeout(() => statusBar.style.opacity = '1', 150);
            }
        } else if (label === 'Exit') {
            window.close();
        } else if (label === 'Undo' && editor) {
            editor.trigger('keyboard', 'undo', null);
        } else if (label === 'Redo' && editor) {
            editor.trigger('keyboard', 'redo', null);
        } else if (label === 'Select All' && editor) {
            const range = editor.getModel().getFullModelRange();
            editor.setSelection(range);
        } else if (label === 'Command Palette...') {
            const ev = new KeyboardEvent('keydown', { key: 'F1' });
            window.dispatchEvent(ev);
        } else if (label === 'Explorer') {
            const el = document.querySelector('.activity-icon[data-panel="explorer"]');
            if (el) el.click();
        } else if (label === 'Search') {
            const el = document.querySelector('.activity-icon[data-panel="search"]');
            if (el) el.click();
        } else if (label === 'Terminal') {
            const panel = document.getElementById('bottom-panel');
            if (panel) {
                panel.style.display = 'flex';
                if (terminal) terminal.focus();
            }
        } else if (label === 'Clear Terminal' && terminal) {
            terminal.clear();
        } else if (label === 'New Terminal') {
            const panel = document.getElementById('bottom-panel');
            if (panel) panel.style.display = 'flex';
            if (terminal) {
                terminal.clear();
                terminal.write('PS C:\\User\\Dev> ');
                terminal.focus();
            }
        } else if (label === 'Welcome') {
            alert('Welcome to IKON VS Code Replica!');
        } else if (label === 'About') {
            alert('IKON VS Code Replica\\nVersion: 1.0\\nCreated as a web-based clone.');
        } else {
            console.log('Action triggered:', label);
        }
    }

    function closeDropdown() {
        if (activeDropdown) {
            activeDropdown.remove();
            activeDropdown = null;
        }
        document.querySelectorAll('.menu-item, .activity-icon').forEach(m => m.classList.remove('active'));
    }
}

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem('vscode-theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (editor) monaco.editor.setTheme('vs-dark');
    } else {
        document.body.classList.remove('dark-mode');
        if (editor) monaco.editor.setTheme('vs');
    }
    localStorage.setItem('vscode-theme', theme);
}

// --- Command Palette ---
const commands = [
    { id: 'theme.toggle', label: 'Preferences: Toggle Color Theme' },
    { id: 'terminal.clear', label: 'Terminal: Clear' },
    { id: 'file.new', label: 'File: New File' }
];

function initCommandPalette() {
    const overlay = document.getElementById('command-palette-overlay');
    const input = document.getElementById('command-palette-input');
    const list = document.getElementById('command-palette-list');

    function show() {
        overlay.style.display = 'flex';
        input.value = '';
        renderList('');
        setTimeout(() => input.focus(), 50);
    }

    function hide() {
        overlay.style.display = 'none';
    }

    function renderList(query) {
        list.innerHTML = '';
        const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));
        
        filtered.forEach((cmd, idx) => {
            const item = document.createElement('div');
            item.className = 'command-palette-item' + (idx === 0 ? ' active' : '');
            item.innerHTML = `<span>${cmd.label}</span>`;
            
            item.addEventListener('click', () => executeCommand(cmd.id));
            item.addEventListener('mouseenter', () => {
                list.querySelectorAll('.command-palette-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
            list.appendChild(item);
        });
    }

    function executeCommand(id) {
        hide();
        if (id === 'theme.toggle') toggleTheme();
        if (id === 'terminal.clear' && terminal) terminal.clear();
        if (id === 'file.new') {
            handleCreateNewFile();
        }
    }

    input.addEventListener('input', (e) => renderList(e.target.value));
    input.addEventListener('keydown', (e) => {
        const items = Array.from(list.querySelectorAll('.command-palette-item'));
        const activeIdx = items.findIndex(i => i.classList.contains('active'));
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeIdx < items.length - 1) {
                items[activeIdx]?.classList.remove('active');
                items[activeIdx + 1]?.classList.add('active');
                items[activeIdx + 1]?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeIdx > 0) {
                items[activeIdx]?.classList.remove('active');
                items[activeIdx - 1]?.classList.add('active');
                items[activeIdx - 1]?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIdx >= 0 && activeIdx < items.length) {
                const cmdLabel = items[activeIdx].querySelector('span').textContent;
                const cmd = commands.find(c => c.label === cmdLabel);
                if (cmd) executeCommand(cmd.id);
            }
        } else if (e.key === 'Escape') {
            hide();
        }
    });

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            show();
        }
        if (e.key === 'F1') {
            e.preventDefault();
            show();
        }
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hide();
    });
}