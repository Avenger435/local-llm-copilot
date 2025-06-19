import * as vscode from 'vscode';
import { LLMClient } from './llm-client';
import { Config } from './config';
import { CompletionRequest, CompletionResponse } from './types';

export class CompletionProvider implements vscode.InlineCompletionItemProvider {
    private llmClient: LLMClient;
    private lastRequestTime: number = 0;
    private abortController: AbortController | undefined;

    constructor() {
        this.llmClient = new LLMClient();
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
        try {
            // Skip if not enabled
            if (!Config.isEnabled()) {
                return null;
            }

            // Debounce requests
            const now = Date.now();
            this.lastRequestTime = now;
            await this.delay(Config.getDebounceMs());
            
            if (this.lastRequestTime !== now || token.isCancellationRequested) {
                return null;
            }

            // Cancel previous request
            if (this.abortController) {
                this.abortController.abort();
            }
            this.abortController = new AbortController();

            // Get context around cursor
            const contextLines = Config.getContextLines();
            const startLine = Math.max(0, position.line - contextLines);
            const endLine = Math.min(document.lineCount - 1, position.line);
            
            const beforeCursor = document.getText(new vscode.Range(
                new vscode.Position(startLine, 0),
                position
            ));

            const afterCursor = document.getText(new vscode.Range(
                position,
                new vscode.Position(Math.min(document.lineCount - 1, position.line + 10), 0)
            ));

            // Prepare completion request
            const request: CompletionRequest = {
                prompt: this.buildPrompt(document, beforeCursor, afterCursor),
                model: Config.getModel(),
                maxTokens: Config.getMaxTokens(),
                temperature: Config.getTemperature(),
                language: document.languageId
            };

            // Get completion from LLM
            const completion = await this.llmClient.getCompletion(request, this.abortController.signal);
            
            if (!completion || token.isCancellationRequested) {
                return null;
            }

            // Process and return completion
            const completionText = this.processCompletion(completion.text, position, document);
            
            if (!completionText) {
                return null;
            }

            return [
                new vscode.InlineCompletionItem(
                    completionText,
                    new vscode.Range(position, position)
                )
            ];

        } catch (error) {
            console.error('Error in completion provider:', error);
            return null;
        }
    }

    private buildPrompt(document: vscode.TextDocument, beforeCursor: string, afterCursor: string): string {
        const language = document.languageId;
        const filename = document.fileName;
        
        return `<code_context>
Language: ${language}
File: ${filename}

Code before cursor:
${beforeCursor}

Code after cursor:
${afterCursor}
</code_context>

Complete the code at the cursor position. Provide only the completion text that should be inserted, without any explanations or markdown formatting. The completion should be syntactically correct and contextually appropriate.

Completion:`;
    }

    private processCompletion(completion: string, position: vscode.Position, document: vscode.TextDocument): string | null {
        if (!completion) {
            return null;
        }

        // Clean up the completion
        let processedCompletion = completion.trim();
        
        // Remove common prefixes that might be duplicated
        const currentLine = document.lineAt(position.line);
        const currentLineText = currentLine.text;
        const beforeCursor = currentLineText.substring(0, position.character);
        
        // Remove leading whitespace if we're not at the beginning of a line
        if (position.character > 0) {
            processedCompletion = processedCompletion.replace(/^\s+/, '');
        }

        // Limit completion to a reasonable length (avoid very long completions)
        const lines = processedCompletion.split('\n');
        if (lines.length > 10) {
            processedCompletion = lines.slice(0, 10).join('\n');
        }

        // Don't provide completions that are too short or just whitespace
        if (processedCompletion.length < 2 || /^\s*$/.test(processedCompletion)) {
            return null;
        }

        return processedCompletion;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testConnection(): Promise<void> {
        const testRequest: CompletionRequest = {
            prompt: 'console.log("Hello, ',
            model: Config.getModel(),
            maxTokens: 10,
            temperature: 0.1,
            language: 'javascript'
        };

        const result = await this.llmClient.getCompletion(testRequest);
        if (!result) {
            throw new Error('No response from LLM');
        }
    }
}
