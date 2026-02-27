import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Bool "mo:core/Bool";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";

actor {
  public type Message = {
    role : Text; // "user" or "assistant"
    content : Text;
    timestamp : Int;
  };

  public type ChatSession = {
    id : Text;
    title : Text;
    createdAt : Int;
    var messages : List.List<Message>;
  };

  public type ChatSessionDTO = {
    id : Text;
    title : Text;
    createdAt : Int;
    messages : [Message];
  };

  module ChatSessionDTO {
    public func fromChatSession(chatSession : ChatSession) : ChatSessionDTO {
      {
        id = chatSession.id;
        title = chatSession.title;
        createdAt = chatSession.createdAt;
        messages = chatSession.messages.toArray();
      };
    };

    public func compareByCreatedAtDesc(a : ChatSessionDTO, b : ChatSessionDTO) : Order.Order {
      Int.compare(b.createdAt, a.createdAt);
    };
  };

  public type Note = {
    id : Text;
    title : Text;
    content : Text;
    topic : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  public type Flashcard = {
    id : Text;
    front : Text;
    back : Text;
    difficulty : Int;
    nextReview : Int;
    interval : Int;
    easeFactor : Float;
  };

  public type FlashcardDeck = {
    id : Text;
    name : Text;
    subject : Text;
    var cards : List.List<Flashcard>;
  };

  public type FlashcardDeckDTO = {
    id : Text;
    name : Text;
    subject : Text;
    cards : [Flashcard];
  };

  module FlashcardDeckDTO {
    public func fromFlashcardDeck(deck : FlashcardDeck) : FlashcardDeckDTO {
      {
        id = deck.id;
        name = deck.name;
        subject = deck.subject;
        cards = deck.cards.toArray();
      };
    };
  };

  public type QuizResult = {
    id : Text;
    subject : Text;
    score : Int;
    totalQuestions : Int;
    timestamp : Int;
  };

  module QuizResult {
    public func compareByTimestampDesc(a : QuizResult, b : QuizResult) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };
  };

  public type Goal = {
    id : Text;
    title : Text;
    description : Text;
    targetDate : Int;
    isCompleted : Bool;
    createdAt : Int;
  };

  public type ProgressStat = {
    subject : Text;
    masteryPercent : Float;
    lastUpdated : Int;
  };

  public type PersonalityMode = {
    #strict_teacher;
    #friendly;
    #pro_coder;
  };

  public type Profile = {
    displayName : Text;
    personalityMode : PersonalityMode;
    preferredLanguage : Text;
    createdAt : Int;
  };

  module Profile {
    public func compare(profile1 : Profile, profile2 : Profile) : Order.Order {
      switch (Text.compare(profile1.displayName, profile2.displayName)) {
        case (#equal) { Text.compare(profile1.preferredLanguage, profile2.preferredLanguage) };
        case (order) { order };
      };
    };

    public func compareByLanguage(profile1 : Profile, profile2 : Profile) : Order.Order {
      Text.compare(profile1.preferredLanguage, profile2.preferredLanguage);
    };
  };

  public type StudyStreak = {
    currentStreak : Int;
    lastStudyDate : Int;
  };

  let profiles = Map.empty<Principal, Profile>();
  let chatSessions = Map.empty<Principal, Map.Map<Text, ChatSession>>();
  let notes = Map.empty<Principal, Map.Map<Text, Note>>();
  let flashcardDecks = Map.empty<Principal, Map.Map<Text, FlashcardDeck>>();
  let quizResults = Map.empty<Principal, Map.Map<Text, QuizResult>>();
  let goals = Map.empty<Principal, Map.Map<Text, Goal>>();
  let progressStats = Map.empty<Principal, Map.Map<Text, ProgressStat>>();
  let studyStreaks = Map.empty<Principal, StudyStreak>();

  // User Profile Management
  public shared ({ caller }) func createProfile(displayName : Text, mode : PersonalityMode, language : Text) : async () {
    if (profiles.containsKey(caller)) {
      Runtime.trap("Profile already exists, use update function instead");
    };

    let profile : Profile = {
      displayName;
      personalityMode = mode;
      preferredLanguage = language;
      createdAt = Time.now();
    };

    profiles.add(caller, profile);
  };

  public shared ({ caller }) func updateProfile(displayName : Text, mode : PersonalityMode, language : Text) : async () {
    switch (profiles.get(caller)) {
      case (?existingProfile) {
        let updatedProfile : Profile = {
          displayName;
          personalityMode = mode;
          preferredLanguage = language;
          createdAt = existingProfile.createdAt;
        };
        profiles.add(caller, updatedProfile);
      };
      case (null) {
        Runtime.trap("Profile does not exist, use create function instead");
      };
    };
  };

  public query ({ caller }) func getProfile() : async Profile {
    switch (profiles.get(caller)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("Profile does not exist") };
    };
  };

  // Chat History
  public shared ({ caller }) func createChatSession(title : Text) : async Text {
    let session = {
      id = Time.now().toText();
      title;
      createdAt = Time.now();
      var messages = List.empty<Message>();
    };

    let userSessions = switch (chatSessions.get(caller)) {
      case (?sessions) { sessions };
      case (null) { Map.empty<Text, ChatSession>() };
    };
    userSessions.add(session.id, session);
    chatSessions.add(caller, userSessions);

    session.id;
  };

  public shared ({ caller }) func addMessage(sessionId : Text, role : Text, content : Text) : async () {
    switch (chatSessions.get(caller)) {
      case (?userSessions) {
        switch (userSessions.get(sessionId)) {
          case (?session) {
            let message : Message = {
              role;
              content;
              timestamp = Time.now();
            };
            session.messages.add(message);
            userSessions.add(sessionId, session);
          };
          case (null) { Runtime.trap("Chat session not found") };
        };
      };
      case (null) { Runtime.trap("No chat sessions found for user") };
    };
  };

  public query ({ caller }) func getChatSessions() : async [ChatSessionDTO] {
    switch (chatSessions.get(caller)) {
      case (?userSessions) {
        userSessions.values().toArray().map(func(session) { ChatSessionDTO.fromChatSession(session) });
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getChatMessages(sessionId : Text) : async [Message] {
    switch (chatSessions.get(caller)) {
      case (?userSessions) {
        switch (userSessions.get(sessionId)) {
          case (?session) {
            session.messages.toArray();
          };
          case (null) { Runtime.trap("Chat session not found") };
        };
      };
      case (null) { Runtime.trap("No chat sessions found for user") };
    };
  };

  public shared ({ caller }) func deleteChatSession(sessionId : Text) : async () {
    switch (chatSessions.get(caller)) {
      case (?userSessions) {
        userSessions.remove(sessionId);
      };
      case (null) { () };
    };
  };

  // Notes Management
  public shared ({ caller }) func createNote(title : Text, content : Text, topic : Text) : async Text {
    let note = {
      id = Time.now().toText();
      title;
      content;
      topic;
      createdAt = Time.now();
      updatedAt = Time.now();
    };

    let userNotes = switch (notes.get(caller)) {
      case (?n) { n };
      case (null) { Map.empty<Text, Note>() };
    };
    userNotes.add(note.id, note);
    notes.add(caller, userNotes);

    note.id;
  };

  public shared ({ caller }) func updateNote(noteId : Text, title : Text, content : Text, topic : Text) : async () {
    switch (notes.get(caller)) {
      case (?userNotes) {
        switch (userNotes.get(noteId)) {
          case (?existingNote) {
            let updatedNote = {
              id = existingNote.id;
              title;
              content;
              topic;
              createdAt = existingNote.createdAt;
              updatedAt = Time.now();
            };
            userNotes.add(noteId, updatedNote);
          };
          case (null) { () };
        };
      };
      case (null) { () };
    };
  };

  public shared ({ caller }) func deleteNote(noteId : Text) : async () {
    switch (notes.get(caller)) {
      case (?userNotes) {
        userNotes.remove(noteId);
      };
      case (null) { () };
    };
  };

  public query ({ caller }) func getNotes() : async [Note] {
    switch (notes.get(caller)) {
      case (?userNotes) { userNotes.values().toArray() };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getNote(noteId : Text) : async Note {
    switch (notes.get(caller)) {
      case (?userNotes) {
        switch (userNotes.get(noteId)) {
          case (?note) { note };
          case (null) { Runtime.trap("Note not found") };
        };
      };
      case (null) { Runtime.trap("No notes found for user") };
    };
  };

  // Flashcards
  public shared ({ caller }) func createDeck(name : Text, subject : Text) : async Text {
    let deck = {
      id = Time.now().toText();
      name;
      subject;
      var cards = List.empty<Flashcard>();
    };

    let userDecks = switch (flashcardDecks.get(caller)) {
      case (?d) { d };
      case (null) { Map.empty<Text, FlashcardDeck>() };
    };
    userDecks.add(deck.id, deck);
    flashcardDecks.add(caller, userDecks);

    deck.id;
  };

  public shared ({ caller }) func addCard(deckId : Text, front : Text, back : Text) : async Text {
    switch (flashcardDecks.get(caller)) {
      case (?userDecks) {
        switch (userDecks.get(deckId)) {
          case (?deck) {
            let card = {
              id = Time.now().toText();
              front;
              back;
              difficulty = 1; // easiest
              nextReview = Time.now();
              interval = 0;
              easeFactor = 2.5; // default SM2
            };

            deck.cards.add(card);
            userDecks.add(deckId, deck);
            card.id;
          };
          case (null) { Runtime.trap("Deck not found") };
        };
      };
      case (null) { Runtime.trap("No flashcard decks found for user") };
    };
  };

  public shared ({ caller }) func updateCardReview(deckId : Text, cardId : Text, interval : Int, easeFactor : Float) : async () {
    switch (flashcardDecks.get(caller)) {
      case (?userDecks) {
        switch (userDecks.get(deckId)) {
          case (?deck) {
            let updatedCards = deck.cards.map<Flashcard, Flashcard>(
              func(card) {
                if (card.id == cardId) {
                  {
                    id = card.id;
                    front = card.front;
                    back = card.back;
                    nextReview = Time.now() + interval * 24 * 60 * 60 * 1000000000;
                    difficulty = card.difficulty;
                    interval;
                    easeFactor;
                  };
                } else {
                  card;
                };
              }
            );
            deck.cards.clear();
            deck.cards.addAll(updatedCards.values());
            userDecks.add(deckId, deck);
          };
          case (null) { Runtime.trap("Deck not found") };
        };
      };
      case (null) { Runtime.trap("No flashcard decks found for user") };
    };
  };

  public query ({ caller }) func getDecks() : async [FlashcardDeckDTO] {
    switch (flashcardDecks.get(caller)) {
      case (?userDecks) {
        userDecks.values().toArray().map(func(deck) { FlashcardDeckDTO.fromFlashcardDeck(deck) });
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getDeckCards(deckId : Text) : async [Flashcard] {
    switch (flashcardDecks.get(caller)) {
      case (?userDecks) {
        switch (userDecks.get(deckId)) {
          case (?deck) {
            deck.cards.toArray();
          };
          case (null) { Runtime.trap("Deck not found") };
        };
      };
      case (null) { Runtime.trap("No flashcard decks found for user") };
    };
  };

  // Quiz Results
  public shared ({ caller }) func recordQuizResult(subject : Text, score : Int, totalQuestions : Int) : async Text {
    let result = {
      id = Time.now().toText();
      subject;
      score;
      totalQuestions;
      timestamp = Time.now();
    };

    let userResults = switch (quizResults.get(caller)) {
      case (?r) { r };
      case (null) { Map.empty<Text, QuizResult>() };
    };
    userResults.add(result.id, result);
    quizResults.add(caller, userResults);

    result.id;
  };

  public query ({ caller }) func getQuizResults() : async [QuizResult] {
    switch (quizResults.get(caller)) {
      case (?userResults) {
        userResults.values().toArray().sort(QuizResult.compareByTimestampDesc);
      };
      case (null) { [] };
    };
  };

  // Study Streak
  public shared ({ caller }) func recordStudyActivity() : async () {
    let today = Time.now();
    switch (studyStreaks.get(caller)) {
      case (?existing) {
        let lastActivityDay = existing.lastStudyDate / (24 * 60 * 60 * 1000000000);
        let todayDay = today / (24 * 60 * 60 * 1000000000);

        let updatedStreak = {
          currentStreak = if (lastActivityDay == todayDay - 1) {
            existing.currentStreak + 1;
          } else {
            1;
          };
          lastStudyDate = today;
        };
        studyStreaks.add(caller, updatedStreak);
      };
      case (null) {
        studyStreaks.add(caller, { currentStreak = 1; lastStudyDate = today });
      };
    };
  };

  public query ({ caller }) func getStudyStreak() : async StudyStreak {
    switch (studyStreaks.get(caller)) {
      case (?streak) { streak };
      case (null) { { currentStreak = 0; lastStudyDate = 0 } };
    };
  };

  // Goals Management
  public shared ({ caller }) func createGoal(title : Text, description : Text, targetDate : Int) : async Text {
    let goal = {
      id = Time.now().toText();
      title;
      description;
      targetDate;
      isCompleted = false;
      createdAt = Time.now();
    };

    let userGoals = switch (goals.get(caller)) {
      case (?g) { g };
      case (null) { Map.empty<Text, Goal>() };
    };
    userGoals.add(goal.id, goal);
    goals.add(caller, userGoals);

    goal.id;
  };

  public shared ({ caller }) func completeGoal(goalId : Text) : async () {
    switch (goals.get(caller)) {
      case (?userGoals) {
        switch (userGoals.get(goalId)) {
          case (?existingGoal) {
            let updatedGoal = {
              id = existingGoal.id;
              title = existingGoal.title;
              description = existingGoal.description;
              targetDate = existingGoal.targetDate;
              isCompleted = true; // Mark as completed
              createdAt = existingGoal.createdAt;
            };
            userGoals.add(goalId, updatedGoal);
          };
          case (null) {
            Runtime.trap("Goal not found");
          };
        };
      };
      case (null) {
        Runtime.trap("No goals found for user");
      };
    };
  };

  public query ({ caller }) func getGoals() : async [Goal] {
    switch (goals.get(caller)) {
      case (?userGoals) {
        userGoals.values().toArray();
      };
      case (null) { [] };
    };
  };

  // Progress Stats
  public shared ({ caller }) func updateProgressStat(subject : Text, masteryPercent : Float) : async () {
    let stat = {
      subject;
      masteryPercent;
      lastUpdated = Time.now();
    };

    let userStats = switch (progressStats.get(caller)) {
      case (?s) { s };
      case (null) { Map.empty<Text, ProgressStat>() };
    };
    userStats.add(subject, stat);
    progressStats.add(caller, userStats);
  };

  public query ({ caller }) func getProgressStats() : async [ProgressStat] {
    switch (progressStats.get(caller)) {
      case (?userStats) { userStats.values().toArray() };
      case (null) { [] };
    };
  };
};
