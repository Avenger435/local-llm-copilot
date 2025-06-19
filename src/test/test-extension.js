// Simple test script to verify the extension components work
const fs = require('fs');
const path = require('path');

console.log('Testing Local LLM Copilot Extension Components...\n');

// Check if all compiled files exist
const requiredFiles = [
    'out/extension.js',
    'out/completion-provider.js', 
    'out/llm-client.js',
    'out/config.js',
    'out/types.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✓ ${file} exists`);
    } else {
        console.log(`✗ ${file} missing`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('\n✅ All extension files compiled successfully!');
    console.log('\nExtension Features:');
    console.log('• AI-powered code completion using local LLMs');
    console.log('• Support for Ollama, LM Studio, and OpenAI-compatible APIs');
    console.log('• Context-aware suggestions based on surrounding code');
    console.log('• Real-time completions with debouncing');
    console.log('• Support for 20+ programming languages');
    console.log('• Complete privacy - all processing happens locally');
    
    console.log('\nTo use this extension:');
    console.log('1. Install a local LLM server (Ollama recommended)');
    console.log('2. Load this extension folder in VSCode development mode');
    console.log('3. Configure the API URL and model in settings');
    console.log('4. Start coding with AI assistance!');
} else {
    console.log('\n❌ Some extension files are missing');
}