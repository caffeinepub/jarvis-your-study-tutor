import { createContext, useContext, useState, useCallback, type ReactNode, type Dispatch, type SetStateAction } from 'react';

export type ViewType =
  | 'chat'
  | 'flashcards'
  | 'quiz'
  | 'notes'
  | 'timer'
  | 'progress'
  | 'exam'
  | 'mindmap'
  | 'goals'
  | 'signin';

export type PersonalityMode = 'friendly' | 'strict_teacher' | 'pro_coder';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
}

interface AppContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  personalityMode: PersonalityMode;
  setPersonalityMode: (mode: PersonalityMode) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  isToolsPanelOpen: boolean;
  setIsToolsPanelOpen: (open: boolean) => void;
  studyStreak: number;
  setStudyStreak: (streak: number) => void;
  isFocusMode: boolean;
  setIsFocusMode: (mode: boolean) => void;
  isTTSEnabled: boolean;
  setIsTTSEnabled: (enabled: boolean) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  isOnline: boolean;
  chatSessions: ChatSession[];
  setChatSessions: Dispatch<SetStateAction<ChatSession[]>>;
  pomodoroMinimized: boolean;
  setPomodoroMinimized: (minimized: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>('chat');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [personalityMode, setPersonalityMode] = useState<PersonalityMode>('friendly');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [studyStreak, setStudyStreak] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isOnline] = useState(() => navigator.onLine);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [pomodoroMinimized, setPomodoroMinimized] = useState(false);

  const handleSetCurrentView = useCallback((view: ViewType) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
    setIsToolsPanelOpen(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView: handleSetCurrentView,
        currentSessionId,
        setCurrentSessionId,
        personalityMode,
        setPersonalityMode,
        isSidebarOpen,
        setIsSidebarOpen,
        isToolsPanelOpen,
        setIsToolsPanelOpen,
        studyStreak,
        setStudyStreak,
        isFocusMode,
        setIsFocusMode,
        isTTSEnabled,
        setIsTTSEnabled,
        selectedLanguage,
        setSelectedLanguage,
        isOnline,
        chatSessions,
        setChatSessions,
        pomodoroMinimized,
        setPomodoroMinimized,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
