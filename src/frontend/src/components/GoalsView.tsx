import { useState, useEffect, useCallback } from 'react';
import { Target, Plus, Check, Trash2, Loader2, Calendar } from 'lucide-react';
import { useBackend } from '../hooks/useBackend';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import type { Goal } from '../backend.d';

export default function GoalsView() {
  const backend = useBackend();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDate, setNewDate] = useState('');

  const loadGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const raw = await backend.getGoals();
      setGoals(raw);
    } catch {
      const stored = localStorage.getItem('jarvis_goals');
      if (stored) setGoals(JSON.parse(stored) as Goal[]);
    } finally {
      setIsLoading(false);
    }
  }, [backend]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  const addGoal = async () => {
    if (!newTitle.trim()) return;
    setIsLoading(true);
    const targetDate = newDate ? BigInt(new Date(newDate).getTime()) : BigInt(Date.now() + 7 * 86400000);
    try {
      const id = await backend.createGoal(newTitle, newDesc, targetDate);
      const newGoal: Goal = {
        id,
        title: newTitle,
        description: newDesc,
        isCompleted: false,
        createdAt: BigInt(Date.now()),
        targetDate,
      };
      setGoals((prev) => {
        const updated = [...prev, newGoal];
        localStorage.setItem('jarvis_goals', JSON.stringify(updated));
        return updated;
      });
      toast.success('Goal added!');
    } catch {
      const newGoal: Goal = {
        id: `goal_${Date.now()}`,
        title: newTitle,
        description: newDesc,
        isCompleted: false,
        createdAt: BigInt(Date.now()),
        targetDate,
      };
      setGoals((prev) => {
        const updated = [...prev, newGoal];
        localStorage.setItem('jarvis_goals', JSON.stringify(updated));
        return updated;
      });
      toast.success('Goal added locally!');
    } finally {
      setNewTitle('');
      setNewDesc('');
      setNewDate('');
      setShowAdd(false);
      setIsLoading(false);
    }
  };

  const completeGoal = async (id: string) => {
    try {
      await backend.completeGoal(id);
      await backend.recordStudyActivity();
    } catch { /* ignore */ }
    setGoals((prev) => {
      const updated = prev.map((g) => g.id === id ? { ...g, isCompleted: true } : g);
      localStorage.setItem('jarvis_goals', JSON.stringify(updated));
      return updated;
    });
    toast.success('Goal completed! 🎉');
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      localStorage.setItem('jarvis_goals', JSON.stringify(updated));
      return updated;
    });
  };

  const completedCount = goals.filter((g) => g.isCompleted).length;
  const totalCount = goals.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-red-400" />
          <h2 className="text-white font-semibold text-lg">Daily Goals</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          aria-label="Add goal"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">Completion</span>
            <span className="text-white font-bold">{completionPercent}%</span>
          </div>
          <Progress value={completionPercent} className="h-2 bg-[#1e2d3d]" />
          <p className="text-gray-500 text-xs mt-2">{completedCount} of {totalCount} goals completed</p>
        </div>
      )}

      {/* Add Goal Form */}
      {showAdd && (
        <div className="bg-[#161b22] border border-[#1e2d3d] rounded-xl p-4 mb-4 space-y-3 animate-fade-in-up">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Goal title..."
            className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600"
          />
          <Textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="bg-[#0d1117] border-[#2d3f52] text-white placeholder:text-gray-600 resize-none text-sm"
          />
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-500" />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#2d3f52] text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => void addGoal()}
              disabled={isLoading || !newTitle.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
              Add Goal
            </Button>
            <Button
              type="button"
              onClick={() => setShowAdd(false)}
              variant="outline"
              className="border-[#2d3f52] text-gray-400"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading && goals.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-red-400" /></div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <Target size={40} className="text-gray-600" />
            <p className="text-gray-500">No goals yet</p>
            <Button type="button" onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus size={16} className="mr-2" />
              Add First Goal
            </Button>
          </div>
        ) : (
          <>
            {/* Pending Goals */}
            {pendingGoals.length > 0 && (
              <div className="space-y-2">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1">Pending</p>
                {pendingGoals.map((goal) => {
                  const targetDate = Number(goal.targetDate);
                  const isOverdue = targetDate < Date.now();
                  return (
                    <div key={goal.id} className="group bg-[#161b22] border border-[#1e2d3d] hover:border-[#2d3f52] rounded-xl p-4 transition-all">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => void completeGoal(goal.id)}
                          className="shrink-0 w-5 h-5 rounded-full border-2 border-gray-600 hover:border-green-400 transition-colors mt-0.5 flex items-center justify-center"
                          aria-label="Mark complete"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <Calendar size={10} className="text-gray-600" />
                            <span className={`text-xs ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                              {isOverdue ? 'Overdue · ' : ''}{new Date(targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteGoal(goal.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-600 transition-all"
                          aria-label="Delete goal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-1">Completed</p>
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="group bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 w-5 h-5 rounded-full bg-green-600/20 border-2 border-green-500 flex items-center justify-center">
                        <Check size={10} className="text-green-400" />
                      </div>
                      <span className="text-gray-400 text-sm line-through flex-1">{goal.title}</span>
                      <button
                        type="button"
                        onClick={() => deleteGoal(goal.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-600 transition-all"
                        aria-label="Delete goal"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
