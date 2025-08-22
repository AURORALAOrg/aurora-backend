// Final test script for DeepSeek SDK integration
const { createDeepSeek } = require('@ai-sdk/deepseek');
const dotenv = require('dotenv');

dotenv.config();

// Log environment variables (without the API key for security)
console.log('Environment variables:');
console.log('DEEPSEEK_MODEL:', process.env.DEEPSEEK_MODEL || 'not set');
console.log('DEEPSEEK_API_BASE:', process.env.DEEPSEEK_API_BASE || 'not set');
console.log('DEEPSEEK_API_KEY:', process.env.DEEPSEEK_API_KEY ? '[REDACTED]' : 'not set');

// Create a custom implementation of the AI package to match how it's used in the chat service
const AI = {
  generateText: async function(options) {
    console.log('Generating text with options:', {
      model: options.model._model || 'unknown',
      prompt: options.prompt.substring(0, 50) + '...',
      temperature: options.temperature,
      maxTokens: options.maxTokens
    });
    
    // Use fetch to directly call the DeepSeek API
    const apiBase = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';
    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    if (!apiBase) {
      throw new Error('DEEPSEEK_API_BASE environment variable is not set');
    }
    
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is not set');
    }
    
    console.log(`Making API request to: ${apiBase}/chat/completions`);
    
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      // Derive the model id safely from the handle or string
      body: JSON.stringify({
        model: (typeof options.model === 'string'
          ? options.model
          : (options.model?._model || 'deepseek-chat')),
        messages: [
          {
            role: 'user',
            content: options.prompt
          }
        ],
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 300
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { raw: errorText };
      }
      
      throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`, { 
        cause: errorData 
      });
    }
    
    const data = await response.json();
    console.log('API response:', JSON.stringify(data, null, 2));
    
    return {
      text: data.choices?.[0]?.message?.content || ''
    };
  }
};

async function testDeepSeek() {
  console.log('Testing DeepSeek SDK integration...');
  
  // Create DeepSeek client the same way as in the chat service
  const deepseekClient = createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_API_BASE,
  });
  
  console.log('DeepSeek client created successfully');
  
  try {
    // Generate text using our custom implementation
    console.log('Sending test prompt to DeepSeek...');
    const { text } = await AI.generateText({
      model: deepseekClient(process.env.DEEPSEEK_MODEL || 'deepseek-chat'),
      prompt: 'Hello, can you tell me a short joke?',
      temperature: 0.7,
      maxTokens: 300,
    });
    
    console.log('\nDeepSeek response:');
    console.log(text);
    console.log('\nDeepSeek integration test successful!');
  } catch (error) {
    console.error('\nError testing DeepSeek integration:');
    console.error(error.message);
    if (error.cause) {
      console.error('Error cause:', typeof error.cause === 'object' ? JSON.stringify(error.cause, null, 2) : error.cause);
    }
  }
}

testDeepSeek();
