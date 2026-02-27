import { X, Sparkles, Globe, Code2, Palette, FileText, LayoutGrid, HelpCircle, StickyNote, MapPin, Calculator, Clock, ImageIcon, Video, BarChart2, Timer, Flame, Target, BrainCircuit, Moon } from 'lucide-react';
import { useAppContext, type ViewType } from '../context/AppContext';

interface ToolItem {
  icon: React.ReactNode;
  label: string;
  view?: ViewType;
  action?: string;
  color?: string;
}

interface ToolSection {
  title: string;
  items: ToolItem[];
  layout: 'grid' | 'list';
}

const TOOL_SECTIONS: ToolSection[] = [
  {
    title: 'QUICK ACTIONS',
    layout: 'grid',
    items: [
      { icon: <Globe size={18} />, label: 'Search Mode', action: 'search', color: 'text-blue-400' },
      { icon: <Code2 size={18} />, label: 'Code Help', action: 'code', color: 'text-green-400' },
      { icon: <Palette size={18} />, label: 'Image Creator', action: 'image', color: 'text-purple-400' },
      { icon: <FileText size={18} />, label: 'Summarize', action: 'summarize', color: 'text-yellow-400' },
    ],
  },
  {
    title: 'STUDY TOOLS',
    layout: 'grid',
    items: [
      { icon: <LayoutGrid size={18} />, label: 'Flashcards', view: 'flashcards', color: 'text-blue-400' },
      { icon: <HelpCircle size={18} />, label: 'Quiz Mode', view: 'quiz', color: 'text-orange-400' },
      { icon: <StickyNote size={18} />, label: 'Notes', view: 'notes', color: 'text-yellow-400' },
      { icon: <MapPin size={18} />, label: 'Mind Map', view: 'mindmap', color: 'text-teal-400' },
      { icon: <Calculator size={18} />, label: 'Formulas', view: 'mindmap', color: 'text-pink-400' },
      { icon: <Clock size={18} />, label: 'Exam Mode', view: 'exam', color: 'text-red-400' },
    ],
  },
  {
    title: 'MEDIA TOOLS',
    layout: 'grid',
    items: [
      { icon: <ImageIcon size={18} />, label: 'Photo Editor', action: 'image', color: 'text-indigo-400' },
      { icon: <Video size={18} />, label: 'Video Editor', action: 'video', color: 'text-cyan-400' },
    ],
  },
  {
    title: 'FEATURES',
    layout: 'list',
    items: [
      { icon: <BarChart2 size={18} />, label: 'Progress', view: 'progress', color: 'text-green-400' },
      { icon: <Timer size={18} />, label: 'Study Timer', view: 'timer', color: 'text-blue-400' },
      { icon: <Flame size={18} />, label: 'Study Streak', view: 'progress', color: 'text-orange-400' },
      { icon: <Target size={18} />, label: 'Daily Goals', view: 'goals', color: 'text-red-400' },
      { icon: <BrainCircuit size={18} />, label: 'Deep Research', action: 'research', color: 'text-purple-400' },
      { icon: <Moon size={18} />, label: 'Focus Mode', action: 'focus', color: 'text-indigo-400' },
    ],
  },
];

export default function ToolsPanel() {
  const { setIsToolsPanelOpen, setCurrentView, setIsFocusMode } = useAppContext();

  const handleItemClick = (item: ToolItem) => {
    if (item.view) {
      setCurrentView(item.view);
      setIsToolsPanelOpen(false);
    } else if (item.action === 'focus') {
      setIsFocusMode(true);
      setIsToolsPanelOpen(false);
    } else if (item.action) {
      // For chat-based actions, navigate to chat with mode
      setCurrentView('chat');
      setIsToolsPanelOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1923] border-l border-[#1e2d3d]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1e2d3d]">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-yellow-400" />
          <h2 className="text-white font-semibold text-base">Tools & Features</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsToolsPanelOpen(false)}
          className="p-1.5 rounded-lg hover:bg-[#1e2d3d] text-gray-400 transition-colors"
          aria-label="Close tools panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tools Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {TOOL_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>

            {section.layout === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {section.items.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex flex-col items-center gap-2 p-3 bg-[#1a2535] hover:bg-[#1e2d3d] rounded-xl border border-[#1e2d3d] hover:border-[#2d3f52] transition-all group"
                  >
                    <div className={`${item.color} group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <span className="text-gray-300 text-xs font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1e2d3d] transition-colors group"
                  >
                    <span className={`${item.color} group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </span>
                    <span className="text-gray-300 text-sm">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
