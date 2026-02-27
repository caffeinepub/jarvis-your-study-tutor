import { useState, useEffect, useRef } from 'react';
import { Clock, BookOpen, X, Loader2, Send } from 'lucide-react';
import { useGemini, type GeminiMessage } from '../hooks/useGemini';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

type ExamType = 'JEE' | 'Boards' | 'Custom';

interface ExamMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export default function ExamModeView() {
  const { sendMessage } = useGemini();
  const [examType, setExamType] = useState<ExamType>('JEE');
  const [duration, setDuration] = useState(7200); // 2 hours
  const [customHours, setCustomHours] = useState(2);
  const [isStarted, setIsStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState<ExamMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isStarted) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStarted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  });

  const startExam = () => {
    const d = duration === -1 ? customHours * 3600 : duration;
    setTimeLeft(d);
    setMessages([]);
    setIsStarted(true);
  };

  const endExam = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsStarted(false);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const timePercent = timeLeft > 0 ? (timeLeft / (duration === -1 ? customHours * 3600 : duration)) * 100 : 0;
  const isLowTime = timeLeft < 300;

  const SYSTEM_PROMPTS: Record<ExamType, string> = {
    JEE: 'You are a JEE exam assistant. Help the student with JEE-level Physics, Chemistry, and Mathematics problems. Provide step-by-step solutions and explain concepts at JEE Advanced level.',
    Boards: 'You are a Board exam assistant. Help the student with Class 12 Board exam level questions. Provide clear, complete answers suitable for Board examination.',
    Custom: 'You are a focused exam assistant. Help the student with their exam questions. Provide clear, structured answers.',
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ExamMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    const loadingId = `${Date.now() + 1}`;
    setMessages((prev) => [...prev, { id: loadingId, role: 'assistant', content: '', isLoading: true }]);

    try {
      const history: GeminiMessage[] = messages
        .filter((m) => !m.isLoading)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }));
      history.push({ role: 'user', content: input });
      const response = await sendMessage(history, SYSTEM_PROMPTS[examType]);
      setMessages((prev) => prev.map((m) => m.id === loadingId ? { ...m, content: response, isLoading: false } : m));
    } catch (e) {
      setMessages((prev) => prev.map((m) => m.id === loadingId ? { ...m, content: `Error: ${e instanceof Error ? e.message : 'Failed'}`, isLoading: false } : m));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="flex flex-col h-full bg-[#0d1117] p-4 items-center justify-center gap-6">
        <div className="text-center">
          <Clock size={48} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-white text-2xl font-bold mb-1">Exam Mode</h2>
          <p className="text-gray-400 text-sm">Full-screen focused study with countdown</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <p className="text-gray-400 text-sm mb-2">Exam Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(['JEE', 'Boards', 'Custom'] as ExamType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setExamType(t)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    examType === t
                      ? 'bg-red-600/20 border-red-600/50 text-red-300'
                      : 'bg-[#161b22] border-[#1e2d3d] text-gray-400 hover:border-[#2d3f52]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-sm mb-2">Duration</p>
            <Select
              value={duration.toString()}
              onValueChange={(v) => setDuration(parseInt(v))}
            >
              <SelectTrigger className="bg-[#161b22] border-[#2d3f52] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e2d3d] border-[#2d3f52]">
                <SelectItem value="3600" className="text-white">1 hour</SelectItem>
                <SelectItem value="7200" className="text-white">2 hours</SelectItem>
                <SelectItem value="10800" className="text-white">3 hours</SelectItem>
                <SelectItem value="-1" className="text-white">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {duration === -1 && (
            <div className="flex items-center gap-3">
              <p className="text-gray-400 text-sm">Hours:</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomHours((h) => Math.max(1, h - 1))}
                  className="w-8 h-8 rounded-full bg-[#1e2d3d] text-white hover:bg-[#2d3f52] flex items-center justify-center"
                >-</button>
                <span className="text-white text-lg font-bold w-8 text-center">{customHours}</span>
                <button
                  type="button"
                  onClick={() => setCustomHours((h) => Math.min(6, h + 1))}
                  className="w-8 h-8 rounded-full bg-[#1e2d3d] text-white hover:bg-[#2d3f52] flex items-center justify-center"
                >+</button>
              </div>
            </div>
          )}

          <Button
            type="button"
            onClick={startExam}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <BookOpen size={16} className="mr-2" />
            Start Exam Mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#080c12]">
      {/* Exam Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/30 bg-[#0f1117]">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-red-400" />
          <span className="text-white text-sm font-semibold">{examType} Exam</span>
        </div>
        {/* Timer */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isLowTime ? 'bg-red-900/40 border border-red-600/50' : 'bg-[#161b22]'}`}>
          <Clock size={14} className={isLowTime ? 'text-red-400' : 'text-gray-400'} />
          <span className={`font-mono text-sm font-bold ${isLowTime ? 'text-red-400' : 'text-white'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <button
          type="button"
          onClick={endExam}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 rounded-lg text-xs font-medium transition-colors"
        >
          <X size={14} />
          End Exam
        </button>
      </div>

      {/* Timer Progress Bar */}
      <div className="h-0.5 bg-[#1e2d3d]">
        <div
          className={`h-full transition-all duration-1000 ${isLowTime ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Clock size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Exam started. Ask your questions below.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#161b22] border border-[#1e2d3d] text-gray-200'
              }`}
            >
              {msg.isLoading ? (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot-1" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot-2" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot-3" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#1e2d3d] p-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
          placeholder="Ask exam question..."
          rows={2}
          className="flex-1 bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600 text-sm resize-none"
        />
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={isLoading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 self-end"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  );
}
