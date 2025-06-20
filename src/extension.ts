import * as vscode from 'vscode';
import { CompletionProvider } from './completion-provider';
import { Config } from './config';

let completionProvider: CompletionProvider;
let completionDisposable: vscode.Disposable | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Local LLM Copilot extension is now active');

    // Initialize completion provider
    completionProvider = new CompletionProvider();

    // Register completion provider if enabled
    updateCompletionProvider();

    // Register commands
    const enableCommand = vscode.commands.registerCommand('localLlmCopilot.enable', () => {
        Config.setEnabled(true);
        updateCompletionProvider();
        vscode.window.showInformationMessage('Local LLM Copilot enabled');
    });

    const disableCommand = vscode.commands.registerCommand('localLlmCopilot.disable', () => {
        Config.setEnabled(false);
        updateCompletionProvider();
        vscode.window.showInformationMessage('Local LLM Copilot disabled');
    });

    const testConnectionCommand = vscode.commands.registerCommand('localLlmCopilot.testConnection', async () => {
        try {
            await completionProvider.testConnection();
            vscode.window.showInformationMessage('LLM connection successful!');
        } catch (error) {
            vscode.window.showErrorMessage(`LLM connection failed: ${error}`);
        }
    });

    // Watch for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('localLlmCopilot')) {
            updateCompletionProvider();
        }
    });

    context.subscriptions.push(
        enableCommand,
        disableCommand,
        testConnectionCommand,
        configChangeListener
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        'Local LLM Copilot is ready! Make sure your local LLM server is running.',
        'Test Connection'
    ).then(selection => {
        if (selection === 'Test Connection') {
            vscode.commands.executeCommand('localLlmCopilot.testConnection');
        }
    });

    // Create a status bar item
    const actionBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    actionBar.text = '$(rocket) Run Action';
    actionBar.tooltip = 'Click to run your action';
    actionBar.command = 'local-llm-copilot.runAction';
    actionBar.show();

    context.subscriptions.push(actionBar);

    // Register the command
    let disposable = vscode.commands.registerCommand('local-llm-copilot.runAction', () => {
        vscode.window.showInformationMessage('Action Bar Clicked!');
    });

    context.subscriptions.push(disposable);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'localLLMCopilotView',
            new CopilotWebviewViewProvider(context)
        )
    );
}

function updateCompletionProvider() {
    // Dispose existing provider
    if (completionDisposable) {
        completionDisposable.dispose();
        completionDisposable = undefined;
    }

    // Register new provider if enabled
    if (Config.isEnabled()) {
        const supportedLanguages = [
            'typescript', 'javascript', 'python', 'java', 'cpp', 'c',
            'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
            'html', 'css', 'json', 'yaml', 'xml', 'sql', 'bash', 'powershell'
        ];

        completionDisposable = vscode.languages.registerInlineCompletionItemProvider(
            supportedLanguages.map(lang => ({ language: lang })),
            completionProvider
        );
    }
}

export function deactivate() {
    if (completionDisposable) {
        completionDisposable.dispose();
    }
}

class CopilotWebviewViewProvider implements vscode.WebviewViewProvider {
    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async message => {
            if (message.command === 'testConnection') {
                let status = false;
                let models: string[] = [];
                try {
                    const res = await fetch(message.url, { method: 'GET' });
                    status = res.ok;
                    // If connection is successful, fetch models from /api/tags
                    if (status) {
                        const tagsRes = await fetch(message.url.replace(/\/+$/, '') + '/api/tags', { method: 'GET' });
                        if (tagsRes.ok) {
                            const tagsData = await tagsRes.json();
                            if (typeof tagsData === 'object' && tagsData !== null && 'models' in tagsData && Array.isArray((tagsData as any).models)) {
                                models = ((tagsData as any).models).map((m: any) => m.name);
                            }
                        }
                    }
                    webviewView.webview.postMessage({
                        command: 'testResult',
                        success: status,
                        models
                    });
                } catch (error) {
                    webviewView.webview.postMessage({
                        command: 'testResult',
                        success: false,
                        error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error),
                        models: []
                    });
                }
                // Update status for this URL
                let urls: any[] = this.context.globalState.get('llmApiUrls', []);
                let idx = urls.findIndex((item: any) => item.url === message.url);
                if (idx !== -1) {
                    urls[idx].status = status ? 'Success' : 'Failure';
                } else {
                    urls.push({ url: message.url, status: status ? 'Success' : 'Failure' });
                }
                await this.context.globalState.update('llmApiUrls', urls);
                webviewView.webview.postMessage({
                    command: 'apiUrls',
                    urls
                });
            }
            if (message.command === 'saveApiUrl') {
                let urls: any[] = this.context.globalState.get('llmApiUrls', []);
                let idx = urls.findIndex((item: any) => item.url === message.url);
                if (idx === -1) {
                    urls.push({ url: message.url, status: 'Unknown' });
                    await this.context.globalState.update('llmApiUrls', urls);
                }
                webviewView.webview.postMessage({
                    command: 'saveResult',
                    success: true,
                    urls
                });
            }
            if (message.command === 'getApiUrls') {
                const urls: any[] = this.context.globalState.get('llmApiUrls', []);
                webviewView.webview.postMessage({
                    command: 'apiUrls',
                    urls
                });
            }
            if (message.command === 'chat') {
                const llmUrl = (message.modelUrl || '').replace(/\/+$/, '');
                const endpoint = llmUrl + '/api/chat';
                const model = message.model || "llama3";
                const messages = message.history || [
                    { role: 'user', content: message.message }
                ];
                try {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model,
                            messages
                        })
                    });
                    const raw = await res.text();
                    // Split by lines, parse each line, and collect assistant content
                    let reply = '';
                    raw.split('\n').forEach(line => {
                        line = line.trim();
                        if (!line) return;
                        try {
                            const obj = JSON.parse(line);
                            if (obj.message && obj.message.role === 'assistant' && obj.message.content) {
                                reply += obj.message.content;
                            }
                        } catch { /* ignore parse errors for non-JSON lines */ }
                    });
                    webviewView.webview.postMessage({
                        command: 'chatResponse',
                        response: reply || 'No response from LLM.'
                    });
                } catch (err: any) {
                    webviewView.webview.postMessage({
                        command: 'chatResponse',
                        response: 'Error: ' + (err.message || err.toString())
                    });
                }
            }
        });
    }

    private getHtmlForWebview(): string {
        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Local LLM Copilot</title>
        <style>
            body {
                font-family: var(--vscode-font-family, sans-serif);
                background: var(--vscode-editor-background, #1e1e1e);
                color: var(--vscode-editor-foreground, #d4d4d4);
                margin: 0;
                padding: 0;
                height: 100vh;
                width: 100vw;
                display: flex;
                flex-direction: row;
            }
            .right-pane {
                width: 380px;
                min-width: 320px;
                max-width: 100vw;
                height: 100vh;
                background: var(--vscode-sideBar-background, #252526);
                border-left: 1px solid var(--vscode-editorWidget-border, #333);
                box-shadow: -2px 0 8px rgba(0,0,0,0.08);
                display: flex;
                flex-direction: column;
                padding: 0;
            }
            .pane-header {
                font-size: 1.3em;
                font-weight: bold;
                padding: 18px 24px 8px 24px;
                border-bottom: 1px solid var(--vscode-editorWidget-border, #333);
                color: var(--vscode-titleBar-activeForeground, #fff);
            }
            .pane-section {
                padding: 18px 24px 0 24px;
            }
            #chatContainer {
                flex: 1;
                display: flex;
                flex-direction: column;
                padding: 0 24px 24px 24px;
            }
            #chatHistory {
                border: 1px solid var(--vscode-editorWidget-border, #333);
                border-radius: 6px;
                padding: 12px;
                height: 220px;
                overflow-y: auto;
                background: var(--vscode-editor-background, #1e1e1e);
                margin-bottom: 12px;
            }
            .chat-message { margin-bottom: 12px; }
            .chat-user { color: var(--vscode-textLink-foreground, #3794ff); font-weight: bold; }
            .chat-bot { color: var(--vscode-editor-foreground, #d4d4d4); }
            #chatInput {
                width: 70%;
                padding: 8px;
                border-radius: 4px;
                border: 1px solid var(--vscode-editorWidget-border, #333);
                background: var(--vscode-input-background, #252526);
                color: var(--vscode-input-foreground, #d4d4d4);
            }
            #sendBtn {
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                background: var(--vscode-button-background, #0e639c);
                color: var(--vscode-button-foreground, #fff);
                font-weight: bold;
                cursor: pointer;
                margin-left: 8px;
            }
            #sendBtn:hover {
                background: var(--vscode-button-hoverBackground, #1177bb);
            }
            .model-select-row, .connection-row {
                margin-bottom: 12px;
            }
            label {
                font-size: 1em;
                margin-right: 8px;
            }
            select, input[type="text"] {
                padding: 6px 10px;
                border-radius: 4px;
                border: 1px solid var(--vscode-editorWidget-border, #333);
                background: var(--vscode-input-background, #252526);
                color: var(--vscode-input-foreground, #d4d4d4);
            }
            .status-success { color: green; }
            .status-failure { color: red; }
            .status-unknown { color: gray; }
            #result { margin-left: 8px; }
            #pastConnections {
                font-size: 0.95em;
                margin-bottom: 10px;
            }
            #connectionsList {
                margin: 0;
                padding-left: 18px;
            }
            #chatLanding {
                display: flex;
                flex-direction: column;
                height: 100%;
                justify-content: center;
                align-items: center;
                text-align: center;
            }
            #changeConnBtn {
                margin-top: 18px;
                padding: 6px 16px;
                border-radius: 4px;
                border: none;
                background: var(--vscode-button-background, #0e639c);
                color: var(--vscode-button-foreground, #fff);
                font-weight: bold;
                cursor: pointer;
            }
            #changeConnBtn:hover {
                background: var(--vscode-button-hoverBackground, #1177bb);
            }
        </style>
    </head>
    <body>
        <div style="flex:1"></div>
        <div class="right-pane">
            <div class="pane-header">Local LLM Copilot</div>
            <div id="connectionSection" class="pane-section">
                <div class="connection-row">
                    <label for="llmUrl">LLM URL:</label>
                    <input type="text" id="llmUrl" placeholder="http://localhost:11434" style="width:160px;" />
                    <button type="button" id="testBtn">Test</button>
                    <span id="result"></span>
                </div>
                <div class="model-select-row">
                    <label for="modelSelect">Model:</label>
                    <select id="modelSelect">
                        <option value="">Select a model</option>
                    </select>
                    <button type="button" id="saveBtn">Save</button>
                </div>
                <div id="pastConnections">
                    <strong>Past Connections:</strong>
                    <ul id="connectionsList"></ul>
                </div>
            </div>
            <div id="chatLanding" style="display:none; flex:1;">
                <div style="margin-top:40px;">
                    <h2>Welcome to Local LLM Copilot</h2>
                    <p style="color:var(--vscode-descriptionForeground, #cccccc);margin-bottom:24px;">
                        Start chatting with your local LLM!
                    </p>
                    <div id="chatContainer">
                        <div id="chatHistory"></div>
                        <div style="display: flex; align-items: center;">
                            <input type="text" id="chatInput" placeholder="Type your message..." autocomplete="off" style="flex: 1; margin-right: 8px;" />
                            <button id="sendBtn">Send</button>
                        </div>
                        <div id="chatStatus" style="margin-top:8px; min-height:20px; color:var(--vscode-descriptionForeground, #cccccc); font-size:0.98em;"></div>
                    </div>
                    <button id="changeConnBtn">Change Connection</button>
                </div>
            </div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();

            // --- Connection & Model Logic ---
            function renderConnections(urls) {
                const list = document.getElementById('connectionsList');
                list.innerHTML = '';
                if (!urls || urls.length === 0) {
                    list.innerHTML = '<li>No past connections.</li>';
                } else {
                    urls.forEach(item => {
                        const li = document.createElement('li');
                        li.innerHTML = \`
                            <span style="cursor:pointer;text-decoration:underline">\${item.url}</span>
                            <span class="status-\${item.status ? item.status.toLowerCase() : 'unknown'}" style="margin-left:10px;">
                                [Last connection status: \${item.status || 'Unknown'}]
                            </span>
                        \`;
                        li.querySelector('span').onclick = () => {
                            document.getElementById('llmUrl').value = item.url;
                        };
                        list.appendChild(li);
                    });
                }
            }

            function updateModelDropdown(models) {
                const select = document.getElementById('modelSelect');
                select.innerHTML = '<option value="">Select a model</option>';
                if (models && models.length) {
                    models.forEach(model => {
                        const opt = document.createElement('option');
                        opt.value = model;
                        opt.textContent = model;
                        select.appendChild(opt);
                    });
                }
            }

            document.getElementById('testBtn').addEventListener('click', () => {
                const url = document.getElementById('llmUrl').value;
                vscode.postMessage({ command: 'testConnection', url });
                document.getElementById('result').textContent = 'Testing...';
            });

            document.getElementById('saveBtn').addEventListener('click', () => {
                const url = document.getElementById('llmUrl').value;
                vscode.postMessage({ command: 'saveApiUrl', url });
                document.getElementById('result').textContent = 'Saving...';
            });

            document.getElementById('changeConnBtn').addEventListener('click', () => {
                document.getElementById('chatLanding').style.display = 'none';
                document.getElementById('connectionSection').style.display = '';
            });

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'testResult') {
                    document.getElementById('result').textContent = message.success
                        ? 'Connection successful!'
                        : 'Connection failed: ' + (message.error || 'Unknown error');
                    if (message.models) {
                        updateModelDropdown(message.models);
                    }
                }
                if (message.command === 'saveResult') {
                    document.getElementById('result').textContent = message.success
                        ? 'API URL saved!'
                        : 'Failed to save: ' + (message.error || 'Unknown error');
                    if (message.urls) {
                        renderConnections(message.urls);
                    }
                    if (message.success) {
                        // Switch to chat landing page
                        document.getElementById('connectionSection').style.display = 'none';
                        document.getElementById('chatLanding').style.display = 'flex';
                    }
                }
                if (message.command === 'apiUrls') {
                    renderConnections(message.urls);
                }
                if (message.command === 'chatResponse') {
                    addChatMessage('bot', message.response);
                    chatHistoryArr.push({ role: 'assistant', content: message.response });
                    document.getElementById('chatStatus').textContent = '';
                }
            });

            // Request past connections on load
            vscode.postMessage({ command: 'getApiUrls' });

            // --- Chat Logic ---
            const chatHistory = document.getElementById('chatHistory');
            const chatInput = document.getElementById('chatInput');
            const sendBtn = document.getElementById('sendBtn');
            const chatHistoryArr = []; // Initialize chat history array

            function addChatMessage(sender, text) {
                const div = document.createElement('div');
                div.className = 'chat-message';
                if (sender === 'user') {
                    div.innerHTML = '<span class="chat-user">You:</span> ' + text;
                } else {
                    div.innerHTML = '<span class="chat-bot">LLM:</span> ' + text;
                }
                chatHistory.appendChild(div);
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }

            sendBtn.onclick = () => {
                const msg = chatInput.value.trim();
                const model = document.getElementById('modelSelect').value;
                const llmUrl = document.getElementById('llmUrl').value;
                if (!msg) return;
                addChatMessage('user', msg);
                chatHistoryArr.push({ role: 'user', content: msg });
                document.getElementById('chatStatus').textContent = 'Waiting for the LLM to respond...';
                vscode.postMessage({ command: 'chat', message: msg, model, modelUrl: llmUrl, history: chatHistoryArr });
                chatInput.value = '';
            };

            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') sendBtn.onclick();
            });
        </script>
    </body>
    </html>
    `;
    }
}
