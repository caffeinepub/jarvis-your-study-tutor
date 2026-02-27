import { useState } from 'react';
import { HelpCircle, Trophy, Loader2, ArrowLeft, Check, X, AlertTriangle } from 'lucide-react';
import { useGemini, type QuizQuestion } from '../hooks/useGemini';
import { useBackend } from '../hooks/useBackend';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';

type QuizStep = 'setup' | 'playing' | 'results';

interface QuizState {
  topic: string;
  difficulty: string;
  count: number;
  type: 'mcq' | 'short';
}

export default function QuizView() {
  const { generateQuiz } = useGemini();
  const backend = useBackend();
  const [step, setStep] = useState<QuizStep>('setup');
  const [quizState, setQuizState] = useState<QuizState>({
    topic: '',
    difficulty: 'Medium',
    count: 10,
    type: 'mcq',
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [answers, setAnswers] = useState<(number | string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const startQuiz = async () => {
    if (!quizState.topic.trim()) { setError('Please enter a topic'); return; }
    setError('');
    setIsLoading(true);
    try {
      const qs = await generateQuiz(quizState.topic, quizState.difficulty, quizState.count, quizState.type);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null) as null[]);
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setStep('playing');
    } catch {
      setError('AI is currently unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = () => {
    const answer = quizState.type === 'mcq' ? selectedAnswer : shortAnswer;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = answer;
      return next;
    });
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setShortAnswer('');
    } else {
      void finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const score = questions.reduce((acc, q, idx) => {
      const ans = answers[idx];
      if (quizState.type === 'mcq') return acc + (ans === q.correctIndex ? 1 : 0);
      return acc + (typeof ans === 'string' && ans.trim().length > 0 ? 0.5 : 0);
    }, 0);

    try {
      await backend.recordQuizResult(quizState.topic, BigInt(Math.round(score)), BigInt(questions.length));
      await backend.recordStudyActivity();
    } catch { /* ignore */ }

    setStep('results');
  };

  const getScore = () => {
    return questions.reduce((acc, q, idx) => {
      const ans = answers[idx];
      if (quizState.type === 'mcq') return acc + (ans === q.correctIndex ? 1 : 0);
      return acc + (typeof ans === 'string' && ans.trim().length > 0 ? 1 : 0);
    }, 0);
  };

  const scorePercent = questions.length > 0 ? Math.round((getScore() / questions.length) * 100) : 0;

  const weakTopics = scorePercent < 60 ? [quizState.topic] : [];

  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {step !== 'setup' && (
          <button
            type="button"
            onClick={() => setStep('setup')}
            className="p-1.5 rounded-lg hover:bg-[#1e2d3d] text-gray-400 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <HelpCircle size={20} className="text-orange-400" />
        <h2 className="text-white font-semibold text-lg">
          {step === 'setup' ? 'Quiz Builder' : step === 'playing' ? `Question ${currentIdx + 1}/${questions.length}` : 'Quiz Results'}
        </h2>
      </div>

      {/* Setup */}
      {step === 'setup' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4 space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1.5">Topic</p>
              <Input
                value={quizState.topic}
                onChange={(e) => setQuizState((prev) => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g. Newton's Laws of Motion"
                className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-400 text-sm mb-1.5">Difficulty</p>
                <Select
                  value={quizState.difficulty}
                  onValueChange={(v) => setQuizState((prev) => ({ ...prev, difficulty: v }))}
                >
                  <SelectTrigger className="bg-[#0d1117] border-[#2d3f52] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2d3d] border-[#2d3f52]">
                    {['Easy', 'Medium', 'Hard', 'Expert'].map((d) => (
                      <SelectItem key={d} value={d} className="text-white">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1.5">Questions</p>
                <Select
                  value={quizState.count.toString()}
                  onValueChange={(v) => setQuizState((prev) => ({ ...prev, count: parseInt(v) }))}
                >
                  <SelectTrigger className="bg-[#0d1117] border-[#2d3f52] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e2d3d] border-[#2d3f52]">
                    {[5, 10, 20].map((n) => (
                      <SelectItem key={n} value={n.toString()} className="text-white">{n} questions</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1.5">Type</p>
              <div className="flex gap-2">
                {(['mcq', 'short'] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setQuizState((prev) => ({ ...prev, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      quizState.type === t
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#0d1117] border border-[#2d3f52] text-gray-400 hover:border-[#3d5068]'
                    }`}
                  >
                    {t === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}
            <Button
              type="button"
              onClick={() => void startQuiz()}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Generating Quiz...
                </>
              ) : (
                'Start Quiz'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Playing */}
      {step === 'playing' && questions.length > 0 && (
        <div className="flex-1 flex flex-col gap-4">
          <Progress value={((currentIdx) / questions.length) * 100} className="h-1.5 bg-[#1e2d3d]" />

          <div className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-3">
              {quizState.difficulty} · {quizState.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
            </p>
            <p className="text-white font-medium text-base leading-relaxed">
              {questions[currentIdx].question}
            </p>
          </div>

          {quizState.type === 'mcq' ? (
            <div className="space-y-2">
              {questions[currentIdx].options.map((opt, optIdx) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setSelectedAnswer(optIdx)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedAnswer === optIdx
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-[#161b22] border-[#1e2d3d] text-gray-300 hover:border-[#2d3f52] hover:text-white'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    selectedAnswer === optIdx ? 'bg-blue-600 text-white' : 'bg-[#1e2d3d] text-gray-400'
                  }`}>
                    {OPTION_LETTERS[optIdx]}
                  </span>
                  <span className="text-sm">{opt}</span>
                </button>
              ))}
            </div>
          ) : (
            <Input
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="bg-[#161b22] border-[#2d3f52] text-white placeholder:text-gray-600"
            />
          )}

          <Button
            type="button"
            onClick={submitAnswer}
            disabled={quizState.type === 'mcq' ? selectedAnswer === null : shortAnswer.trim() === ''}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {currentIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        </div>
      )}

      {/* Results */}
      {step === 'results' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Score Card */}
          <div className={`rounded-xl p-5 text-center ${
            scorePercent >= 80 ? 'bg-green-600/20 border border-green-600/30' :
            scorePercent >= 60 ? 'bg-blue-600/20 border border-blue-600/30' :
            'bg-orange-600/20 border border-orange-600/30'
          }`}>
            <Trophy size={32} className={`mx-auto mb-2 ${
              scorePercent >= 80 ? 'text-green-400' : scorePercent >= 60 ? 'text-blue-400' : 'text-orange-400'
            }`} />
            <p className="text-4xl font-bold text-white mb-1">{scorePercent}%</p>
            <p className="text-gray-400 text-sm">{getScore()} / {questions.length} correct</p>
            <p className="text-gray-400 text-sm mt-1">{quizState.topic}</p>
          </div>

          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <div className="bg-orange-600/10 border border-orange-600/30 rounded-xl p-4">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <AlertTriangle size={16} />
                <span className="font-medium text-sm">Improvement Needed</span>
              </div>
              <p className="text-gray-400 text-sm">You scored below 60% on: {weakTopics.join(', ')}</p>
              <p className="text-gray-500 text-xs mt-1">Consider reviewing these topics with Notes or Flashcards.</p>
            </div>
          )}

          {/* Question breakdown */}
          <div className="space-y-3">
            <p className="text-gray-400 text-sm font-medium">Breakdown</p>
            {questions.map((q, qIdx) => {
              const userAns = answers[qIdx];
              const isCorrect = quizState.type === 'mcq' ? userAns === q.correctIndex : true;
              return (
                <div key={q.question.substring(0, 20)} className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${isCorrect ? 'bg-green-600/20' : 'bg-red-600/20'}`}>
                      {isCorrect ? <Check size={11} className="text-green-400" /> : <X size={11} className="text-red-400" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-xs leading-relaxed line-clamp-2">{q.question}</p>
                      {quizState.type === 'mcq' && !isCorrect && (
                        <p className="text-green-400 text-xs mt-1">
                          Correct: {q.options[q.correctIndex]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={() => { setStep('setup'); setQuestions([]); setAnswers([]); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            New Quiz
          </Button>
        </div>
      )}
    </div>
  );
}
