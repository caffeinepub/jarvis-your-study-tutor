import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Goal {
    id: string;
    title: string;
    isCompleted: boolean;
    createdAt: bigint;
    description: string;
    targetDate: bigint;
}
export interface ChatSessionDTO {
    id: string;
    title: string;
    messages: Array<Message>;
    createdAt: bigint;
}
export interface Flashcard {
    id: string;
    front: string;
    interval: bigint;
    back: string;
    difficulty: bigint;
    nextReview: bigint;
    easeFactor: number;
}
export interface ProgressStat {
    subject: string;
    lastUpdated: bigint;
    masteryPercent: number;
}
export interface Message {
    content: string;
    role: string;
    timestamp: bigint;
}
export interface QuizResult {
    id: string;
    subject: string;
    score: bigint;
    totalQuestions: bigint;
    timestamp: bigint;
}
export interface StudyStreak {
    lastStudyDate: bigint;
    currentStreak: bigint;
}
export interface Profile {
    preferredLanguage: string;
    displayName: string;
    createdAt: bigint;
    personalityMode: PersonalityMode;
}
export interface FlashcardDeckDTO {
    id: string;
    subject: string;
    cards: Array<Flashcard>;
    name: string;
}
export interface Note {
    id: string;
    title: string;
    topic: string;
    content: string;
    createdAt: bigint;
    updatedAt: bigint;
}
export enum PersonalityMode {
    pro_coder = "pro_coder",
    strict_teacher = "strict_teacher",
    friendly = "friendly"
}
export interface backendInterface {
    addCard(deckId: string, front: string, back: string): Promise<string>;
    addMessage(sessionId: string, role: string, content: string): Promise<void>;
    completeGoal(goalId: string): Promise<void>;
    createChatSession(title: string): Promise<string>;
    createDeck(name: string, subject: string): Promise<string>;
    createGoal(title: string, description: string, targetDate: bigint): Promise<string>;
    createNote(title: string, content: string, topic: string): Promise<string>;
    createProfile(displayName: string, mode: PersonalityMode, language: string): Promise<void>;
    deleteChatSession(sessionId: string): Promise<void>;
    deleteNote(noteId: string): Promise<void>;
    getChatMessages(sessionId: string): Promise<Array<Message>>;
    getChatSessions(): Promise<Array<ChatSessionDTO>>;
    getDeckCards(deckId: string): Promise<Array<Flashcard>>;
    getDecks(): Promise<Array<FlashcardDeckDTO>>;
    getGoals(): Promise<Array<Goal>>;
    getNote(noteId: string): Promise<Note>;
    getNotes(): Promise<Array<Note>>;
    getProfile(): Promise<Profile>;
    getProgressStats(): Promise<Array<ProgressStat>>;
    getQuizResults(): Promise<Array<QuizResult>>;
    getStudyStreak(): Promise<StudyStreak>;
    recordQuizResult(subject: string, score: bigint, totalQuestions: bigint): Promise<string>;
    recordStudyActivity(): Promise<void>;
    updateCardReview(deckId: string, cardId: string, interval: bigint, easeFactor: number): Promise<void>;
    updateNote(noteId: string, title: string, content: string, topic: string): Promise<void>;
    updateProfile(displayName: string, mode: PersonalityMode, language: string): Promise<void>;
    updateProgressStat(subject: string, masteryPercent: number): Promise<void>;
}
