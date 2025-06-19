import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Config } from './config';
import { CompletionRequest, CompletionResponse } from './types';

export class LLMClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            timeout: 30000, // 30 seconds
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    async getCompletion(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse | null> {
        try {
            const apiUrl = Config.getApiUrl();
            
            // Detect API type based on URL and format request accordingly
            if (apiUrl.includes('ollama') || apiUrl.includes(':11434')) {
                return await this.getOllamaCompletion(request, signal);
            } else if (apiUrl.includes('lmstudio') || apiUrl.includes(':1234')) {
                return await this.getLMStudioCompletion(request, signal);
            } else {
                // Generic OpenAI-compatible API
                return await this.getOpenAICompatibleCompletion(request, signal);
            }
        } catch (error) {
            console.error('LLM Client error:', error);
            return null;
        }
    }

    private async getOllamaCompletion(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse | null> {
        const apiUrl = Config.getApiUrl();
        
        const payload = {
            model: request.model,
            prompt: request.prompt,
            stream: false,
            options: {
                num_predict: request.maxTokens,
                temperature: request.temperature,
                stop: ['\n\n', '```', '</code>', '<|endoftext|>']
            }
        };

        const response: AxiosResponse = await this.client.post(`${apiUrl}/api/generate`, payload, {
            signal
        });

        if (response.data && response.data.response) {
            return {
                text: response.data.response,
                model: request.model
            };
        }

        return null;
    }

    private async getLMStudioCompletion(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse | null> {
        const apiUrl = Config.getApiUrl();
        
        const payload = {
            model: request.model,
            messages: [
                {
                    role: 'user',
                    content: request.prompt
                }
            ],
            max_tokens: request.maxTokens,
            temperature: request.temperature,
            stream: false,
            stop: ['\n\n', '```', '</code>', '<|endoftext|>']
        };

        const response: AxiosResponse = await this.client.post(`${apiUrl}/v1/chat/completions`, payload, {
            signal
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return {
                text: response.data.choices[0].message.content,
                model: request.model
            };
        }

        return null;
    }

    private async getOpenAICompatibleCompletion(request: CompletionRequest, signal?: AbortSignal): Promise<CompletionResponse | null> {
        const apiUrl = Config.getApiUrl();
        
        const payload = {
            model: request.model,
            prompt: request.prompt,
            max_tokens: request.maxTokens,
            temperature: request.temperature,
            stream: false,
            stop: ['\n\n', '```', '</code>', '<|endoftext|>']
        };

        const response: AxiosResponse = await this.client.post(`${apiUrl}/v1/completions`, payload, {
            signal
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return {
                text: response.data.choices[0].text,
                model: request.model
            };
        }

        return null;
    }
}
