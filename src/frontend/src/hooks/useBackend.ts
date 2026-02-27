import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import { PersonalityMode } from '../backend.d';

export { PersonalityMode };

export function useBackend() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  // ---- Chat Sessions ----
  const createChatSession = async (title: string): Promise<string> => {
    if (!actor) throw new Error('Not connected');
    return actor.createChatSession(title);
  };

  const getChatSessions = async () => {
    if (!actor) return [];
    try { return await actor.getChatSessions(); } catch { return []; }
  };

  const addMessage = async (sessionId: string, role: string, content: string): Promise<void> => {
    if (!actor) return;
    await actor.addMessage(sessionId, role, content);
  };

  const getChatMessages = async (sessionId: string) => {
    if (!actor) return [];
    try { return await actor.getChatMessages(sessionId); } catch { return []; }
  };

  const deleteChatSession = async (sessionId: string): Promise<void> => {
    if (!actor) return;
    await actor.deleteChatSession(sessionId);
  };

  // ---- Notes ----
  const getNotes = async () => {
    if (!actor) return [];
    try { return await actor.getNotes(); } catch { return []; }
  };

  const createNote = async (title: string, content: string, topic: string): Promise<string> => {
    if (!actor) throw new Error('Not connected');
    return actor.createNote(title, content, topic);
  };

  const updateNote = async (noteId: string, title: string, content: string, topic: string): Promise<void> => {
    if (!actor) return;
    await actor.updateNote(noteId, title, content, topic);
  };

  const deleteNote = async (noteId: string): Promise<void> => {
    if (!actor) return;
    await actor.deleteNote(noteId);
  };

  // ---- Flashcard Decks ----
  const getDecks = async () => {
    if (!actor) return [];
    try { return await actor.getDecks(); } catch { return []; }
  };

  const createDeck = async (name: string, subject: string): Promise<string> => {
    if (!actor) throw new Error('Not connected');
    return actor.createDeck(name, subject);
  };

  const addCard = async (deckId: string, front: string, back: string): Promise<string> => {
    if (!actor) throw new Error('Not connected');
    return actor.addCard(deckId, front, back);
  };

  const getDeckCards = async (deckId: string) => {
    if (!actor) return [];
    try { return await actor.getDeckCards(deckId); } catch { return []; }
  };

  const updateCardReview = async (deckId: string, cardId: string, interval: bigint, easeFactor: number): Promise<void> => {
    if (!actor) return;
    await actor.updateCardReview(deckId, cardId, interval, easeFactor);
  };

  // ---- Goals ----
  const getGoals = async () => {
    if (!actor) return [];
    try { return await actor.getGoals(); } catch { return []; }
  };

  const createGoal = async (title: string, description: string, targetDate: bigint): Promise<string> => {
    if (!actor) throw new Error('Not connected');
    return actor.createGoal(title, description, targetDate);
  };

  const completeGoal = async (goalId: string): Promise<void> => {
    if (!actor) return;
    await actor.completeGoal(goalId);
  };

  // ---- Progress ----
  const getProgressStats = async () => {
    if (!actor) return [];
    try { return await actor.getProgressStats(); } catch { return []; }
  };

  const updateProgressStat = async (subject: string, masteryPercent: number): Promise<void> => {
    if (!actor) return;
    await actor.updateProgressStat(subject, masteryPercent);
  };

  const getStudyStreak = async () => {
    if (!actor) return null;
    try { return await actor.getStudyStreak(); } catch { return null; }
  };

  const recordStudyActivity = async (): Promise<void> => {
    if (!actor) return;
    try { await actor.recordStudyActivity(); } catch { /* ignore */ }
  };

  const recordQuizResult = async (subject: string, score: bigint, totalQuestions: bigint): Promise<string> => {
    if (!actor) throw new Error('Not connected');
    return actor.recordQuizResult(subject, score, totalQuestions);
  };

  const getQuizResults = async () => {
    if (!actor) return [];
    try { return await actor.getQuizResults(); } catch { return []; }
  };

  // ---- Profile ----
  const getProfile = async () => {
    if (!actor) return null;
    try { return await actor.getProfile(); } catch { return null; }
  };

  const createProfile = async (displayName: string, mode: PersonalityMode, language: string): Promise<void> => {
    if (!actor) return;
    await actor.createProfile(displayName, mode, language);
  };

  const updateProfile = async (displayName: string, mode: PersonalityMode, language: string): Promise<void> => {
    if (!actor) return;
    await actor.updateProfile(displayName, mode, language);
  };

  return {
    isLoggedIn,
    createChatSession,
    getChatSessions,
    addMessage,
    getChatMessages,
    deleteChatSession,
    getNotes,
    createNote,
    updateNote,
    deleteNote,
    getDecks,
    createDeck,
    addCard,
    getDeckCards,
    updateCardReview,
    getGoals,
    createGoal,
    completeGoal,
    getProgressStats,
    updateProgressStat,
    getStudyStreak,
    recordStudyActivity,
    recordQuizResult,
    getQuizResults,
    getProfile,
    createProfile,
    updateProfile,
  };
}
