import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Flame, Target, BookOpen, Layers, Loader2 } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import { Progress } from './ui/progress';
import type { ProgressStat, QuizResult, StudyStreak } from '../backend.d';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ProgressView() {
  const backend = useBackend();
  const [streak, setStreak] = useState<StudyStreak | null>(null);
  const [stats, setStats] = useState<ProgressStat[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, p, q] = await Promise.all([
        backend.getStudyStreak(),
        backend.getProgressStats(),
        backend.getQuizResults(),
      ]);
      setStreak(s);
      setStats(p);
      setQuizResults(q);
    } catch {
      // Use demo data
      setStreak({ currentStreak: BigInt(7), lastStudyDate: BigInt(Date.now()) });
      setStats([
        { subject: 'Mathematics', masteryPercent: 78, lastUpdated: BigInt(Date.now()) },
        { subject: 'Physics', masteryPercent: 62, lastUpdated: BigInt(Date.now()) },
        { subject: 'Chemistry', masteryPercent: 45, lastUpdated: BigInt(Date.now()) },
        { subject: 'Biology', masteryPercent: 88, lastUpdated: BigInt(Date.now()) },
        { subject: 'English', masteryPercent: 91, lastUpdated: BigInt(Date.now()) },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const streakDays = streak ? Number(streak.currentStreak) : 0;
  const last5Quizzes = quizResults.slice(-5);

  const getMasteryColor = (percent: number) => {
    if (percent >= 80) return 'text-green-400';
    if (percent >= 60) return 'text-blue-400';
    if (percent >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMasteryBar = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 60) return 'bg-blue-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4 overflow-y-auto space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 size={20} className="text-green-400" />
        <h2 className="text-white font-semibold text-lg">Progress Dashboard</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-green-400" /></div>
      ) : (
        <>
          {/* Streak Card */}
          <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/20 border border-orange-700/30 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Flame size={40} className="text-orange-400" />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{streakDays}</span>
                </div>
              </div>
              <div>
                <h3 className="text-white text-2xl font-bold">{streakDays} Day Streak</h3>
                <p className="text-orange-300 text-sm">Keep it up! You're on fire 🔥</p>
              </div>
            </div>

            {/* Last 7 days heatmap */}
            <div className="mt-4">
              <p className="text-orange-300/60 text-xs mb-2">Last 7 days</p>
              <div className="flex gap-1.5">
                {DAYS.map((day, i) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-full aspect-square rounded ${i < streakDays ? 'bg-orange-500' : 'bg-orange-900/30 border border-orange-800/30'}`} />
                    <span className="text-orange-300/40 text-[9px]">{day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Mastery */}
          {stats.length > 0 && (
            <div className="bg-[#161b22] border border-[#1e2d3d] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-blue-400" />
                <h3 className="text-white font-medium">Subject Mastery</h3>
              </div>
              <div className="space-y-3">
                {stats.map((stat) => (
                  <div key={stat.subject}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-gray-300 text-sm">{stat.subject}</span>
                      <span className={`text-sm font-semibold ${getMasteryColor(stat.masteryPercent)}`}>
                        {Math.round(stat.masteryPercent)}%
                      </span>
                    </div>
                    <div className="h-2 bg-[#1e2d3d] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getMasteryBar(stat.masteryPercent)} rounded-full transition-all duration-500`}
                        style={{ width: `${stat.masteryPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz Performance */}
          {last5Quizzes.length > 0 && (
            <div className="bg-[#161b22] border border-[#1e2d3d] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-purple-400" />
                <h3 className="text-white font-medium">Recent Quizzes</h3>
              </div>
              <div className="space-y-2">
                {last5Quizzes.map((result) => {
                  const score = Number(result.score);
                  const total = Number(result.totalQuestions);
                  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
                  return (
                    <div key={result.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-gray-300 text-xs truncate">{result.subject}</p>
                        <Progress value={pct} className="h-1.5 bg-[#1e2d3d] mt-1" />
                      </div>
                      <span className={`text-sm font-semibold shrink-0 ${getMasteryColor(pct)}`}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Layers size={20} className="text-blue-400" />, label: 'Quiz Results', value: quizResults.length.toString() },
              { icon: <Target size={20} className="text-orange-400" />, label: 'Study Streak', value: `${streakDays} days` },
              { icon: <BookOpen size={20} className="text-purple-400" />, label: 'Subjects', value: stats.length.toString() },
              { icon: <BarChart2 size={20} className="text-green-400" />, label: 'Avg Score', value: last5Quizzes.length > 0 ? `${Math.round(last5Quizzes.reduce((a, r) => a + (Number(r.score) / Number(r.totalQuestions)) * 100, 0) / last5Quizzes.length)}%` : 'N/A' },
            ].map((item) => (
              <div key={item.label} className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {item.icon}
                  <span className="text-gray-500 text-xs">{item.label}</span>
                </div>
                <p className="text-white text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
