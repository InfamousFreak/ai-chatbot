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
    <div key={message.id} className={`flex gap-2 md:gap-3 ${isUser ? 'justify-end' : 'justify-start'} px-2 sm:px-4`}>
      {!isUser && (
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'}`}>
        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'}`}>{timestamp}</div>
      </div>
      {isUser && (
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-3 h-3 sm:w-4 sm:h-4" />
        </div>
      )}
    </div>
  );
});
MessageComponent.displayName = 'MessageComponent';

// Main component
export default function ChatPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="flex h-screen bg-slate-900">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile by default, shown when hamburger clicked */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Close button for mobile */}
        <div className="lg:hidden absolute top-4 right-4">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
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
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with hamburger menu */}
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
          {/* Hamburger menu button - only visible on mobile */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-700 rounded-lg"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500" />
            <h1 className="text-lg font-semibold text-white">AI Chat Assistant</h1>
          </div>
        </header>
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
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-slate-800 border-t border-slate-700">
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
          
          <div className="flex gap-2 items-end">
            <label htmlFor="file-upload" className="cursor-pointer">
              <input
                id="file-upload"
                type="file"
                accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || isLoading}
              />
              <button
                type="button"
                className="p-2 sm:p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 sm:py-3 lg:py-3 text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[56px] sm:min-h-[44px] max-h-[160px] sm:max-h-[120px] overflow-y-auto text-base"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              className="p-3 sm:p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

