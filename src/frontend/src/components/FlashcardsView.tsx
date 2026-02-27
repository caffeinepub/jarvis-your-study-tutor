import { useState, useEffect, useCallback } from 'react';
import { Plus, RotateCcw, ChevronLeft, Loader2, Layers, ArrowLeft } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import type { FlashcardDeckDTO, Flashcard } from '../backend.d';

interface LocalCard {
  id: string;
  front: string;
  back: string;
  interval: number;
  easeFactor: number;
  nextReview: number;
}

interface LocalDeck {
  id: string;
  name: string;
  subject: string;
  cards: LocalCard[];
}

function cardFromBackend(c: Flashcard): LocalCard {
  return {
    id: c.id,
    front: c.front,
    back: c.back,
    interval: Number(c.interval),
    easeFactor: c.easeFactor,
    nextReview: Number(c.nextReview),
  };
}

type DifficultyRating = 'again' | 'hard' | 'good' | 'easy';

export default function FlashcardsView() {
  const backend = useBackend();
  const [decks, setDecks] = useState<LocalDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<LocalDeck | null>(null);
  const [cards, setCards] = useState<LocalCard[]>([]);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'decks' | 'study' | 'add'>('decks');
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');

  const loadDecks = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await backend.getDecks();
      setDecks(raw.map((d: FlashcardDeckDTO) => ({
        id: d.id,
        name: d.name,
        subject: d.subject,
        cards: d.cards.map(cardFromBackend),
      })));
    } catch {
      // Use localStorage fallback
      const stored = localStorage.getItem('jarvis_decks');
      if (stored) setDecks(JSON.parse(stored) as LocalDeck[]);
    } finally {
      setIsLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void loadDecks();
  }, [loadDecks]);

  const createDeck = async () => {
    if (!newDeckName.trim()) return;
    setIsLoading(true);
    try {
      const id = await backend.createDeck(newDeckName, newDeckSubject || 'General');
      const newDeck: LocalDeck = { id, name: newDeckName, subject: newDeckSubject || 'General', cards: [] };
      setDecks((prev) => [...prev, newDeck]);
    } catch {
      const id = `deck_${Date.now()}`;
      const newDeck: LocalDeck = { id, name: newDeckName, subject: newDeckSubject || 'General', cards: [] };
      setDecks((prev) => {
        const updated = [...prev, newDeck];
        localStorage.setItem('jarvis_decks', JSON.stringify(updated));
        return updated;
      });
    } finally {
      setNewDeckName('');
      setNewDeckSubject('');
      setIsLoading(false);
    }
  };

  const openDeck = async (deck: LocalDeck) => {
    setActiveDeck(deck);
    setIsLoading(true);
    try {
      const raw = await backend.getDeckCards(deck.id);
      setCards(raw.map(cardFromBackend));
    } catch {
      setCards(deck.cards);
    } finally {
      setCurrentCardIdx(0);
      setIsFlipped(false);
      setIsLoading(false);
      setView('study');
    }
  };

  const addCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim() || !activeDeck) return;
    setIsLoading(true);
    try {
      const id = await backend.addCard(activeDeck.id, newCardFront, newCardBack);
      const newCard: LocalCard = { id, front: newCardFront, back: newCardBack, interval: 1, easeFactor: 2.5, nextReview: Date.now() };
      setCards((prev) => [...prev, newCard]);
    } catch {
      const newCard: LocalCard = { id: `card_${Date.now()}`, front: newCardFront, back: newCardBack, interval: 1, easeFactor: 2.5, nextReview: Date.now() };
      setCards((prev) => [...prev, newCard]);
    } finally {
      setNewCardFront('');
      setNewCardBack('');
      setIsLoading(false);
    }
  };

  const rateCard = async (rating: DifficultyRating) => {
    if (!activeDeck || cards.length === 0) return;
    const card = cards[currentCardIdx];
    let newInterval = card.interval;
    let newEase = card.easeFactor;

    switch (rating) {
      case 'again': newInterval = 1; newEase = Math.max(1.3, newEase - 0.2); break;
      case 'hard': newInterval = Math.max(1, Math.floor(card.interval * 1.2)); newEase = Math.max(1.3, newEase - 0.15); break;
      case 'good': newInterval = Math.floor(card.interval * newEase); break;
      case 'easy': newInterval = Math.floor(card.interval * newEase * 1.3); newEase = newEase + 0.15; break;
    }

    try {
      await backend.updateCardReview(activeDeck.id, card.id, BigInt(newInterval), newEase);
    } catch {
      // Local only
    }

    setCards((prev) => prev.map((c, idx) =>
      idx === currentCardIdx ? { ...c, interval: newInterval, easeFactor: newEase, nextReview: Date.now() + newInterval * 86400000 } : c,
    ));
    setIsFlipped(false);
    setCurrentCardIdx((prev) => (prev + 1) % cards.length);
  };

  const dueCards = cards.filter((c) => c.nextReview <= Date.now()).length;
  const progress = cards.length > 0 ? Math.round(((currentCardIdx) / cards.length) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {view !== 'decks' && (
          <button
            type="button"
            onClick={() => { setView('decks'); setActiveDeck(null); }}
            className="p-1.5 rounded-lg hover:bg-[#1e2d3d] text-gray-400 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Layers size={20} className="text-blue-400" />
        <h2 className="text-white font-semibold text-lg">
          {view === 'decks' ? 'Flashcard Decks' : activeDeck?.name ?? 'Study'}
        </h2>
      </div>

      {/* Decks View */}
      {view === 'decks' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Create Deck */}
          <div className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4 space-y-3">
            <p className="text-gray-400 text-sm font-medium">Create New Deck</p>
            <Input
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Deck name (e.g. Physics Chapter 5)"
              className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600"
            />
            <Input
              value={newDeckSubject}
              onChange={(e) => setNewDeckSubject(e.target.value)}
              placeholder="Subject (e.g. Physics)"
              className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600"
            />
            <Button
              type="button"
              onClick={() => void createDeck()}
              disabled={isLoading || !newDeckName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
              Create Deck
            </Button>
          </div>

          {/* Deck List */}
          {isLoading && decks.length === 0 ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-blue-400" /></div>
          ) : decks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No decks yet. Create one above!</div>
          ) : (
            decks.map((deck) => (
              <button
                type="button"
                key={deck.id}
                onClick={() => void openDeck(deck)}
                className="w-full bg-[#161b22] hover:bg-[#1c2333] border border-[#1e2d3d] hover:border-[#2d3f52] rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">{deck.name}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{deck.subject} · {deck.cards.length} cards</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full">
                      {deck.cards.filter((c) => c.nextReview <= Date.now()).length} due
                    </span>
                    <ChevronLeft size={14} className="text-gray-500 rotate-180 group-hover:text-white" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Study View */}
      {view === 'study' && activeDeck && (
        <div className="flex-1 flex flex-col">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{currentCardIdx + 1} / {cards.length}</span>
              <span>{dueCards} cards due</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-[#1e2d3d]" />
          </div>

          {cards.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <p className="text-gray-400 text-center">No cards in this deck yet.</p>
              <Button
                type="button"
                onClick={() => setView('add')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus size={16} className="mr-2" />
                Add Cards
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              {/* Card */}
              <button
                type="button"
                className="flex-1 relative cursor-pointer w-full min-h-[200px]"
                onClick={() => setIsFlipped(!isFlipped)}
                aria-label={isFlipped ? 'Show front' : 'Reveal answer'}
              >
                <div className={`absolute inset-0 flex flex-col items-center justify-center bg-[#161b22] border-2 ${isFlipped ? 'border-green-500/50' : 'border-[#1e2d3d]'} rounded-2xl p-6 transition-all`}>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">
                    {isFlipped ? 'Answer' : 'Question'}
                  </p>
                  <p className="text-white text-lg text-center font-medium leading-relaxed">
                    {isFlipped ? cards[currentCardIdx]?.back : cards[currentCardIdx]?.front}
                  </p>
                  {!isFlipped && (
                     <p className="text-gray-600 text-xs mt-6">Tap to reveal answer</p>
                   )}
                 </div>
               </button>

              {/* Rating buttons */}
              {isFlipped ? (
                <div className="grid grid-cols-4 gap-2">
                  {(['again', 'hard', 'good', 'easy'] as DifficultyRating[]).map((rating) => {
                    const colors: Record<DifficultyRating, string> = {
                      again: 'bg-red-600/20 hover:bg-red-600/30 border-red-700/50 text-red-400',
                      hard: 'bg-orange-600/20 hover:bg-orange-600/30 border-orange-700/50 text-orange-400',
                      good: 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-700/50 text-blue-400',
                      easy: 'bg-green-600/20 hover:bg-green-600/30 border-green-700/50 text-green-400',
                    };
                    return (
                      <button
                        type="button"
                        key={rating}
                        onClick={() => void rateCard(rating)}
                        className={`${colors[rating]} border rounded-xl py-2.5 text-sm font-medium capitalize transition-all`}
                      >
                        {rating}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setIsFlipped(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Reveal Answer
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setView('add')}
                    variant="outline"
                    className="border-[#2d3f52] text-gray-300 hover:bg-[#1e2d3d]"
                  >
                    <Plus size={16} />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { setCurrentCardIdx(0); setIsFlipped(false); }}
                    variant="outline"
                    className="border-[#2d3f52] text-gray-300 hover:bg-[#1e2d3d]"
                  >
                    <RotateCcw size={16} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Card View */}
      {view === 'add' && activeDeck && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4 space-y-3">
            <p className="text-gray-400 text-sm font-medium">Add New Card to "{activeDeck.name}"</p>
            <Textarea
              value={newCardFront}
              onChange={(e) => setNewCardFront(e.target.value)}
              placeholder="Front (question)"
              rows={3}
              className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600 resize-none"
            />
            <Textarea
              value={newCardBack}
              onChange={(e) => setNewCardBack(e.target.value)}
              placeholder="Back (answer)"
              rows={3}
              className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600 resize-none"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => void addCard()}
                disabled={isLoading || !newCardFront.trim() || !newCardBack.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                Add Card
              </Button>
              <Button
                type="button"
                onClick={() => setView('study')}
                variant="outline"
                className="border-[#2d3f52] text-gray-300"
              >
                Done
              </Button>
            </div>
          </div>
          <p className="text-gray-500 text-sm text-center">{cards.length} cards in deck</p>
        </div>
      )}
    </div>
  );
}
