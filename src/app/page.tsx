'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

// ==================================================================================
// --- TYPE DEFINITIONS (for TypeScript) ---
// ==================================================================================
interface Message {
  type: 'user' | 'ai';
  text: string;
  sources?: string[];
  related?: string[];
}

interface Chat {
  id: number;
  messages: Message[];
}

// --- Icon Components ---
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const NewChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CollapseIcon = ({ isCollapsed }: { isCollapsed: boolean }) => <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>;
const AttachmentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>;
const ThumbsUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 18.734V6a2 2 0 012-2h4a2 2 0 012 2v4z" /></svg>;
const ThumbsDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 5.266V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4z" /></svg>;
const CopyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;

// ==================================================================================
// --- COMPONENT: Toast (Would be in src/components/Toast.js) ---
// ==================================================================================
interface ToastProps {
  message: string;
  show: boolean;
  onDismiss: () => void;
}
const Toast = ({ message, show, onDismiss }: ToastProps) => {
  if (!show) return null;
  return (
    <div className="fixed top-5 right-5 bg-red-500 text-white py-2 px-4 rounded-lg shadow-lg animate-fade-in-down">
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 font-bold">X</button>
    </div>
  );
};

// ==================================================================================
// --- COMPONENT: Sidebar & Popovers (Would be in src/components/Sidebar.js) ---
// ==================================================================================
const ProfilePopover = () => (<div className="absolute bottom-full mb-2 w-full bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 overflow-hidden z-10"> <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">View Profile</a> <a href="#" className="block px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors">Logout</a> </div>);
const AttachmentPopover = () => (<div className="absolute bottom-full mb-2 w-56 bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700/50 overflow-hidden z-10"> <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> From Computer </a> <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.704 4.045l1.414 1.414M1.414 4.045L2.828 5.459m18.384 0l1.414-1.414M16.296 4.045l-1.414 1.414M12 2.05V3m0 18v.95m-4.296-15.955l-1.414-1.414M4.045 16.296l1.414-1.414m15.955 0l-1.414-1.414M19.955 7.704l-1.414 1.414" /></svg> Google Drive </a> <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700/50 transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-1.026.977-2.13.977-3.268a8 8 0 10-14.5-4.572" /></svg> Dropbox </a> </div>);

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onViewChange: (view: 'chat' | 'history') => void;
  onNewChat: () => void;
}
const Sidebar = ({ isCollapsed, onToggleCollapse, onViewChange, onNewChat }: SidebarProps) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  return (<aside className={`bg-gray-900/70 backdrop-blur-sm flex flex-col flex-shrink-0 border-r border-gray-700/50 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}> <div className={`flex items-center h-20 border-b border-gray-700/50 p-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}> {!isCollapsed && <h1 className="text-xl font-semibold text-white">Railways AI</h1>} <button onClick={onToggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"} className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors focus:outline-none"> <CollapseIcon isCollapsed={isCollapsed} /> </button> </div> <nav className="flex-1 space-y-2 p-4"> <a href="#" onClick={() => onNewChat()} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-white bg-blue-600/50 hover:bg-blue-600/80 rounded-lg transition-colors"> <NewChatIcon /> {!isCollapsed && <span>New Chat</span>} </a> <a href="#" onClick={() => onViewChange('chat')} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"> <ChatIcon /> {!isCollapsed && <span>Chat</span>} </a> <a href="#" onClick={() => onViewChange('history')} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/30 rounded-lg transition-colors"> <HistoryIcon /> {!isCollapsed && <span>History</span>} </a> </nav> <div className="mt-auto p-4 relative"> <button onClick={() => setIsProfileOpen(prev => !prev)} aria-label="User account options" className={`w-full flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors text-left focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}> <img src="https://placehold.co/40x40/52525b/ffffff?text=U" alt="User" className="w-10 h-10 rounded-full" /> {!isCollapsed && (<div> <p className="text-sm font-semibold text-white">User Account</p> <p className="text-xs text-gray-400">user@email.com</p> </div>)} </button> {isProfileOpen && !isCollapsed && <ProfilePopover />} </div> </aside>);
};

// ==================================================================================
// --- COMPONENT: Chat & History Views (Would be in src/components/ChatView.js etc.) ---
// ==================================================================================
const TypingIndicator = () => (<div className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div></div>);

interface ChatMessageProps {
  message: Message;
  onRelatedQuery: (query: string) => void;
}
const ChatMessage = memo(({ message, onRelatedQuery }: ChatMessageProps) => {
  const isUser = message.type === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [message.text]);

  if (isUser) return <div className="col-start-2 col-end-13 md:col-start-3 lg:col-start-5 p-3 rounded-lg"><div className="flex items-center justify-start flex-row-reverse"><div className="relative mr-3 text-sm bg-blue-700/50 py-2 px-4 shadow rounded-xl text-white">{message.text}</div></div></div>;

  return <div className="col-start-1 col-end-12 md:col-end-11 lg:col-end-9 p-3 rounded-lg"><div className="flex flex-col gap-4"><div className="relative text-sm bg-gray-700/50 py-3 px-5 shadow rounded-xl text-gray-300 leading-relaxed"><p>{message.text}</p><div className="absolute -bottom-2 right-0 flex items-center gap-1"><button aria-label="Copy message" onClick={handleCopy} className="p-1 rounded-md hover:bg-gray-600 transition-colors"><CopyIcon /></button><button aria-label="Like response" className="p-1 rounded-md hover:bg-gray-600 transition-colors"><ThumbsUpIcon /></button><button aria-label="Dislike response" className="p-1 rounded-md hover:bg-gray-600 transition-colors"><ThumbsDownIcon /></button></div>{copied && <span className="absolute -top-6 right-0 text-xs bg-green-500 text-white px-2 py-0.5 rounded-md">Copied!</span>}</div>{message.sources && message.sources.length > 0 && (<div className="text-xs text-gray-400"><h4 className="font-semibold mb-2">Sources:</h4><div className="flex flex-wrap gap-2">{message.sources.map((source, i) => (<span key={i} className="bg-gray-800/60 px-2 py-1 rounded-md">{source}</span>))}</div></div>)}{message.related && message.related.length > 0 && (<div className="text-xs text-gray-400"><h4 className="font-semibold mb-2">Related Questions:</h4><div className="flex flex-wrap gap-2">{message.related.map((q, i) => (<button key={i} onClick={() => onRelatedQuery(q)} className="bg-gray-700/60 hover:bg-gray-700/90 px-3 py-1.5 rounded-lg transition-colors text-sm text-gray-300">{q}</button>))}</div></div>)}</div></div>;
});
ChatMessage.displayName = 'ChatMessage';

interface ChatViewProps {
  conversation: Message[];
  isLoading: boolean;
  onQuery: (query?: string) => void;
  userInput: string;
  setUserInput: React.Dispatch<React.SetStateAction<string>>;
}
const ChatView = ({ conversation, isLoading, onQuery, userInput, setUserInput }: ChatViewProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation, isLoading]);

  return (<div className="flex flex-col flex-auto flex-shrink-0 rounded-2xl bg-gray-900/50 h-full p-4"> <div className="flex flex-col h-full overflow-x-auto mb-4" aria-live="polite"> <div className="grid grid-cols-12 gap-y-2"> {conversation.map((msg, index) => <ChatMessage key={index} message={msg} onRelatedQuery={onQuery} />)} {isLoading && <div className="col-start-1 col-end-8 p-3 rounded-lg"><div className="flex flex-row items-center"><TypingIndicator /></div></div>} <div ref={chatEndRef} /> </div> </div> <div className="flex flex-row items-center h-16 rounded-xl bg-gray-800/80 w-full px-4"> <div className="relative"> <button onClick={() => setIsAttachmentOpen(prev => !prev)} aria-label="Attach files" className="p-2 rounded-full hover:bg-gray-700/50 transition-colors focus:outline-none"> <AttachmentIcon /> </button> {isAttachmentOpen && <AttachmentPopover />} </div> <div className="flex-grow ml-4"> <form onSubmit={(e) => { e.preventDefault(); onQuery(); }}> <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} className="w-full bg-transparent text-gray-200 focus:outline-none" placeholder="Ask anything..." disabled={isLoading} /> </form> </div> <div className="ml-4"> <button onClick={() => onQuery()} disabled={isLoading || !userInput} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-xl text-white px-4 py-2 flex-shrink-0 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"> <span>Send</span><span className="ml-2"><svg className="w-4 h-4 transform rotate-45 -mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></span> </button> </div> </div> </div>);
};

interface HistoryViewProps {
  chatHistory: Chat[];
  onSelectChat: (id: number) => void;
}
const HistoryView = ({ chatHistory, onSelectChat }: HistoryViewProps) => (<div className="flex flex-col flex-auto flex-shrink-0 rounded-2xl bg-gray-900/50 h-full p-6"> <h2 className="text-2xl font-semibold text-white mb-6">Chat History</h2> <div className="space-y-4 overflow-y-auto"> {chatHistory.length === 0 && <p className="text-gray-400">No chat history found.</p>} {chatHistory.map(chat => (<div key={chat.id} onClick={() => onSelectChat(chat.id)} className="p-4 bg-gray-800/60 rounded-lg cursor-pointer hover:bg-gray-800/90 transition-colors"> <p className="font-semibold text-white truncate">{chat.messages.find(m => m.type === 'user')?.text || 'New Chat'}</p> <p className="text-sm text-gray-400 mt-1">{new Date(chat.id).toLocaleDateString()}</p> </div>))} </div> </div>);

// ==================================================================================
// --- MAIN PAGE COMPONENT (The actual page.js file) ---
// ==================================================================================
export default function Home() {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat');
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  // NOTE: For production, create a .env.local file in your project root and add:
  // NEXT_PUBLIC_BACKEND_URL=http://your-hosted-backend-url.com/ask
  const backendUrl = 'http://127.0.0.1:8000/ask';

  // Load chat history from localStorage on initial render
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('railways_ai_chat_history');
      const history: Chat[] = savedHistory ? JSON.parse(savedHistory) : [];

      if (history.length > 0) {
        setChatHistory(history);
        const savedChatId = localStorage.getItem('railways_ai_current_chat_id');
        setCurrentChatId(savedChatId ? parseInt(savedChatId, 10) : history[0].id);
      } else {
        const newId = Date.now();
        const newChat: Chat = { id: newId, messages: [{ type: 'ai', text: 'Hello! How can I help you today?', related: ["Train schedules", "Ticket booking"] }] };
        setChatHistory([newChat]);
        setCurrentChatId(newId);
      }
    } catch (error) {
      console.error("Failed to parse chat history:", error);
      const newId = Date.now();
      const newChat: Chat = { id: newId, messages: [{ type: 'ai', text: 'Hello! How can I help you today?', related: ["Train schedules", "Ticket booking"] }] };
      setChatHistory([newChat]);
      setCurrentChatId(newId);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('railways_ai_chat_history', JSON.stringify(chatHistory));
    }
    if (currentChatId) {
      localStorage.setItem('railways_ai_current_chat_id', currentChatId.toString());
    }
  }, [chatHistory, currentChatId]);

  // Load new font
  useEffect(() => {
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap";
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const activeConversation = chatHistory.find(c => c.id === currentChatId)?.messages || [];

  const handleNewChat = useCallback(() => {
    const newId = Date.now();
    const newChat: Chat = { id: newId, messages: [{ type: 'ai', text: 'Hello! How can I help you today?', related: ["Train schedules", "Ticket booking"] }] };
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(newId);
    setCurrentView('chat');
  }, []);

  const handleSelectChat = useCallback((id: number) => {
    setCurrentChatId(id);
    setCurrentView('chat');
  }, []);

  const handleQuery = useCallback(async (queryOverride?: string) => {
    const query = queryOverride || userInput.trim();
    if (!query || isLoading) return;

    setUserInput('');
    const userMessage: Message = { type: 'user', text: query };

    setChatHistory(prev => prev.map(chat => chat.id === currentChatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat));
    setIsLoading(true);

    try {
      const response = await fetch(backendUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, top_k: 3 }) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const aiResponseText = data.results?.map((r: { text: string }) => r.text).join(' \n\n') || "I couldn't find specific information. Can you rephrase?";
      const aiMessage: Message = { type: 'ai', text: '', sources: data.results?.map((r: { doc_id: string }) => r.doc_id) || [], related: ["Luggage policies", "Refund status"] };

      // Add the empty AI message object first
      setChatHistory(prev => prev.map(chat => chat.id === currentChatId ? { ...chat, messages: [...chat.messages, aiMessage] } : chat));

      // SIMULATED STREAMING EFFECT
      const words = aiResponseText.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Delay between words
        setChatHistory(prev => prev.map(chat => {
          if (chat.id === currentChatId) {
            const currentMessages = [...chat.messages];
            if (currentMessages.length > 0) {
              const lastMsg = { ...currentMessages[currentMessages.length - 1] };
              lastMsg.text += (i > 0 ? ' ' : '') + words[i];
              return { ...chat, messages: [...currentMessages.slice(0, -1), lastMsg] };
            }
          }
          return chat;
        }));
      }

    } catch (error) {
      console.error('API Error:', error);
      setToast({ show: true, message: "Failed to connect to the AI. Please try again." });
      const errorMessage: Message = { type: 'ai', text: "I'm having trouble connecting to my knowledge base. Please check your connection and try again." };
      setChatHistory(prev => prev.map(chat => chat.id === currentChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat));
    } finally {
      setIsLoading(false);
    }
  }, [userInput, isLoading, currentChatId, backendUrl]);

  return (
    <main className="font-manrope">
      <style jsx global>{`
        .font-manrope {
          font-family: 'Manrope', sans-serif;
        }
      `}</style>
      <Toast message={toast.message} show={toast.show} onDismiss={() => setToast({ show: false, message: '' })} />
      <div className="w-full h-screen bg-gray-800 flex text-gray-200">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)} onViewChange={setCurrentView} onNewChat={handleNewChat} />
        <div className="flex flex-col flex-auto h-full p-4 md:p-6">
          {currentView === 'chat' && (<ChatView conversation={activeConversation} isLoading={isLoading} onQuery={handleQuery} userInput={userInput} setUserInput={setUserInput} />)}
          {currentView === 'history' && (<HistoryView chatHistory={chatHistory} onSelectChat={handleSelectChat} />)}
        </div>
      </div>
    </main>
  );
}

