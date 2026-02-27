import {
  useState, useRef, useEffect, useCallback,
} from 'react';

// Speech Recognition types
interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}
import {
  Send, Mic, MicOff, Search, Code2, ImageIcon, MessageSquare,
  Copy, Volume2, ThumbsUp, Paperclip, X, Loader2, BrainCircuit,
  RefreshCw, ChevronDown,
} from 'lucide-react';
import { useGemini, type GeminiMessage } from '../hooks/useGemini';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';

type ChatMode = 'chat' | 'search' | 'code' | 'image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: number;
  isLoading?: boolean;
}

const PERSONALITY_PROMPTS: Record<string, string> = {
  friendly: 'You are Jarvis, a friendly and encouraging AI study tutor. Be warm, supportive, use emojis occasionally, and use simple language. Help students learn and understand concepts clearly.',
  strict_teacher: 'You are Jarvis, a strict academic tutor. Be precise, rigorous, always test understanding, and push students to think deeper. Provide thorough explanations with examples.',
  pro_coder: 'You are Jarvis, an expert programmer and software engineer. Focus on code quality, best practices, technical precision, and clean architecture. Explain concepts with code examples.',
};

const QUICK_ACTIONS = [
  { icon: <Search size={18} className="text-blue-400" />, label: 'Search the web', prompt: 'Search and explain: ' },
  { icon: <Code2 size={18} className="text-green-400" />, label: 'Help with code', prompt: 'Help me with this code: ' },
  { icon: <ImageIcon size={18} className="text-purple-400" />, label: 'Generate ideas', prompt: 'Generate creative ideas for: ' },
  { icon: <BrainCircuit size={18} className="text-yellow-400" />, label: 'Explain a topic', prompt: 'Explain this topic clearly: ' },
];

type ParsedBlock =
  | { type: 'code'; lang: string; content: string }
  | { type: 'h1' | 'h2' | 'h3'; content: string }
  | { type: 'li'; content: string; ordered: boolean }
  | { type: 'blockquote'; content: string }
  | { type: 'text'; content: string };

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`|\*(.+?)\*)/g;
  let lastIdx = 0;
  let keyCounter = 0;
  const makeKey = () => { keyCounter += 1; return keyCounter; };
  const matched = regex.exec(text);
  const processMatches = (m: RegExpExecArray | null): void => {
    if (!m) {
      if (lastIdx < text.length) parts.push(<span key={makeKey()}>{text.slice(lastIdx)}</span>);
      return;
    }
    if (m.index > lastIdx) {
      parts.push(<span key={makeKey()}>{text.slice(lastIdx, m.index)}</span>);
    }
    if (m[2]) {
      parts.push(<strong key={makeKey()} className="text-white font-semibold">{m[2]}</strong>);
    } else if (m[3]) {
      parts.push(<code key={makeKey()} className="bg-gray-800 text-green-400 px-1 py-0.5 rounded text-sm font-mono">{m[3]}</code>);
    } else if (m[4]) {
      parts.push(<em key={makeKey()} className="text-gray-300">{m[4]}</em>);
    }
    lastIdx = m.index + m[0].length;
    processMatches(regex.exec(text));
  };
  processMatches(matched);
  return parts;
}

function MarkdownRenderer({ content }: { content: string }) {
  const blocks: ParsedBlock[] = [];
  const lines = content.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') });
    } else if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', content: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', content: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', content: line.slice(2) });
    } else if (line.startsWith('* ') || line.startsWith('- ')) {
      blocks.push({ type: 'li', content: line.slice(2), ordered: false });
    } else if (/^\d+\. /.test(line)) {
      blocks.push({ type: 'li', content: line.replace(/^\d+\. /, ''), ordered: true });
    } else if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: line.slice(2) });
    } else {
      blocks.push({ type: 'text', content: line });
    }
    i++;
  }

  const blockKeys = blocks.map((b, i) => `${b.type}-${i}-${b.content.substring(0, 10)}`);

  return (
    <div className="text-gray-200 text-sm leading-relaxed space-y-1">
      {blocks.map((block, bIdx) => {
        const bKey = blockKeys[bIdx];
        if (block.type === 'code') {
          return (
            <pre key={bKey} className="bg-gray-900 border border-gray-700 rounded-lg p-3 overflow-x-auto">
              <code className="text-green-300 text-xs font-mono">{block.content}</code>
            </pre>
          );
        }
        if (block.type === 'h1') return <h1 key={bKey} className="text-xl font-bold text-white mt-3 mb-1">{renderInline(block.content)}</h1>;
        if (block.type === 'h2') return <h2 key={bKey} className="text-lg font-semibold text-white mt-2 mb-1">{renderInline(block.content)}</h2>;
        if (block.type === 'h3') return <h3 key={bKey} className="text-base font-semibold text-white mt-2 mb-0.5">{renderInline(block.content)}</h3>;
        if (block.type === 'li') {
          return (
            <li key={bKey} className={`${block.ordered ? 'list-decimal' : 'list-disc'} ml-5 text-gray-200`}>
              {renderInline(block.content)}
            </li>
          );
        }
        if (block.type === 'blockquote') {
          return <blockquote key={bKey} className="border-l-2 border-blue-500 pl-3 text-gray-400 italic">{renderInline(block.content)}</blockquote>;
        }
        if (block.content === '') return <div key={bKey} className="h-1" />;
        return <p key={bKey}>{renderInline(block.content)}</p>;
      })}
    </div>
  );
}

export default function ChatView() {
  const { personalityMode, isTTSEnabled, isOnline } = useAppContext();
  const { sendMessage, generateImage, generateSmartReplies, deepResearch } = useGemini();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [attachedImage, setAttachedImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // TTS
  const speakText = useCallback((text: string) => {
    if (!isTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`]/g, ''));
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [isTTSEnabled]);

  // STT
  const toggleListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join('');
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAttachedImage({
        base64,
        mimeType: file.type,
        preview: result,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildSystemPrompt = () => {
    let prompt = PERSONALITY_PROMPTS[personalityMode] || PERSONALITY_PROMPTS.friendly;
    if (chatMode === 'search') {
      prompt += ' Focus on providing comprehensive, well-researched information.';
    } else if (chatMode === 'code') {
      prompt += ' Focus on code examples, debugging, and technical explanations. Format code properly in code blocks.';
    }
    return prompt;
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedImage) || isLoading || !isOnline) return;

    const userText = input.trim() || (attachedImage ? 'Analyze this image.' : '');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      imageUrl: attachedImage?.preview,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSmartReplies([]);
    const imgToSend = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    const loadingId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: loadingId, role: 'assistant', content: '', timestamp: Date.now(), isLoading: true }]);

    try {
      let responseText: string;

      if (chatMode === 'image') {
        responseText = await generateImage(userText);
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
        setMessages((prev) => [...prev, {
          id: loadingId,
          role: 'assistant',
          content: 'Here is your generated image:',
          imageUrl: responseText,
          timestamp: Date.now(),
        }]);
        setIsLoading(false);
        return;
      }

      const historyMessages: GeminiMessage[] = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }));

      historyMessages.push({ role: 'user', content: userText });

      if (chatMode === 'chat' && userText.toLowerCase().includes('research')) {
        responseText = await deepResearch(userText);
      } else {
        responseText = await sendMessage(
          historyMessages,
          buildSystemPrompt(),
          imgToSend?.base64,
          imgToSend?.mimeType,
        );
      }

      setMessages((prev) => prev.map((m) =>
        m.id === loadingId ? { ...m, content: responseText, isLoading: false } : m,
      ));

      if (isTTSEnabled) speakText(responseText);

      // Generate smart replies in background
      generateSmartReplies(responseText, userText)
        .then((replies) => setSmartReplies(replies))
        .catch(() => {});
    } catch (err) {
      // Show user-friendly error instead of raw API error strings
      const rawMsg = err instanceof Error ? err.message : '';
      let friendlyMsg: string;
      if (rawMsg.includes('429') || rawMsg.toLowerCase().includes('rate limit') || rawMsg.toLowerCase().includes('quota')) {
        friendlyMsg = 'Jarvis is busy right now — please wait a moment and try again.';
      } else if (rawMsg.includes('401') || rawMsg.includes('403') || rawMsg.toLowerCase().includes('unauthorized') || rawMsg.toLowerCase().includes('api key')) {
        friendlyMsg = 'AI service authentication issue. Please try again shortly.';
      } else if (rawMsg.includes('404') || rawMsg.toLowerCase().includes('not found')) {
        friendlyMsg = 'AI service temporarily unavailable. Please try again.';
      } else if (rawMsg.toLowerCase().includes('network') || rawMsg.toLowerCase().includes('fetch') || rawMsg.toLowerCase().includes('failed to fetch')) {
        friendlyMsg = 'Network error — check your connection and try again.';
      } else if (rawMsg.toLowerCase().includes('all ai providers failed')) {
        friendlyMsg = 'All AI services are currently unavailable. Please try again in a moment.';
      } else {
        friendlyMsg = 'AI is currently unavailable — please try again.';
      }
      setMessages((prev) => prev.map((m) =>
        m.id === loadingId ? { ...m, content: `⚠️ ${friendlyMsg}`, isLoading: false } : m,
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const copyMessage = (id: string, content: string) => {
    void navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const speakMessage = (content: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.replace(/[#*`]/g, ''));
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {!isOnline && (
        <div className="bg-red-900/50 border-b border-red-700 px-4 py-2 text-red-300 text-sm text-center">
          ⚠️ You're offline — cannot connect to Jarvis
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative"
      >
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-fade-in-up">
            <div className="relative mb-6">
              <img
                src="/assets/uploads/file_000000006f9c71f88d2ac80e55328a9d-4.png"
                alt="Jarvis"
                className="w-24 h-24 rounded-full object-cover glow-green"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-[#0d1117] pulse-green" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">How can I help you today?</h2>
            <p className="text-gray-400 text-sm max-w-sm mb-8">
              Ask me anything! I can help with research, coding, writing, image creation, and more.
            </p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
              {QUICK_ACTIONS.map((action) => (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-2 p-3 bg-[#161b22] hover:bg-[#1c2333] border border-[#1e2d3d] hover:border-[#2d3f52] rounded-xl text-left transition-all group"
                >
                  <span className="group-hover:scale-110 transition-transform">{action.icon}</span>
                  <span className="text-gray-300 text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-green-400/30">
                    <img
                      src="/assets/uploads/file_000000006f9c71f88d2ac80e55328a9d-4.png"
                      alt="Jarvis"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-[#161b22] border border-[#1e2d3d] rounded-tl-sm'
                    }`}
                  >
                    {msg.imageUrl && (
                      <div className="mb-2">
                        <img
                          src={msg.imageUrl}
                          alt="Uploaded"
                          className="rounded-lg max-w-full max-h-64 object-contain"
                        />
                      </div>
                    )}
                    {msg.isLoading ? (
                      <div className="flex items-center gap-1 py-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot-1" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot-2" />
                        <div className="w-2 h-2 bg-blue-400 rounded-full typing-dot-3" />
                      </div>
                    ) : msg.role === 'user' ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>

                  {/* AI message actions */}
                  {msg.role === 'assistant' && !msg.isLoading && msg.content && (
                    <div className="flex items-center gap-2 px-1">
                      <button
                        type="button"
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="p-1 hover:text-white text-gray-500 transition-colors"
                        title="Copy"
                        aria-label="Copy message"
                      >
                        {copiedId === msg.id ? <ThumbsUp size={13} className="text-green-400" /> : <Copy size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.content)}
                        className="p-1 hover:text-white text-gray-500 transition-colors"
                        title="Read aloud"
                        aria-label="Read aloud"
                      >
                        <Volume2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => { void handleSend(); }}
                        className="p-1 hover:text-white text-gray-500 transition-colors"
                        title="Regenerate"
                        aria-label="Regenerate response"
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Smart Reply Chips */}
            {smartReplies.length > 0 && !isLoading && (
              <div className="flex flex-wrap gap-2 px-2 pb-2 animate-fade-in-up">
                {smartReplies.map((reply) => (
                  <button
                    type="button"
                    key={reply}
                    onClick={() => { setInput(reply); setSmartReplies([]); }}
                    className="text-xs bg-[#1c2333] hover:bg-[#1e2d3d] border border-[#2d3f52] text-blue-300 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-32 right-6 bg-[#1c2333] border border-[#2d3f52] rounded-full p-2 text-gray-400 hover:text-white hover:bg-[#253346] transition-all shadow-lg z-10"
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={16} />
        </button>
      )}

      {/* Input Area */}
      <div className="border-t border-[#1e2d3d] bg-[#0f1923] p-3">
        {/* Mode Tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {(['chat', 'search', 'code', 'image'] as ChatMode[]).map((mode) => {
            const labels: Record<ChatMode, { icon: React.ReactNode; text: string }> = {
              chat: { icon: <MessageSquare size={13} />, text: 'Chat' },
              search: { icon: <Search size={13} />, text: 'Search' },
              code: { icon: <Code2 size={13} />, text: 'Code' },
              image: { icon: <ImageIcon size={13} />, text: 'Image' },
            };
            return (
              <button
                type="button"
                key={mode}
                onClick={() => setChatMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  chatMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#1a2535] text-gray-400 hover:bg-[#1e2d3d] hover:text-gray-200'
                }`}
              >
                {labels[mode].icon}
                {labels[mode].text}
              </button>
            );
          })}
        </div>

        {/* Attached image preview */}
        {attachedImage && (
          <div className="flex items-center gap-2 mb-2 bg-[#1a2535] rounded-lg p-2">
            <img src={attachedImage.preview} alt="Attached" className="w-10 h-10 rounded object-cover" />
            <span className="text-gray-400 text-xs flex-1">Image attached</span>
            <button
              type="button"
              onClick={() => setAttachedImage(null)}
              className="text-gray-500 hover:text-white"
              aria-label="Remove attached image"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">
          {/* File Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-xl bg-[#1a2535] hover:bg-[#1e2d3d] text-gray-400 hover:text-white transition-colors"
            aria-label="Attach image"
          >
            <Paperclip size={18} />
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Jarvis anything..."
            rows={1}
            className="flex-1 bg-[#1a2535] border border-[#2d3f52] text-white placeholder:text-gray-500 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors min-h-[42px] max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.currentTarget;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 128) + 'px';
            }}
          />

          {/* Mic button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`shrink-0 p-2 rounded-xl transition-colors ${
              isListening
                ? 'bg-red-600 text-white animate-listening'
                : 'bg-[#1a2535] hover:bg-[#1e2d3d] text-gray-400 hover:text-white'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send button */}
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={isLoading || (!input.trim() && !attachedImage)}
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl disabled:opacity-40 glow-blue"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>

        <p className="text-gray-600 text-xs text-center mt-2">
          Jarvis can make mistakes so recheck important information
        </p>
      </div>
    </div>
  );
}
