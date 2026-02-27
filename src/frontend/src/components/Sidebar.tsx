import { X, Plus, Clock, Settings, LogIn, LogOut, ChevronRight, MessageSquare, Trash2, BookOpen, Globe } from 'lucide-react';
import { useAppContext, type PersonalityMode, type ChatSession } from '../context/AppContext';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { useState } from 'react';

const LANGUAGES = ['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Arabic', 'Portuguese'];

interface SidebarProps {
  onNewChat: () => void;
  onSelectSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
}

export default function Sidebar({ onNewChat, onSelectSession, onDeleteSession }: SidebarProps) {
  const {
    setIsSidebarOpen,
    personalityMode,
    setPersonalityMode,
    selectedLanguage,
    setSelectedLanguage,
    currentSessionId,
    chatSessions,
    setCurrentView,
  } = useAppContext();
  const { login, clear, identity, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();
  const [showSettings, setShowSettings] = useState(false);

  const principalShort = isLoggedIn
    ? identity.getPrincipal().toString().substring(0, 8) + '...'
    : null;

  return (
    <div className="flex flex-col h-full bg-[#0f1923] border-r border-[#1e2d3d]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1e2d3d]">
        <div className="flex items-center gap-3">
          <img
            src="/assets/uploads/file_000000006f9c71f88d2ac80e55328a9d-4.png"
            alt="Jarvis"
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <h1 className="font-orbitron text-white font-bold text-base tracking-wider">JARVIS</h1>
            <p className="text-xs text-green-400 font-medium">Your Study Tutor</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="p-1.5 rounded-lg hover:bg-[#1e2d3d] text-gray-400 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          type="button"
          onClick={() => { onNewChat(); setIsSidebarOpen(false); }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl gap-2"
        >
          <Plus size={16} />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
          <Clock size={12} />
          Chat History
        </div>
        <div className="space-y-1">
          {chatSessions.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">No chats yet</div>
          ) : (
            chatSessions.map((session) => (
              <button
                type="button"
                key={session.id}
                className={`group w-full flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-600/20 text-blue-300'
                    : 'hover:bg-[#1e2d3d] text-gray-300'
                }`}
                onClick={() => { onSelectSession(session); setIsSidebarOpen(false); }}
              >
                <MessageSquare size={14} className="shrink-0 opacity-60" />
                <span className="flex-1 text-sm truncate">{session.title}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  aria-label="Delete chat"
                >
                  <Trash2 size={12} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      <Separator className="bg-[#1e2d3d]" />

      {/* Settings & Sign In */}
      <div className="p-3 space-y-1">
        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1e2d3d] text-gray-300 transition-colors"
        >
          <Settings size={16} />
          <span className="flex-1 text-sm text-left">Settings</span>
          <ChevronRight size={14} className={`transition-transform ${showSettings ? 'rotate-90' : ''}`} />
        </button>

        {showSettings && (
          <div className="pl-3 space-y-3 pb-2 animate-fade-in-up">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1.5">
                Personality Mode
              </p>
              <Select
                value={personalityMode}
                onValueChange={(v) => setPersonalityMode(v as PersonalityMode)}
              >
                <SelectTrigger className="bg-[#1e2d3d] border-[#2d3f52] text-white text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2d3d] border-[#2d3f52]">
                  <SelectItem value="friendly" className="text-white">🤝 Friendly</SelectItem>
                  <SelectItem value="strict_teacher" className="text-white">📚 Strict Teacher</SelectItem>
                  <SelectItem value="pro_coder" className="text-white">💻 Pro Coder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1.5">
                Language
              </p>
              <Select
                value={selectedLanguage}
                onValueChange={setSelectedLanguage}
              >
                <SelectTrigger className="bg-[#1e2d3d] border-[#2d3f52] text-white text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2d3d] border-[#2d3f52]">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang} className="text-white">
                      <Globe size={12} className="inline mr-1" />
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Study Tools Quick Nav */}
        <button
          type="button"
          onClick={() => { setCurrentView('notes'); setIsSidebarOpen(false); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1e2d3d] text-gray-300 transition-colors"
        >
          <BookOpen size={16} />
          <span className="flex-1 text-sm text-left">Study Tools</span>
        </button>

        {/* Sign In / Out */}
        {isLoggedIn ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-2 text-green-400 text-xs">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-green" />
              Signed in: {principalShort}
            </div>
            <button
              type="button"
              onClick={() => clear()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors"
            >
              <LogOut size={16} />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { login(); setIsSidebarOpen(false); }}
            disabled={isLoggingIn}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1e2d3d] text-blue-400 transition-colors disabled:opacity-60"
          >
            <LogIn size={16} />
            <span className="flex-1 text-sm text-left">{isLoggingIn ? 'Signing in...' : 'Sign In'}</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
