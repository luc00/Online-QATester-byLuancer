import React, { useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Sparkles,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit3,
  Code,
  Tag,
  Check,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { TestCase, Priority, TestCaseStatus } from '../types/qa.ts';

interface TestCasesViewProps {
  testCases: TestCase[];
  onSaveTestCase: (tc: TestCase) => Promise<void>;
  onDeleteTestCase: (id: string) => Promise<void>;
  onExportToSheets: (cases: TestCase[]) => Promise<void>;
  onImportFromSheets: (urlOrId: string) => Promise<void>;
  isExporting: boolean;
  isImporting: boolean;
  selectedProjectId: string;
}

export const TestCasesView: React.FC<TestCasesViewProps> = ({
  testCases,
  onSaveTestCase,
  onDeleteTestCase,
  onExportToSheets,
  onImportFromSheets,
  isExporting,
  isImporting,
  selectedProjectId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suiteFilter, setSuiteFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiGenModalOpen, setIsAiGenModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSheetInput, setImportSheetInput] = useState('');
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<TestCase | null>(null);

  // AI Generator state
  const [featurePrompt, setFeaturePrompt] = useState('');
  const [targetSuite, setTargetSuite] = useState('Authentication');
  const [frameworkChoice, setFrameworkChoice] = useState<'manual' | 'playwright' | 'cypress' | 'gherkin'>('manual');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatedCases, setGeneratedCases] = useState<Partial<TestCase>[]>([]);

  // Form state for Manual Create/Edit
  const [editingCase, setEditingCase] = useState<Partial<TestCase>>({
    title: '',
    suite: 'Regression',
    type: 'Functional',
    priority: 'medium',
    status: 'active',
    preconditions: '',
    steps: '1. Navigate to target screen\n2. Perform user action\n3. Verify response',
    expectedResult: 'System updates state and returns success notification',
    automated: false,
    codeSnippet: '',
  });

  const suites = Array.from(new Set(testCases.map((tc) => tc.suite)));

  const filteredCases = testCases.filter((tc) => {
    const matchesSearch =
      tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.steps.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.suite.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSuite = suiteFilter === 'all' || tc.suite === suiteFilter;
    const matchesPriority = priorityFilter === 'all' || tc.priority === priorityFilter;
    return matchesSearch && matchesSuite && matchesPriority;
  });

  const handleGenerateAi = async () => {
    if (!featurePrompt.trim()) return;
    setIsGeneratingAi(true);
    try {
      const res = await fetch('/api/gemini/generate-test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureDescription: featurePrompt,
          suiteName: targetSuite,
          framework: frameworkChoice,
        }),
      });
      const data = await res.json();
      if (data.testCases && Array.isArray(data.testCases)) {
        setGeneratedCases(data.testCases);
      }
    } catch (err) {
      console.error('AI generation failed', err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveAiGenerated = async (c: Partial<TestCase>) => {
    const newCase: TestCase = {
      id: `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      projectId: selectedProjectId,
      title: c.title || 'Untitled Test Case',
      suite: c.suite || targetSuite || 'General',
      type: c.type || 'Functional',
      priority: (c.priority as Priority) || 'medium',
      status: 'active',
      preconditions: c.preconditions || 'None',
      steps: c.steps || '1. Verify feature',
      expectedResult: c.expectedResult || 'Passes verification',
      automated: !!c.automated,
      codeSnippet: c.codeSnippet || '',
      ownerId: 'current',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await onSaveTestCase(newCase);
    setGeneratedCases((prev) => prev.filter((item) => item.title !== c.title));
  };

  const handleSaveManualCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase.title) return;

    const tcToSave: TestCase = {
      id: editingCase.id || `tc-${Date.now()}`,
      projectId: selectedProjectId,
      title: editingCase.title,
      suite: editingCase.suite || 'General',
      type: editingCase.type || 'Functional',
      priority: (editingCase.priority as Priority) || 'medium',
      status: (editingCase.status as TestCaseStatus) || 'active',
      preconditions: editingCase.preconditions || '',
      steps: editingCase.steps || '',
      expectedResult: editingCase.expectedResult || '',
      automated: !!editingCase.automated,
      codeSnippet: editingCase.codeSnippet || '',
      ownerId: editingCase.ownerId || 'current',
      createdAt: editingCase.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveTestCase(tcToSave);
    setIsCreateModalOpen(false);
    setEditingCase({
      title: '',
      suite: 'Regression',
      type: 'Functional',
      priority: 'medium',
      status: 'active',
      preconditions: '',
      steps: '1. Navigate to target screen\n2. Perform user action\n3. Verify response',
      expectedResult: 'System updates state and returns success notification',
      automated: false,
      codeSnippet: '',
    });
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Top Header & Actions - White Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Test Case Repository</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Author, organize, export to Google Sheets, and auto-generate test suites using Gemini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsAiGenModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>AI Test Generator</span>
          </button>

          <button
            onClick={() => onExportToSheets(filteredCases)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-emerald-700 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Export cases to a new Google Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isExporting ? 'Exporting...' : 'Export to Sheets'}</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Sheets</span>
          </button>

          <button
            onClick={() => {
              setEditingCase({
                title: '',
                suite: 'Regression',
                type: 'Functional',
                priority: 'medium',
                status: 'active',
                preconditions: '',
                steps: '1. Step one\n2. Step two',
                expectedResult: 'Expected verifiable outcome',
                automated: false,
                codeSnippet: '',
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Test Case</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 p-3 rounded-2xl shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test cases by title, steps, or suite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={suiteFilter}
            onChange={(e) => setSuiteFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
          >
            <option value="all">All Suites</option>
            {suites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Test Cases Table - White Minimalist */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">ID & Title</th>
                <th className="py-3 px-4">Suite</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Automation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredCases.map((tc) => (
                <tr
                  key={tc.id}
                  className="hover:bg-zinc-50/80 transition-colors group cursor-pointer"
                  onClick={() => setSelectedCaseForDetail(tc)}
                >
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-mono text-[11px] text-zinc-500 font-semibold">{tc.id}</div>
                    <div className="font-medium text-zinc-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                      {tc.title}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 text-[11px] font-medium">
                      {tc.suite}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500">{tc.type}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tc.priority === 'critical'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : tc.priority === 'high'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : tc.priority === 'medium'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {tc.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {tc.automated ? (
                      <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                        <Code className="w-3 h-3 text-emerald-600" />
                        <span>Automated</span>
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-[11px]">Manual</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="text-[11px] font-medium text-zinc-500 capitalize">{tc.status}</span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingCase(tc);
                          setIsCreateModalOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTestCase(tc.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No test cases match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Modal / Drawer */}
      {selectedCaseForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-y-auto text-zinc-900">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-4">
              <div>
                <span className="font-mono text-xs text-zinc-500 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                  {selectedCaseForDetail.id}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 mt-2">{selectedCaseForDetail.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700">
                    {selectedCaseForDetail.suite}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    {selectedCaseForDetail.priority}
                  </span>
                  <span className="text-xs text-zinc-500">{selectedCaseForDetail.type}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCaseForDetail(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Preconditions
                </label>
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 text-zinc-800 whitespace-pre-line leading-relaxed">
                  {selectedCaseForDetail.preconditions || 'None specified.'}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Execution Steps
                </label>
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-800 whitespace-pre-line leading-relaxed">
                  {selectedCaseForDetail.steps}
                </div>
              </div>

              <div>
                <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Expected Result
                </label>
                <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200 text-emerald-900">
                  {selectedCaseForDetail.expectedResult}
                </div>
              </div>

              {selectedCaseForDetail.codeSnippet && (
                <div>
                  <label className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                    Automation Script (Playwright / Cypress)
                  </label>
                  <pre className="bg-zinc-900 text-zinc-100 p-3.5 rounded-xl border border-zinc-800 font-mono text-[11px] overflow-x-auto">
                    {selectedCaseForDetail.codeSnippet}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => setSelectedCaseForDetail(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add / Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto text-zinc-900">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                {editingCase.id ? 'Edit Test Case' : 'Create New Test Case'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManualCase} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingCase.title || ''}
                  onChange={(e) => setEditingCase({ ...editingCase, title: e.target.value })}
                  placeholder="e.g. Verify checkout payment with 3D Secure"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Suite</label>
                  <input
                    type="text"
                    required
                    value={editingCase.suite || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, suite: e.target.value })}
                    placeholder="e.g. Payment Gateway"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Priority</label>
                  <select
                    value={editingCase.priority || 'medium'}
                    onChange={(e) => setEditingCase({ ...editingCase, priority: e.target.value as any })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Preconditions</label>
                <textarea
                  rows={2}
                  value={editingCase.preconditions || ''}
                  onChange={(e) => setEditingCase({ ...editingCase, preconditions: e.target.value })}
                  placeholder="e.g. User logged in, test card balance > $50"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Steps (Numbered)</label>
                <textarea
                  rows={4}
                  required
                  value={editingCase.steps || ''}
                  onChange={(e) => setEditingCase({ ...editingCase, steps: e.target.value })}
                  placeholder="1. Navigate to /checkout&#10;2. Fill card details&#10;3. Click Submit"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 font-mono text-[11px] placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Expected Result</label>
                <textarea
                  rows={2}
                  required
                  value={editingCase.expectedResult || ''}
                  onChange={(e) => setEditingCase({ ...editingCase, expectedResult: e.target.value })}
                  placeholder="e.g. Order ID generated, HTTP 200 response"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tc-automated"
                  checked={!!editingCase.automated}
                  onChange={(e) => setEditingCase({ ...editingCase, automated: e.target.checked })}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-0"
                />
                <label htmlFor="tc-automated" className="text-zinc-700 font-medium cursor-pointer">
                  Automated test case
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium shadow-xs transition-colors cursor-pointer"
                >
                  Save Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Test Case Generator Modal */}
      {isAiGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-2xl bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-zinc-900">Gemini AI Test Suite Generator</h3>
              </div>
              <button
                onClick={() => setIsAiGenModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">
                  Describe Feature, User Story, or API Endpoint
                </label>
                <textarea
                  rows={3}
                  value={featurePrompt}
                  onChange={(e) => setFeaturePrompt(e.target.value)}
                  placeholder="e.g. User registration with email verification and password strength meter"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Suite Name</label>
                  <input
                    type="text"
                    value={targetSuite}
                    onChange={(e) => setTargetSuite(e.target.value)}
                    placeholder="e.g. Auth & Registration"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-medium mb-1">Format / Framework</label>
                  <select
                    value={frameworkChoice}
                    onChange={(e) => setFrameworkChoice(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-medium"
                  >
                    <option value="manual">Manual Step-by-Step</option>
                    <option value="playwright">Playwright TS Script</option>
                    <option value="cypress">Cypress E2E</option>
                    <option value="gherkin">BDD Gherkin (Given/When/Then)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateAi}
                disabled={isGeneratingAi || !featurePrompt.trim()}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGeneratingAi ? 'Synthesizing Test Cases...' : 'Generate Test Cases'}</span>
              </button>

              {/* Generated Results List */}
              {generatedCases.length > 0 && (
                <div className="mt-4 space-y-3 pt-3 border-t border-zinc-100">
                  <h4 className="text-xs font-semibold text-zinc-800">Generated Cases ({generatedCases.length})</h4>
                  {generatedCases.map((gc, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-semibold text-zinc-900">{gc.title}</span>
                        <button
                          onClick={() => handleSaveAiGenerated(gc)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add to Suite</span>
                        </button>
                      </div>
                      <p className="text-zinc-600 font-mono text-[11px] whitespace-pre-line">{gc.steps}</p>
                      <div className="text-[11px] text-emerald-800">
                        <span className="font-semibold">Expected: </span>
                        {gc.expectedResult}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import from Google Sheets Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-xl p-6 text-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Import Cases from Google Sheets</span>
            </h3>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Paste the Google Spreadsheet URL or ID. The first row should contain headers (e.g. Title, Suite, Steps, Expected).
            </p>

            <input
              type="text"
              value={importSheetInput}
              onChange={(e) => setImportSheetInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (importSheetInput.trim()) {
                    await onImportFromSheets(importSheetInput);
                    setIsImportModalOpen(false);
                    setImportSheetInput('');
                  }
                }}
                disabled={isImporting || !importSheetInput.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : 'Fetch & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
