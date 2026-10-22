import React, { useState } from 'react';
import {
  Bug as BugIcon,
  Plus,
  FileSpreadsheet,
  ListTodo,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertOctagon,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import { Bug, BugSeverity, BugPriority, BugStatus } from '../types/qa.ts';

interface BugsViewProps {
  bugs: Bug[];
  onSaveBug: (bug: Bug) => Promise<void>;
  onDeleteBug: (id: string) => Promise<void>;
  onExportToSheets: (bugs: Bug[]) => Promise<void>;
  onSyncBugToTasks: (bug: Bug) => Promise<void>;
  isExporting: boolean;
  selectedProjectId: string;
}

export const BugsView: React.FC<BugsViewProps> = ({
  bugs,
  onSaveBug,
  onDeleteBug,
  onExportToSheets,
  onSyncBugToTasks,
  isExporting,
  selectedProjectId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBugDetail, setSelectedBugDetail] = useState<Bug | null>(null);

  // Suggested Severity state
  const [isAnalyzingSeverity, setIsAnalyzingSeverity] = useState(false);
  const [suggestedRationale, setSuggestedRationale] = useState<string | null>(null);

  const [editingBug, setEditingBug] = useState<Partial<Bug>>({
    title: '',
    description: '',
    stepsToReproduce: '1. Navigate to target screen\n2. Trigger input\n3. Observe crash or error modal',
    severity: 'high',
    priority: 'P1',
    status: 'open',
    environment: 'Staging / Chrome Latest',
  });

  const filteredBugs = bugs.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.stepsToReproduce.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || b.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Call Gemini to analyze description and suggest severity & priority
  const handleSuggestSeverity = async () => {
    if (!editingBug.description && !editingBug.title) {
      alert('Please enter a bug title or description first so Gemini can analyze its impact.');
      return;
    }

    setIsAnalyzingSeverity(true);
    setSuggestedRationale(null);

    try {
      const res = await fetch('/api/gemini/suggest-severity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingBug.title,
          description: editingBug.description,
          stepsToReproduce: editingBug.stepsToReproduce,
          environment: editingBug.environment,
        }),
      });

      const data = await res.json();
      if (data.severity) {
        setEditingBug((prev) => ({
          ...prev,
          severity: data.severity,
          priority: data.priority || prev.priority,
        }));
        setSuggestedRationale(data.rationale || 'Severity auto-classified based on system impact analysis.');
      }
    } catch (err: any) {
      console.error('Failed to get suggested severity:', err);
      alert(`Could not classify severity: ${err.message}`);
    } finally {
      setIsAnalyzingSeverity(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBug.title) return;

    const bugToSave: Bug = {
      id: editingBug.id || `bug-${Date.now()}`,
      projectId: selectedProjectId,
      title: editingBug.title,
      description: editingBug.description || '',
      stepsToReproduce: editingBug.stepsToReproduce || '',
      severity: (editingBug.severity as BugSeverity) || 'high',
      priority: (editingBug.priority as BugPriority) || 'P1',
      status: (editingBug.status as BugStatus) || 'open',
      environment: editingBug.environment || 'QA',
      ownerId: editingBug.ownerId || 'current',
      createdAt: editingBug.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveBug(bugToSave);
    setIsModalOpen(false);
    setSuggestedRationale(null);
    setEditingBug({
      title: '',
      description: '',
      stepsToReproduce: '1. Step\n2. Step',
      severity: 'high',
      priority: 'P1',
      status: 'open',
      environment: 'Staging',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header - White & Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
              <BugIcon className="w-4 h-4 text-zinc-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Defects & Bug Tracking</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Log anomalies, get AI-suggested severity, export to Google Sheets, and sync remediations to Google Tasks.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onExportToSheets(filteredBugs)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isExporting ? 'Exporting...' : 'Export to Google Sheets'}</span>
          </button>

          <button
            onClick={() => {
              setSuggestedRationale(null);
              setEditingBug({
                title: '',
                description: '',
                stepsToReproduce: '1. Navigate to target URL\n2. Perform action\n3. Observe bug',
                severity: 'high',
                priority: 'P1',
                status: 'open',
                environment: 'Staging / Chrome',
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Defect</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 p-3 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search defects by title, steps, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Bugs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBugs.map((bug) => (
          <div
            key={bug.id}
            onClick={() => setSelectedBugDetail(bug)}
            className="bg-white border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all flex flex-col justify-between cursor-pointer group shadow-2xs hover:shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded">
                    {bug.id}
                  </span>
                  <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-600">
                    {bug.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bug.severity === 'critical'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : bug.severity === 'high'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {bug.severity}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                      bug.status === 'open'
                        ? 'bg-rose-50 text-rose-600'
                        : bug.status === 'in_progress'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {bug.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-zinc-900 mt-2.5 group-hover:text-indigo-600 transition-colors">
                {bug.title}
              </h4>
              <p className="text-xs text-zinc-600 mt-1 line-clamp-2 leading-relaxed">{bug.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
              <span>Env: {bug.environment || 'QA'}</span>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onSyncBugToTasks(bug)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-[11px] font-medium border border-zinc-200 transition-colors cursor-pointer"
                  title="Create remediation item in Google Tasks"
                >
                  <ListTodo className="w-3 h-3 text-zinc-600" />
                  <span>Sync Task</span>
                </button>
                <button
                  onClick={() => {
                    setEditingBug(bug);
                    setSuggestedRationale(null);
                    setIsModalOpen(true);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteBug(bug.id)}
                  className="p-1 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredBugs.length === 0 && (
          <div className="col-span-full py-16 text-center text-zinc-400 bg-white border border-zinc-200 rounded-2xl text-xs">
            No defects found matching your criteria.
          </div>
        )}
      </div>

      {/* Bug Detail Drawer / Modal */}
      {selectedBugDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-y-auto text-zinc-900">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                  {selectedBugDetail.id}
                </span>
                <h3 className="text-base font-bold text-zinc-900 mt-2">{selectedBugDetail.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                    {selectedBugDetail.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-700">
                    {selectedBugDetail.priority}
                  </span>
                  <span className="text-xs text-zinc-500">Status: {selectedBugDetail.status}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedBugDetail(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Description & Impact
                </label>
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-zinc-800 whitespace-pre-line leading-relaxed">
                  {selectedBugDetail.description}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Steps to Reproduce
                </label>
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-800 whitespace-pre-line leading-relaxed">
                  {selectedBugDetail.stepsToReproduce}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Environment
                </label>
                <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-zinc-700">
                  {selectedBugDetail.environment || 'QA / Staging'}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <button
                onClick={() => {
                  onSyncBugToTasks(selectedBugDetail);
                  setSelectedBugDetail(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Create Google Task for Remediation</span>
              </button>

              <button
                onClick={() => setSelectedBugDetail(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Bug Modal with SUGGESTED SEVERITY FEATURE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-lg bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto text-zinc-900">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingBug.id ? 'Edit Defect' : 'Log New Defect'}
                </h3>
                <p className="text-[11px] text-zinc-500">Classify issue details with AI-assisted severity</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Bug Title</label>
                <input
                  type="text"
                  required
                  value={editingBug.title || ''}
                  onChange={(e) => setEditingBug({ ...editingBug, title: e.target.value })}
                  placeholder="e.g. Unhandled 500 error when applying expired coupon"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Description & Impact</label>
                <textarea
                  rows={2}
                  required
                  value={editingBug.description || ''}
                  onChange={(e) => setEditingBug({ ...editingBug, description: e.target.value })}
                  placeholder="Provide bug context, observed failure symptoms, and user impact..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Steps to Reproduce</label>
                <textarea
                  rows={3}
                  required
                  value={editingBug.stepsToReproduce || ''}
                  onChange={(e) => setEditingBug({ ...editingBug, stepsToReproduce: e.target.value })}
                  placeholder="1. Step one&#10;2. Step two"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-mono text-[11px] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* AI SUGGESTED SEVERITY TRIGGER & CLASSIFICATION */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-800 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Severity & Priority Classification</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleSuggestSeverity}
                    disabled={isAnalyzingSeverity}
                    className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-lg text-[11px] font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isAnalyzingSeverity ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
                        <span>Classifying...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>AI Suggest Severity</span>
                      </>
                    )}
                  </button>
                </div>

                {suggestedRationale && (
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[11px] text-indigo-900 leading-relaxed">
                    <strong className="font-semibold">AI Rationale: </strong>
                    {suggestedRationale}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-zinc-600 font-medium mb-1 text-[11px]">Severity</label>
                    <select
                      value={editingBug.severity || 'high'}
                      onChange={(e) => setEditingBug({ ...editingBug, severity: e.target.value as any })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-medium mb-1 text-[11px]">Priority</label>
                    <select
                      value={editingBug.priority || 'P1'}
                      onChange={(e) => setEditingBug({ ...editingBug, priority: e.target.value as any })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
                    >
                      <option value="P0">P0 - Blocker</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Medium</option>
                      <option value="P3">P3 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-600 font-medium mb-1 text-[11px]">Status</label>
                    <select
                      value={editingBug.status || 'open'}
                      onChange={(e) => setEditingBug({ ...editingBug, status: e.target.value as any })}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1.5 text-zinc-900 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Environment</label>
                <input
                  type="text"
                  value={editingBug.environment || ''}
                  onChange={(e) => setEditingBug({ ...editingBug, environment: e.target.value })}
                  placeholder="e.g. Staging / macOS / Chrome 122"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Save Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
