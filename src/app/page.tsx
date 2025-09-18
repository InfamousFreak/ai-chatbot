'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Send, Plus, Menu, User, Bot, Paperclip, AlertCircle, X, Upload } from 'lucide-react';
import { fileUploadHandler, type UploadedFile } from '@/lib/fileUpload';

// Define Message type locally
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: Date;
  files?: UploadedFile[];
}

// Memoized component for chat messages to prevent re-renders and handle hydration-safe timestamps
const MessageComponent = memo(({ message }: { message: Message }) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const isUser = message.role === 'user';
  // Only render timestamp on the client to prevent hydration mismatch
  const timestamp = isClient ? new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div key={message.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4" />
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>{timestamp}</div>
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
});
MessageComponent.displayName = 'MessageComponent';

// Main UI Component
const ChatbotUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Railways AI. How can I help you today?',
      createdAt: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usageStats, setUsageStats] = useState<{used: number, limit: number, remaining: number} | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedFiles: UploadedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const uploadedFile = await fileUploadHandler.handleFileUpload(file);
          uploadedFiles.push(uploadedFile);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          alert(`Error uploading ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      setAttachedFiles(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
      // Clear the input so the same file can be uploaded again
      event.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      createdAt: new Date(),
    };

    // Add files to the message for API call
    const messageWithFiles = {
      ...userMessage,
      files: attachedFiles.length > 0 ? attachedFiles : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFiles([]); // Clear attachments after sending
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, messageWithFiles],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json();
          if (errorData.stats) {
            setUsageStats(errorData.stats);
          }
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `⚠️ ${errorData.message || 'Daily usage limit reached. Please try again tomorrow.'}`,
            createdAt: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const content = JSON.parse(line.slice(2));
              if (typeof content === 'string') {
                setMessages(prev => prev.map((msg, index) => 
                  index === prev.length - 1 
                    ? { ...msg, content: msg.content + content }
                    : msg
                ));
              }
            } catch (error) {
              console.error('Error parsing chunk:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = (): void => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Hello! I\'m Railways AI. How can I help you today?',
        createdAt: new Date(),
      }
    ]);
  };


  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [input]);

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Bot className="w-5 h-5" /></div>
            <h1 className="text-lg font-semibold">Railways AI</h1>
          </div>
          <button onClick={startNewChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors" type="button">
            <Plus className="w-4 h-4" />New Chat
          </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-slate-700 cursor-pointer transition-colors"><div className="text-sm font-medium mb-1">Current Conversation</div></div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700">
          {usageStats && (
            <div className="mb-4 p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">Daily Usage</span>
              </div>
              <div className="text-xs text-slate-300">
                {usageStats.used}/{usageStats.limit} requests used
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {usageStats.remaining} remaining
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center"><User className="w-4 h-4" /></div>
            <div>
              <div className="text-sm font-medium">User Account</div>
              <div className="text-xs text-slate-400">user@email.com</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-3">
            <Menu className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Railways AI Assistant</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => <MessageComponent key={message.id} message={message} />)}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0"><Bot className="w-4 h-4" /></div>
              <div className="bg-slate-700 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          {/* File Attachments Preview */}
          {attachedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="bg-slate-600 rounded-lg px-3 py-2 flex items-center gap-2 max-w-xs">
                  <span className="text-sm truncate">
                    {file.type.startsWith('image/') ? '🖼️' : '📄'} {file.name}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-slate-400 hover:text-red-400 transition-colors"
                    title="Remove file"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <input
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.docx,.png,.jpg,.jpeg,.webp,.gif"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isUploading || isLoading}
            />
            <label htmlFor="file-upload">
              <button 
                className={`p-2 transition-colors ${
                  isUploading || isLoading 
                    ? 'text-slate-500 cursor-not-allowed' 
                    : 'text-slate-400 hover:text-slate-300 cursor-pointer'
                }`} 
                title="Attach file (Images, Documents, Text files)" 
                type="button"
                disabled={isUploading || isLoading}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('file-upload')?.click();
                }}
              >
                {isUploading ? <Upload className="w-5 h-5 animate-pulse" /> : <Paperclip className="w-5 h-5" />}
              </button>
            </label>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!input.trim() || isLoading) return;
                    const form = e.currentTarget.form;
                    if (form) {
                      const formEvent = new Event('submit', { bubbles: true, cancelable: true });
                      form.dispatchEvent(formEvent);
                    }
                  }
                }}
                placeholder="Ask anything..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] max-h-[120px] overflow-y-auto"
                rows={1}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input || input.trim() === ''}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatbotUI;

