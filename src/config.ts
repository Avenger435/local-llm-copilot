import * as vscode from 'vscode';

export class Config {
    private static readonly CONFIG_SECTION = 'localLlmCopilot';

    static isEnabled(): boolean {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('enabled', true);
    }

    static setEnabled(enabled: boolean): void {
        vscode.workspace.getConfiguration(this.CONFIG_SECTION).update('enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    static getApiUrl(): string {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('apiUrl', 'http://localhost:11434');
    }

    static getModel(): string {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('model', 'codellama:7b');
    }

    static getMaxTokens(): number {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('maxTokens', 100);
    }

    static getTemperature(): number {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('temperature', 0.2);
    }

    static getContextLines(): number {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('contextLines', 50);
    }

    static getDebounceMs(): number {
        return vscode.workspace.getConfiguration(this.CONFIG_SECTION).get('debounceMs', 300);
    }
}
