export interface CompletionRequest {
    prompt: string;
    model: string;
    maxTokens: number;
    temperature: number;
    language: string;
}

export interface CompletionResponse {
    text: string;
    model: string;
}

export interface LLMApiConfig {
    url: string;
    model: string;
    apiKey?: string;
}
