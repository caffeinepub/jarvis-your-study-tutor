import { useState, useEffect, useCallback } from 'react';
import { Plus, StickyNote, ArrowLeft, Loader2, Wand2, Layers, Trash2, Tag } from 'lucide-react';
import { useGemini } from '../hooks/useGemini';
import { useBackend } from '../hooks/useBackend';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface LocalNote {
  id: string;
  title: string;
  topic: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

type NotesStep = 'list' | 'edit' | 'view';

export default function NotesView() {
  const { summarize, generateFlashcards } = useGemini();
  const backend = useBackend();
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [activeNote, setActiveNote] = useState<LocalNote | null>(null);
  const [step, setStep] = useState<NotesStep>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [summary, setSummary] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editContent, setEditContent] = useState('');

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await backend.getNotes();
      setNotes(raw.map((n) => ({
        id: n.id,
        title: n.title,
        topic: n.topic,
        content: n.content,
        createdAt: Number(n.createdAt),
        updatedAt: Number(n.updatedAt),
      })));
    } catch {
      const stored = localStorage.getItem('jarvis_notes');
      if (stored) setNotes(JSON.parse(stored) as LocalNote[]);
    } finally {
      setIsLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const saveToLocalStorage = (updatedNotes: LocalNote[]) => {
    localStorage.setItem('jarvis_notes', JSON.stringify(updatedNotes));
  };

  const openNew = () => {
    setEditTitle('');
    setEditTopic('');
    setEditContent('');
    setActiveNote(null);
    setSummary('');
    setStep('edit');
  };

  const openNote = (note: LocalNote) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditTopic(note.topic);
    setEditContent(note.content);
    setSummary('');
    setStep('edit');
  };

  const saveNote = async () => {
    if (!editTitle.trim()) return;
    setIsLoading(true);
    const now = Date.now();
    try {
      if (activeNote) {
        await backend.updateNote(activeNote.id, editTitle, editContent, editTopic);
        setNotes((prev) => {
          const updated = prev.map((n) => n.id === activeNote.id
            ? { ...n, title: editTitle, topic: editTopic, content: editContent, updatedAt: now }
            : n,
          );
          saveToLocalStorage(updated);
          return updated;
        });
      } else {
        const id = await backend.createNote(editTitle, editContent, editTopic || 'General');
        const newNote: LocalNote = { id, title: editTitle, topic: editTopic || 'General', content: editContent, createdAt: now, updatedAt: now };
        setNotes((prev) => {
          const updated = [...prev, newNote];
          saveToLocalStorage(updated);
          return updated;
        });
      }
      toast.success('Note saved!');
      setStep('list');
    } catch {
      const id = `note_${Date.now()}`;
      const newNote: LocalNote = { id, title: editTitle, topic: editTopic || 'General', content: editContent, createdAt: now, updatedAt: now };
      setNotes((prev) => {
        const updated = activeNote
          ? prev.map((n) => n.id === activeNote.id ? { ...n, ...newNote, id: n.id } : n)
          : [...prev, newNote];
        saveToLocalStorage(updated);
        return updated;
      });
      toast.success('Note saved locally');
      setStep('list');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (id: string) => {
    try {
      await backend.deleteNote(id);
    } catch { /* ignore */ }
    setNotes((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveToLocalStorage(updated);
      return updated;
    });
    if (activeNote?.id === id) setStep('list');
    toast.success('Note deleted');
  };

  const handleSummarize = async () => {
    if (!editContent.trim()) return;
    setIsSummarizing(true);
    setSummary('');
    try {
      const result = await summarize(editContent);
      setSummary(result);
    } catch {
      toast.error('Failed to summarize');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!editContent.trim()) return;
    setIsGeneratingFlashcards(true);
    try {
      const cards = await generateFlashcards(editContent);
      // Save to localStorage as a deck
      const deck = {
        id: `deck_${Date.now()}`,
        name: editTitle || 'From Note',
        subject: editTopic || 'General',
        cards: cards.map((c, i) => ({
          id: `card_${i}_${Date.now()}`,
          front: c.front,
          back: c.back,
          interval: 1,
          easeFactor: 2.5,
          nextReview: Date.now(),
        })),
      };
      const existing = localStorage.getItem('jarvis_decks');
      const decks = existing ? JSON.parse(existing) as unknown[] : [];
      decks.push(deck);
      localStorage.setItem('jarvis_decks', JSON.stringify(decks));
      toast.success(`Generated ${cards.length} flashcards!`);
    } catch {
      toast.error('Failed to generate flashcards');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const TOPIC_COLORS: Record<string, string> = {
    Math: 'bg-blue-600/20 text-blue-400',
    Physics: 'bg-green-600/20 text-green-400',
    Chemistry: 'bg-orange-600/20 text-orange-400',
    Biology: 'bg-teal-600/20 text-teal-400',
    History: 'bg-yellow-600/20 text-yellow-400',
    English: 'bg-purple-600/20 text-purple-400',
    General: 'bg-gray-600/20 text-gray-400',
  };

  const getTopicColor = (topic: string) => TOPIC_COLORS[topic] ?? 'bg-blue-600/20 text-blue-400';

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {step !== 'list' && (
          <button
            type="button"
            onClick={() => setStep('list')}
            className="p-1.5 rounded-lg hover:bg-[#1e2d3d] text-gray-400 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <StickyNote size={20} className="text-yellow-400" />
        <h2 className="text-white font-semibold text-lg">
          {step === 'list' ? 'Notes' : activeNote ? `Edit: ${activeNote.title}` : 'New Note'}
        </h2>
        {step === 'list' && (
          <button
            type="button"
            onClick={openNew}
            className="ml-auto p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            aria-label="New note"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Notes List */}
      {step === 'list' && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-yellow-400" /></div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <StickyNote size={40} className="text-gray-600" />
              <p className="text-gray-500">No notes yet</p>
              <Button type="button" onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus size={16} className="mr-2" />
                Create First Note
              </Button>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-[#161b22] hover:bg-[#1c2333] border border-[#1e2d3d] hover:border-[#2d3f52] rounded-xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openNote(note)}
                    className="flex-1 text-left"
                    aria-label={`Open note: ${note.title}`}
                  >
                    <h3 className="text-white font-medium line-clamp-1">{note.title}</h3>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{note.content || 'Empty note'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getTopicColor(note.topic)}`}>
                        <Tag size={10} />
                        {note.topic}
                      </span>
                      <span className="text-gray-600 text-xs">
                        {new Date(note.updatedAt || note.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-400 text-gray-600 transition-all"
                    aria-label="Delete note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit View */}
      {step === 'edit' && (
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Note title..."
            className="bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600 font-medium"
          />
          <Input
            value={editTopic}
            onChange={(e) => setEditTopic(e.target.value)}
            placeholder="Topic (e.g. Physics, Math)"
            className="bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600 text-sm"
          />
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Write your notes here..."
            className="flex-1 bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600 text-sm resize-none min-h-[200px]"
            rows={10}
          />

          {/* AI Tools */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleSummarize()}
              disabled={isSummarizing || !editContent.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/40 text-purple-400 rounded-lg text-sm transition-all disabled:opacity-40"
            >
              {isSummarizing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              AI Summarize
            </button>
            <button
              type="button"
              onClick={() => void handleGenerateFlashcards()}
              disabled={isGeneratingFlashcards || !editContent.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-400 rounded-lg text-sm transition-all disabled:opacity-40"
            >
              {isGeneratingFlashcards ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
              Make Flashcards
            </button>
          </div>

          {/* Summary output */}
          {summary && (
            <div className="bg-purple-600/10 border border-purple-600/30 rounded-xl p-3">
              <p className="text-purple-400 text-xs font-medium mb-2 flex items-center gap-1">
                <Wand2 size={12} /> AI Summary
              </p>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          <div className="flex gap-2 pb-2">
            <Button
              type="button"
              onClick={() => void saveNote()}
              disabled={isLoading || !editTitle.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Save Note
            </Button>
            <Button
              type="button"
              onClick={() => setStep('list')}
              variant="outline"
              className="border-[#2d3f52] text-gray-300 hover:bg-[#1e2d3d]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
