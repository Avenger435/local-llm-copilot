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
