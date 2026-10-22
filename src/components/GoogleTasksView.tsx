import React, { useState, useEffect } from 'react';
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { GoogleTask, getGoogleTasks, createGoogleTask, updateGoogleTask, deleteGoogleTask } from '../lib/workspace.ts';

interface GoogleTasksViewProps {
  userLoggedIn: boolean;
  onLogin: () => void;
  onRequestConfirmation: (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    isDestructive?: boolean
  ) => void;
}

export const GoogleTasksView: React.FC<GoogleTasksViewProps> = ({
  userLoggedIn,
  onLogin,
  onRequestConfirmation,
}) => {
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!userLoggedIn) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const items = await getGoogleTasks();
      setTasks(items);
    } catch (err: any) {
      console.error('Failed to load Google Tasks:', err);
      setErrorMessage(err.message || 'Failed to load Google Tasks. Please re-authenticate.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userLoggedIn) {
      fetchTasks();
    }
  }, [userLoggedIn]);

  const handleToggleComplete = (task: GoogleTask) => {
    const isCompleted = task.status === 'completed';
    const newStatus = isCompleted ? 'needsAction' : 'completed';

    onRequestConfirmation(
      `${isCompleted ? 'Reopen' : 'Complete'} Google Task?`,
      `Are you sure you want to mark the Google Task "${task.title}" as ${
        isCompleted ? 'Incomplete' : 'Completed'
      }?`,
      async () => {
        try {
          await updateGoogleTask('@default', task.id, { status: newStatus });
          setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
          );
        } catch (err: any) {
          alert(`Error updating task: ${err.message}`);
        }
      }
    );
  };

  const handleDeleteTask = (task: GoogleTask) => {
    onRequestConfirmation(
      'Delete Google Task?',
      `Are you sure you want to permanently delete "${task.title}" from your Google Tasks? This action cannot be undone.`,
      async () => {
        try {
          await deleteGoogleTask('@default', task.id);
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
        } catch (err: any) {
          alert(`Error deleting task: ${err.message}`);
        }
      },
      true
    );
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    onRequestConfirmation(
      'Create New Google Task?',
      `Create new task "${newTaskTitle}" in your default Google Tasks list?`,
      async () => {
        try {
          const created = await createGoogleTask('@default', {
            title: newTaskTitle.trim(),
            notes: newTaskNotes.trim() || undefined,
          });
          setTasks((prev) => [created, ...prev]);
          setNewTaskTitle('');
          setNewTaskNotes('');
          setIsAddOpen(false);
        } catch (err: any) {
          alert(`Error creating task: ${err.message}`);
        }
      }
    );
  };

  if (!userLoggedIn) {
    return (
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-10 text-center max-w-md mx-auto space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto border border-zinc-200">
          <ListTodo className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900">Connect Google Tasks</h3>
          <p className="text-xs text-zinc-500 leading-relaxed mt-1.5">
            Sign in with your Google Account to sync QA defect remediations, testing checklists, and regression runs directly to Google Tasks.
          </p>
        </div>
        <button
          onClick={onLogin}
          className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
        >
          Sign In with Google
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-zinc-700" />
              <span>Google Tasks QA Workspace</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Synced
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your QA action items and defect fixes synchronized in real time with Google Tasks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTasks}
            disabled={isLoading}
            className="p-2 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-medium border border-zinc-200 transition-colors shadow-xs cursor-pointer"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add QA Task</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-4 flex items-center gap-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden divide-y divide-zinc-100 shadow-xs">
        {tasks.map((task) => {
          const isCompleted = task.status === 'completed';
          return (
            <div
              key={task.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-zinc-50/70 ${
                isCompleted ? 'bg-zinc-50/50 opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggleComplete(task)}
                  className="mt-0.5 text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>
                <div>
                  <h4
                    className={`text-xs font-semibold ${
                      isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-900'
                    }`}
                  >
                    {task.title}
                  </h4>
                  {task.notes && (
                    <p className="text-[11px] text-zinc-500 mt-1 whitespace-pre-line leading-relaxed">
                      {task.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDeleteTask(task)}
                  className="p-1 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && !isLoading && (
          <div className="py-16 text-center text-zinc-400 text-xs">
            No tasks found in your Google Tasks default list. Click "Add QA Task" or sync a bug to create one.
          </div>
        )}

        {isLoading && tasks.length === 0 && (
          <div className="py-16 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-700" />
            <span>Loading tasks from Google Tasks...</span>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-zinc-200/80 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Create Google Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Verify Stripe webhook signature validation"
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Notes / Context</label>
                <textarea
                  rows={3}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Additional reproduction details, assignee instructions..."
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl font-medium border border-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
