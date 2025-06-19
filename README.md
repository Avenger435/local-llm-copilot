# Local LLM Copilot

A VSCode extension that provides AI-powered code completion using local LLM models, similar to GitHub Copilot but running entirely on your local machine.

## Features

- 🤖 AI-powered code completion using local LLMs
- 🔒 Complete privacy - all processing happens locally
- 🛠️ Support for multiple LLM backends (Ollama, LM Studio, etc.)
- 🎯 Context-aware suggestions based on surrounding code
- ⚡ Fast, real-time completions with debouncing
- 🌍 Support for 20+ programming languages

## Supported LLM Backends

- **Ollama** (default) - Easy to use, runs on localhost:11434
- **LM Studio** - User-friendly interface, runs on localhost:1234
- **Any OpenAI-compatible API** - Custom endpoints

## Installation

1. Install the extension from the VSCode marketplace (coming soon)
2. Set up your local LLM server (see setup instructions below)
3. Configure the extension settings
4. Start coding with AI assistance!

## Quick Setup

### Using Ollama (Recommended)

1. Install Ollama from [ollama.ai](https://ollama.ai/)
2. Pull a code model:
   ```bash
   ollama pull codellama:7b
   # or for better performance with more resources:
   ollama pull codellama:13b
   ```
3. The extension will automatically connect to Ollama on `http://localhost:11434`

### Using LM Studio

1. Download LM Studio from [lmstudio.ai](https://lmstudio.ai/)
2. Download a code-focused model (e.g., Code Llama, DeepSeek Coder)
3. Start the local server in LM Studio
4. Update extension settings:
   - API URL: `http://localhost:1234`
   - Model: (name of your loaded model)

## Configuration

Open VSCode settings and search for "Local LLM Copilot" to configure:

- **Enabled**: Enable/disable the extension
- **API URL**: Your local LLM server URL
- **Model**: Model name to use for completions
- **Max Tokens**: Maximum completion length
- **Temperature**: Creativity level (0.0 = deterministic, 1.0 = creative)
- **Context Lines**: How many lines before cursor to include as context
- **Debounce**: Delay before triggering completion (in milliseconds)

## Usage

1. Open any supported file (.ts, .js, .py, .java, etc.)
2. Start typing code
3. The extension will automatically suggest completions
4. Press `Tab` to accept a suggestion
5. Press `Esc` to dismiss suggestions

## Commands

- `Local LLM Copilot: Enable` - Enable the extension
- `Local LLM Copilot: Disable` - Disable the extension  
- `Local LLM Copilot: Test Connection` - Test connection to your LLM server

## Troubleshooting

### No completions appearing

1. Check that your LLM server is running
2. Use "Test Connection" command to verify connectivity
3. Check VSCode output panel for error messages
4. Ensure the model name matches your server configuration

### Slow completions

1. Reduce the context lines setting
2. Lower the max tokens setting
3. Use a smaller/faster model
4. Increase debounce delay

### High resource usage

1. Use a smaller model (e.g., 7B instead of 13B)
2. Increase debounce delay to reduce frequency
3. Reduce context lines

## Privacy

This extension processes your code locally using your own LLM server. No code is sent to external services, ensuring complete privacy and security.

## Development

To contribute or modify this extension:

1. Clone this repository
2. Install dependencies: `npm install`
3. Open in VSCode and press F5 to run in development mode
4. Make changes and test in the extension development host

## License

MIT License - see LICENSE file for details.

## Support

If you encounter issues or have feature requests, please file them in the GitHub repository.
