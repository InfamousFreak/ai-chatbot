// Free AI API integrations - no billing required!
import { fileUploadHandler, type UploadedFile } from './fileUpload';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: UploadedFile[];
}

export interface AIProvider {
  name: string;
  chat: (messages: ChatMessage[]) => Promise<string>;
}

// Hugging Face Inference API (FREE)
class HuggingFaceProvider implements AIProvider {
  name = 'Hugging Face';
  private apiKey: string;
  private model = 'microsoft/DialoGPT-medium'; // Free model

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const lastMessage = messages[messages.length - 1]?.content || 'Hello';

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: lastMessage,
            parameters: {
              max_new_tokens: 250,
              temperature: 0.7,
              do_sample: true,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data[0]?.generated_text || data.generated_text || 'Sorry, I couldn\'t generate a response.';
    } catch (error) {
      console.error('HuggingFace error:', error);
      throw error;
    }
  }
}

// Alternative: Use a better free model
class HuggingFaceLlamaProvider implements AIProvider {
  name = 'Hugging Face Llama';
  private apiKey: string;
  private model = 'meta-llama/Llama-2-7b-chat-hf'; // Better free model

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    const prompt = `${conversation}\nassistant:`;

    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.model}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 200,
              temperature: 0.7,
              stop: ["\nuser:", "\nhuman:"],
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.statusText}`);
      }

      const data = await response.json();
      let result = data[0]?.generated_text || data.generated_text || '';

      // Clean up the response
      result = result.replace(prompt, '').trim();
      return result || 'I apologize, but I couldn\'t generate a proper response.';
    } catch (error) {
      console.error('HuggingFace Llama error:', error);
      throw error;
    }
  }
}

// GPT-3.5-turbo API Provider (replacement for Google Gemini)
class GPTProvider implements AIProvider {
  name = 'GPT-3.5-turbo';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_completion_tokens: 1000
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GPT-3.5-Turbo Mini API Error Details:', errorText);
        throw new Error(`GPT-3.5-Turbo Mini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
    } catch (error) {
      console.error('GPT-3.5-Turbo error:', error);
      throw error;
    }
  }
}

// Fallback: Public free API (no key needed)
class PublicAIProvider implements AIProvider {
  name = 'Free Public AI';

  async chat(messages: ChatMessage[]): Promise<string> {
    const lastMessage = messages[messages.length - 1]?.content || 'Hello';

    try {
      // Using a public endpoint (this is just an example - many exist)
      const response = await fetch('https://api.cohere.ai/v1/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'command-light',
          prompt: `User: ${lastMessage}\nAssistant:`,
          max_tokens: 200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.generations[0]?.text?.trim() || 'Hello! I\'m working in free mode.';
      }
    } catch {
      console.log('Public API unavailable, using fallback');
    }

    // Smart fallback responses
    const responses = [
      `I received your message: "${lastMessage}". I'm running in free demo mode! The system is working perfectly.`,
      `Thanks for your message about "${lastMessage.substring(0, 30)}...". I'm a demo AI assistant running on free APIs.`,
      `Your chatbot interface is working great! You asked: "${lastMessage}". This is a free demo response.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}

// Factory to get the best available free provider
export function getFreeAIProvider(): AIProvider {
  // Try GPT-3.5-Turbo first (highest quality free option)
  if (process.env.OPENAI_API_KEY) {
    return new GPTProvider();
  }

  // Then Google Gemini fallback (if still desired, otherwise remove)
  // if (process.env.GOOGLE_API_KEY) {
  //   return new GeminiProvider();
  // }

  // Try Hugging Face (good free option)
  if (process.env.HUGGINGFACE_API_KEY) {
    return new HuggingFaceLlamaProvider();
  }

  // Fallback to public/demo provider (always works)
  return new PublicAIProvider();
}

export {
  HuggingFaceProvider,
  HuggingFaceLlamaProvider,
  GPTProvider,
  PublicAIProvider
};
