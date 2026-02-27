import { useEffect, useCallback } from 'react';
import {
  Menu, Grid3X3, Flame, Sun, Volume2, VolumeX, Wifi, WifiOff, BrainCircuit,
} from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { AppProvider, useAppContext, type ChatSession, type ViewType } from './context/AppContext';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useBackend } from './hooks/useBackend';
import Sidebar from './components/Sidebar';
import ToolsPanel from './components/ToolsPanel';
import ChatView from './components/ChatView';
import FlashcardsView from './components/FlashcardsView';
import QuizView from './components/QuizView';
import NotesView from './components/NotesView';
import StudyTimerView from './components/StudyTimerView';
import ProgressView from './components/ProgressView';
import ExamModeView from './components/ExamModeView';
import MindMapView from './components/MindMapView';
import GoalsView from './components/GoalsView';
import SignInView from './components/SignInView';

const VIEW_LABELS: Record<ViewType, string> = {
  chat: 'Chat',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
  notes: 'Notes',
  timer: 'Study Timer',
  progress: 'Progress',
  exam: 'Exam Mode',
  mindmap: 'Mind Map',
  goals: 'Goals',
  signin: 'Sign In',
};

function AppContent() {
  const {
    currentView, setCurrentView,
    isSidebarOpen, setIsSidebarOpen,
    isToolsPanelOpen, setIsToolsPanelOpen,
    studyStreak, setStudyStreak,
    isFocusMode, setIsFocusMode,
    isTTSEnabled, setIsTTSEnabled,
    isOnline,
    currentSessionId, setCurrentSessionId,
    chatSessions, setChatSessions,
    pomodoroMinimized,
  } = useAppContext();

  const { identity } = useInternetIdentity();
  const backend = useBackend();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  // Load streak and chat sessions on mount
  useEffect(() => {
    const loadData = async () => {
      if (!isLoggedIn) return;
      try {
        const [streak, sessions] = await Promise.all([
          backend.getStudyStreak(),
          backend.getChatSessions(),
        ]);
        if (streak) setStudyStreak(Number(streak.currentStreak));
        setChatSessions(sessions.map((s) => ({
          id: s.id,
          title: s.title,
          createdAt: Number(s.createdAt),
        })));
      } catch {
        // Ignore
      }
    };
    void loadData();
  }, [isLoggedIn]);

  const handleNewChat = useCallback(async () => {
    setCurrentView('chat');
    setCurrentSessionId(null);
    if (isLoggedIn) {
      try {
        const id = await backend.createChatSession('New Chat');
        setCurrentSessionId(id);
        const newSession: ChatSession = { id, title: 'New Chat', createdAt: Date.now() };
        setChatSessions((prev) => [...prev, newSession]);
      } catch { /* ignore */ }
    }
  }, [setCurrentView, setCurrentSessionId, isLoggedIn, backend, setChatSessions]);

  const handleSelectSession = useCallback((session: ChatSession) => {
    setCurrentSessionId(session.id);
    setCurrentView('chat');
  }, [setCurrentSessionId, setCurrentView]);

  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      await backend.deleteChatSession(id);
    } catch { /* ignore */ }
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentSessionId === id) setCurrentSessionId(null);
  }, [backend, setChatSessions, currentSessionId, setCurrentSessionId]);

  const renderView = () => {
    switch (currentView) {
      case 'chat': return <ChatView />;
      case 'flashcards': return <FlashcardsView />;
      case 'quiz': return <QuizView />;
      case 'notes': return <NotesView />;
      case 'timer': return <StudyTimerView />;
      case 'progress': return <ProgressView />;
      case 'exam': return <ExamModeView />;
      case 'mindmap': return <MindMapView />;
      case 'goals': return <GoalsView />;
      case 'signin': return <SignInView />;
      default: return <ChatView />;
    }
  };

  const isExamMode = currentView === 'exam';

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] overflow-hidden">
      {/* Focus mode overlay */}
      {isFocusMode && (
        <div className="fixed inset-0 focus-mode z-40 flex items-end justify-center pb-8">
          <button
            type="button"
            onClick={() => setIsFocusMode(false)}
            className="bg-[#161b22] border border-[#2d3f52] text-gray-400 hover:text-white px-4 py-2 rounded-full text-sm"
          >
            Exit Focus Mode
          </button>
        </div>
      )}

      {/* Header - hidden in exam mode and focus mode */}
      {!isExamMode && !isFocusMode && (
        <header className="flex items-center justify-between px-4 py-3 bg-[#0f1923] border-b border-[#1e2d3d] shrink-0 z-20">
          {/* Left: Menu */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-[#1e2d3d] text-gray-400 hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Center: Logo + View Name */}
          <button
            type="button"
            onClick={() => setCurrentView('chat')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Go to chat"
          >
            <img
              src="/assets/uploads/file_000000006f9c71f88d2ac80e55328a9d-4.png"
              alt="Jarvis"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="font-orbitron text-white font-bold text-sm tracking-wider">JARVIS</span>
            {currentView !== 'chat' && (
              <span className="text-gray-400 text-sm">· {VIEW_LABELS[currentView]}</span>
            )}
          </button>

          {/* Right: streak, tts, wifi, tools */}
          <div className="flex items-center gap-1">
            {!isOnline && <WifiOff size={16} className="text-red-400" />}
            {isOnline && <Wifi size={16} className="text-gray-600" />}

            <button
              type="button"
              onClick={() => setIsTTSEnabled(!isTTSEnabled)}
              className={`p-2 rounded-xl transition-colors ${isTTSEnabled ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'}`}
              aria-label={isTTSEnabled ? 'Disable TTS' : 'Enable TTS'}
            >
              {isTTSEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {studyStreak > 0 && (
              <div className="flex items-center gap-1 bg-orange-900/30 border border-orange-700/30 rounded-full px-2 py-1">
                <Flame size={14} className="text-orange-400" />
                <span className="text-orange-300 text-xs font-bold">{studyStreak}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsToolsPanelOpen(true)}
              className="p-2 rounded-xl hover:bg-[#1e2d3d] text-gray-400 hover:text-white transition-colors"
              aria-label="Open tools"
            >
              <Grid3X3 size={20} />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 bg-black/50 z-30 w-full cursor-default"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            />
            <div className="fixed left-0 top-0 bottom-0 w-72 z-40 animate-slide-in-left">
              <Sidebar
                onNewChat={() => void handleNewChat()}
                onSelectSession={handleSelectSession}
                onDeleteSession={(id) => void handleDeleteSession(id)}
              />
            </div>
          </>
        )}

        {/* Tools Panel Overlay */}
        {isToolsPanelOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 bg-black/50 z-30 w-full cursor-default"
              onClick={() => setIsToolsPanelOpen(false)}
              aria-label="Close tools panel"
            />
            <div className="fixed right-0 top-0 bottom-0 w-72 z-40 animate-slide-in-right">
              <ToolsPanel />
            </div>
          </>
        )}

        {/* Main View */}
        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>

      {/* Floating Mini Pomodoro Timer */}
      {pomodoroMinimized && currentView !== 'timer' && (
        <div className="fixed bottom-4 left-4 z-20">
          <StudyTimerView mini onExpand={() => setCurrentView('timer')} />
        </div>
      )}

      {/* Brain/Jarvis floating button when not in chat */}
      {currentView !== 'chat' && !isExamMode && (
        <button
          type="button"
          onClick={() => setCurrentView('chat')}
          className="fixed bottom-4 right-4 z-20 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg glow-blue transition-all"
          aria-label="Return to chat"
        >
          <BrainCircuit size={20} className="text-white" />
        </button>
      )}

      <Toaster />

      {/* Footer */}
      {currentView === 'chat' && !isExamMode && (
        <footer className="bg-[#0f1923] border-t border-[#1e2d3d] py-1 px-4 text-center shrink-0">
          <p className="text-gray-700 text-xs">
            © 2026. Built with ❤️ using{' '}
            <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400 underline">
              caffeine.ai
            </a>
          </p>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
