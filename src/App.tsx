import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  initAuth,
  googleSignIn,
  logout,
  testConnection,
  getAccessToken,
} from './lib/firebase.ts';
import {
  getProjects,
  saveProject,
  getTestCases,
  saveTestCase,
  deleteTestCase as deleteTestCaseFromDb,
  getTestRuns,
  saveTestRun,
  getBugs,
  saveBug,
  deleteBug as deleteBugFromDb,
  getChatMessages,
  saveChatMessage,
} from './lib/firestoreService.ts';
import {
  exportTestCasesToSheets,
  exportBugsToSheets,
  importTestCasesFromSheets,
  createGoogleTask,
} from './lib/workspace.ts';
import {
  initialProjects,
  initialTestCases,
  initialTestRuns,
  initialBugs,
} from './lib/mockData.ts';
import { TestCase, TestRun, Bug, ChatMessage, Project } from './types/qa.ts';
import { exportTestCasesToCsv, exportBugsToCsv } from './lib/exportUtils.ts';

import { Navbar } from './components/Navbar.tsx';
import { ConfirmationModal } from './components/ConfirmationModal.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { TestCasesView } from './components/TestCasesView.tsx';
import { BugsView } from './components/BugsView.tsx';
import { VisualInspectorView } from './components/VisualInspectorView.tsx';
import { DeepThinkingView } from './components/DeepThinkingView.tsx';
import { CopilotChatView } from './components/CopilotChatView.tsx';
import { GoogleTasksView } from './components/GoogleTasksView.tsx';
import { TestRunModal } from './components/TestRunModal.tsx';
import { WebsiteAuditorView } from './components/WebsiteAuditorView.tsx';
import { ExternalLink, CheckCircle2, AlertCircle, X, Wrench, Sparkles, ArrowRight } from 'lucide-react';

const STORAGE_KEYS = {
  PROJECTS: 'qa_local_projects_v1',
  TEST_CASES: 'qa_local_test_cases_v1',
  TEST_RUNS: 'qa_local_test_runs_v1',
  BUGS: 'qa_local_bugs_v1',
};

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasWorkspaceAuth, setHasWorkspaceAuth] = useState(false);

  // QA Core Entities - Initialized with LocalStorage fallback to enable full functionality for all clients
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialProjects;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => projects[0]?.id || initialProjects[0]?.id || ''
  );

  const [testCases, setTestCases] = useState<TestCase[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_CASES);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialTestCases;
  });

  const [testRuns, setTestRuns] = useState<TestRun[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TEST_RUNS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialTestRuns;
  });

  const [bugs, setBugs] = useState<Bug[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BUGS);
      if (stored) return JSON.parse(stored);
    } catch {}
    return initialBugs;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Modal / Execution States
  const [activeExecutingRun, setActiveExecutingRun] = useState<TestRun | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Success / Notice Notification Banner
  const [notification, setNotification] = useState<{
    message: string;
    linkUrl?: string;
    linkLabel?: string;
    type?: 'success' | 'error';
  } | null>(null);

  // Confirmation Modal state for Workspace mutations
  const [confirmationConfig, setConfirmationConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isDestructive: false,
  });

  // 1. Initial Connection Test & Auth listener
  useEffect(() => {
    testConnection();

    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setHasWorkspaceAuth(!!token);
        if (currentUser) {
          loadUserData(currentUser.uid);
        }
      },
      () => {
        setUser(null);
        setHasWorkspaceAuth(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Load Firestore Data for logged-in user
  const loadUserData = async (uid: string) => {
    try {
      const userProjects = await getProjects(uid);
      if (userProjects && userProjects.length > 0) {
        setProjects(userProjects);
        setSelectedProjectId(userProjects[0].id);

        const [tcs, trs, bgs, msgs] = await Promise.all([
          getTestCases(uid),
          getTestRuns(uid),
          getBugs(uid),
          getChatMessages(uid),
        ]);

        if (tcs) setTestCases(tcs);
        if (trs) setTestRuns(trs);
        if (bgs) setBugs(bgs);
        if (msgs) setChatMessages(msgs);
      } else {
        // First login: sync initial demo data to Firestore for this user
        const seededProjects = initialProjects.map((p) => ({ ...p, ownerId: uid }));
        const seededCases = initialTestCases.map((c) => ({ ...c, ownerId: uid }));
        const seededRuns = initialTestRuns.map((r) => ({ ...r, ownerId: uid }));
        const seededBugs = initialBugs.map((b) => ({ ...b, ownerId: uid }));

        setProjects(seededProjects);
        setTestCases(seededCases);
        setTestRuns(seededRuns);
        setBugs(seededBugs);

        // Save in background
        seededProjects.forEach((p) => saveProject(p));
        seededCases.forEach((c) => saveTestCase(c));
        seededRuns.forEach((r) => saveTestRun(r));
        seededBugs.forEach((b) => saveBug(b));
      }
    } catch (err) {
      console.warn('Error loading Firestore data, continuing with local state:', err);
    }
  };

  // Google Sign In handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setHasWorkspaceAuth(!!result.accessToken);
        await loadUserData(result.user.uid);
        setNotification({
          message: 'Signed in with Google successfully. Google Sheets and Tasks are connected.',
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('Login failed', err);
      setNotification({
        message: `Sign in failed: ${err.message || 'Please verify popup permissions.'}`,
        type: 'error',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setHasWorkspaceAuth(false);
    setNotification({
      message: 'Signed out of Google session.',
    });
  };

  // Save / Update Test Case
  const handleSaveTestCase = async (tc: TestCase) => {
    const updated = testCases.some((c) => c.id === tc.id)
      ? testCases.map((c) => (c.id === tc.id ? tc : c))
      : [tc, ...testCases];

    setTestCases(updated);

    if (user) {
      try {
        await saveTestCase({ ...tc, ownerId: user.uid });
      } catch (e) {
        console.warn('Firestore save failed:', e);
      }
    }
  };

  const handleDeleteTestCase = async (id: string) => {
    setConfirmationConfig({
      isOpen: true,
      title: 'Delete Test Case?',
      message: 'Are you sure you want to delete this test case? This will remove it from test suites.',
      isDestructive: true,
      onConfirm: async () => {
        setTestCases((prev) => prev.filter((c) => c.id !== id));
        if (user) {
          try {
            await deleteTestCaseFromDb(id);
          } catch (e) {
            console.warn(e);
          }
        }
      },
    });
  };

  // Save / Update Bug
  const handleSaveBug = async (bug: Bug) => {
    const updated = bugs.some((b) => b.id === bug.id)
      ? bugs.map((b) => (b.id === bug.id ? bug : b))
      : [bug, ...bugs];

    setBugs(updated);

    if (user) {
      try {
        await saveBug({ ...bug, ownerId: user.uid });
      } catch (e) {
        console.warn('Firestore save failed:', e);
      }
    }
  };

  const handleDeleteBug = async (id: string) => {
    setConfirmationConfig({
      isOpen: true,
      title: 'Delete Defect?',
      message: 'Are you sure you want to remove this defect record?',
      isDestructive: true,
      onConfirm: async () => {
        setBugs((prev) => prev.filter((b) => b.id !== id));
        if (user) {
          try {
            await deleteBugFromDb(id);
          } catch (e) {
            console.warn(e);
          }
        }
      },
    });
  };

  // Save Test Run
  const handleUpdateTestRun = async (run: TestRun) => {
    setTestRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
    if (user) {
      try {
        await saveTestRun({ ...run, ownerId: user.uid });
      } catch (e) {
        console.warn(e);
      }
    }
  };

  // 1b. Automatically save state to LocalStorage for all clients without requiring an account
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
      localStorage.setItem(STORAGE_KEYS.TEST_CASES, JSON.stringify(testCases));
      localStorage.setItem(STORAGE_KEYS.TEST_RUNS, JSON.stringify(testRuns));
      localStorage.setItem(STORAGE_KEYS.BUGS, JSON.stringify(bugs));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [projects, testCases, testRuns, bugs]);

  // Workspace: Export Test Cases to Google Sheets or direct CSV for all clients
  const handleExportTestCasesToSheets = async (casesToExport = testCases) => {
    if (!user) {
      exportTestCasesToCsv(casesToExport);
      setNotification({
        message: `File CSV scaricato con successo (${casesToExport.length} casi di test)! Puoi anche accedere con Google per creare un foglio Google Fogli live.`,
        type: 'success',
      });
      return;
    }

    setConfirmationConfig({
      isOpen: true,
      title: 'Export Test Cases to Google Sheets?',
      message: `Create a new Google Spreadsheet and export ${casesToExport.length} test cases with permissions from your Google Account?`,
      isDestructive: false,
      onConfirm: async () => {
        setIsExporting(true);
        try {
          const currentProj = projects.find((p) => p.id === selectedProjectId);
          const result = await exportTestCasesToSheets(
            currentProj?.name || 'QA Test Suite',
            casesToExport
          );
          setNotification({
            message: `Successfully exported ${casesToExport.length} test cases to Google Sheets!`,
            linkUrl: result.spreadsheetUrl,
            linkLabel: 'Open Google Sheet',
            type: 'success',
          });
        } catch (err: any) {
          setNotification({
            message: `Export failed: ${err.message}`,
            type: 'error',
          });
        } finally {
          setIsExporting(false);
        }
      },
    });
  };

  // Workspace: Export Defects to Google Sheets or direct CSV for all clients
  const handleExportBugsToSheets = async (bugsToExport = bugs) => {
    if (!user) {
      exportBugsToCsv(bugsToExport);
      setNotification({
        message: `File CSV scaricato con successo (${bugsToExport.length} difetti)! Puoi anche accedere con Google per creare un foglio Google Fogli live.`,
        type: 'success',
      });
      return;
    }

    setConfirmationConfig({
      isOpen: true,
      title: 'Export Defects to Google Sheets?',
      message: `Create a new Google Spreadsheet and export ${bugsToExport.length} defect reports with permissions from your Google Account?`,
      isDestructive: false,
      onConfirm: async () => {
        setIsExporting(true);
        try {
          const currentProj = projects.find((p) => p.id === selectedProjectId);
          const result = await exportBugsToSheets(
            currentProj?.name || 'QA Project',
            bugsToExport
          );
          setNotification({
            message: `Successfully exported ${bugsToExport.length} defect reports to Google Sheets!`,
            linkUrl: result.spreadsheetUrl,
            linkLabel: 'Open Google Sheet',
            type: 'success',
          });
        } catch (err: any) {
          setNotification({
            message: `Export failed: ${err.message}`,
            type: 'error',
          });
        } finally {
          setIsExporting(false);
        }
      },
    });
  };

  // Workspace: Import from Google Sheets
  const handleImportFromSheets = async (urlOrId: string) => {
    if (!user) {
      handleLogin();
      return;
    }

    setIsImporting(true);
    try {
      const importedCases = await importTestCasesFromSheets(urlOrId);
      if (importedCases.length === 0) {
        setNotification({
          message: 'No test cases could be parsed from the spreadsheet.',
          type: 'error',
        });
        return;
      }

      const formatted: TestCase[] = importedCases.map((ic, i) => ({
        id: `tc-imported-${Date.now()}-${i}`,
        projectId: selectedProjectId,
        title: ic.title || 'Imported Case',
        suite: ic.suite || 'Imported Suite',
        type: ic.type || 'Functional',
        priority: ic.priority || 'medium',
        status: 'active',
        preconditions: ic.preconditions || 'None',
        steps: ic.steps || 'Execute steps',
        expectedResult: ic.expectedResult || 'Passes',
        automated: !!ic.automated,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setTestCases((prev) => [...formatted, ...prev]);
      formatted.forEach((tc) => saveTestCase(tc));

      setNotification({
        message: `Imported ${formatted.length} test cases from Google Sheets!`,
        type: 'success',
      });
    } catch (err: any) {
      setNotification({
        message: `Import failed: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Workspace: Sync Bug to Google Tasks
  const handleSyncBugToTasks = async (bug: Bug) => {
    if (!user) {
      setConfirmationConfig({
        isOpen: true,
        title: 'Sincronizzazione Google Tasks',
        message: `Per sincronizzare il task "[${bug.priority}] Fix ${bug.title}" su Google Tasks è necessario accedere con il tuo account Google. Desideri accedere ora?`,
        isDestructive: false,
        onConfirm: async () => {
          handleLogin();
        },
      });
      return;
    }

    setConfirmationConfig({
      isOpen: true,
      title: 'Create Remediation Item in Google Tasks?',
      message: `Create task "[${bug.priority}] Fix ${bug.title}" in your default Google Tasks list with permission?`,
      isDestructive: false,
      onConfirm: async () => {
        try {
          const task = await createGoogleTask('@default', {
            title: `[${bug.priority}] Fix: ${bug.title}`,
            notes: `Severity: ${bug.severity.toUpperCase()}\nEnvironment: ${bug.environment || 'QA'}\n\nSteps:\n${
              bug.stepsToReproduce
            }\n\nDescription:\n${bug.description}`,
          });

          // Mark bug with task id
          handleSaveBug({ ...bug, linkedTaskId: task.id });

          setNotification({
            message: `Created task "${task.title}" in Google Tasks!`,
            type: 'success',
          });
        } catch (err: any) {
          setNotification({
            message: `Tasks sync failed: ${err.message}`,
            type: 'error',
          });
        }
      },
    });
  };

  // Chat message persistence
  const handleSendMessage = async (msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
    if (user) {
      try {
        await saveChatMessage({ ...msg, ownerId: user.uid });
      } catch (e) {
        console.warn('Chat message save failed:', e);
      }
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0] || null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200 selection:text-zinc-900 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        testCaseCount={testCases.length}
        bugCount={bugs.filter((b) => b.status === 'open').length}
        isLoggingIn={isLoggingIn}
        hasWorkspaceAuth={hasWorkspaceAuth}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mt-4">
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 shadow-sm ${
              notification.type === 'error'
                ? 'bg-white border-rose-200 text-rose-800'
                : 'bg-white border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="text-xs font-medium">{notification.message}</span>
              {notification.linkUrl && (
                <a
                  href={notification.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-zinc-800 transition-colors ml-2"
                >
                  <span>{notification.linkLabel || 'Open Link'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <button
              onClick={() => setNotification(null)}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Prominent Help / Resolution Hero Card */}
        <section aria-label="Supporto e Risoluzione Problemi" className="mb-6 bg-white border-2 border-zinc-200 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden transition-all hover:border-zinc-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Assistenza Diretta & Risoluzione Rapida</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <span>Stai riscontrando problemi nel sito?</span>
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed font-normal">
                Passa da me: <strong className="font-semibold text-zinc-900">te lo risolvo subito!</strong> Se riscontri qualunque malfunzionamento, bug o hai bisogno di supporto tecnico, clicca sul pulsante per visitare il mio portale e ottenere assistenza immediata.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <a
                href="https://luancerco.it/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3.5 px-7 py-4 bg-zinc-900 hover:bg-black text-white text-base font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group border border-zinc-800"
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform bg-[#e0f1e6]">
                  <img
                    src="/assets/aistudio/logo_LUANCER_square.png"
                    alt="Luancer and Co. Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold leading-tight">
                    Luancer & Co. • Assistenza Diretta
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                    Passa da me su luancerco.it ⚡
                  </span>
                </div>
                <ExternalLink className="w-5 h-5 ml-1 text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </a>
            </div>
          </div>
        </section>

        {activeTab === 'dashboard' && (
          <DashboardView
            currentProject={currentProject}
            testCases={testCases}
            testRuns={testRuns}
            bugs={bugs}
            onOpenTestRun={(run) => setActiveExecutingRun(run)}
            onNavigateTab={setActiveTab}
            onExportSheets={() => handleExportTestCasesToSheets()}
            onSyncTasks={() => setActiveTab('tasks')}
            isExporting={isExporting}
          />
        )}

        {activeTab === 'audit' && (
          <WebsiteAuditorView
            onFileBug={(partialBug) => {
              const newBug: Bug = {
                id: `bug-audit-${Date.now()}`,
                projectId: selectedProjectId,
                title: partialBug.title || 'Audit Defect Detected',
                description: partialBug.description || '',
                stepsToReproduce: partialBug.stepsToReproduce || 'Esegui audit del sito per riprodurre.',
                severity: partialBug.severity || 'high',
                priority: partialBug.priority || 'P1',
                status: 'open',
                environment: partialBug.environment || 'Website QA Audit',
                ownerId: user?.uid || 'current',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              handleSaveBug(newBug);
              setNotification({
                message: `Registrato nuovo difetto: "${newBug.title}" nel tracker!`,
                type: 'success',
              });
            }}
            onCreateTestCase={(partialCase) => {
              const newCase: TestCase = {
                id: `tc-audit-${Date.now()}`,
                projectId: selectedProjectId,
                title: partialCase.title || 'Nuovo Test Case da Audit',
                suite: partialCase.suite || 'Audit QA',
                type: partialCase.type || 'Functional',
                priority: partialCase.priority || 'high',
                status: 'active',
                preconditions: partialCase.preconditions || 'Requisiti di conformità sito web',
                steps: partialCase.steps || '1. Verifica elemento\n2. Controlla assenza anomalie',
                expectedResult: partialCase.expectedResult || 'Comportamento conforme senza bug',
                automated: false,
                ownerId: user?.uid || 'current',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              handleSaveTestCase(newCase);
              setNotification({
                message: `Creato nuovo Test Case: "${newCase.title}"!`,
                type: 'success',
              });
            }}
            onSyncTask={async (title, notes) => {
              if (!hasWorkspaceAuth) {
                setNotification({
                  message: 'Accedi con Google per sincronizzare i task su Google Tasks.',
                  type: 'error',
                });
                return;
              }
              try {
                await createGoogleTask('@default', { title, notes });
                setNotification({
                  message: `Task "${title}" sincronizzato su Google Tasks!`,
                  type: 'success',
                });
              } catch (e: any) {
                setNotification({
                  message: `Errore sincronizzazione task: ${e.message}`,
                  type: 'error',
                });
              }
            }}
            selectedProjectId={selectedProjectId}
          />
        )}

        {activeTab === 'testcases' && (
          <TestCasesView
            testCases={testCases}
            onSaveTestCase={handleSaveTestCase}
            onDeleteTestCase={handleDeleteTestCase}
            onExportToSheets={handleExportTestCasesToSheets}
            onImportFromSheets={handleImportFromSheets}
            isExporting={isExporting}
            isImporting={isImporting}
            selectedProjectId={selectedProjectId}
          />
        )}

        {activeTab === 'bugs' && (
          <BugsView
            bugs={bugs}
            onSaveBug={handleSaveBug}
            onDeleteBug={handleDeleteBug}
            onExportToSheets={handleExportBugsToSheets}
            onSyncBugToTasks={handleSyncBugToTasks}
            isExporting={isExporting}
            selectedProjectId={selectedProjectId}
          />
        )}

        {activeTab === 'inspector' && (
          <VisualInspectorView
            onFileBugFromAnalysis={(partialBug) => {
              const newBug: Bug = {
                id: `bug-ai-${Date.now()}`,
                projectId: selectedProjectId,
                title: partialBug.title || 'Visual Defect Discovered',
                description: partialBug.description || '',
                stepsToReproduce: partialBug.stepsToReproduce || '1. Observe attached screenshot/video',
                severity: partialBug.severity || 'high',
                priority: partialBug.priority || 'P1',
                status: 'open',
                environment: partialBug.environment || 'Visual Inspector',
                ownerId: user?.uid || 'current',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              handleSaveBug(newBug);
              setActiveTab('bugs');
              setNotification({
                message: `Filed new defect: "${newBug.title}"!`,
                type: 'success',
              });
            }}
          />
        )}

        {activeTab === 'thinking' && <DeepThinkingView />}

        {activeTab === 'copilot' && (
          <CopilotChatView
            chatMessages={chatMessages}
            onSendMessage={handleSendMessage}
            onClearHistory={() => setChatMessages([])}
            userId={user?.uid || 'guest'}
          />
        )}

        {activeTab === 'tasks' && (
          <GoogleTasksView
            userLoggedIn={!!user && hasWorkspaceAuth}
            onLogin={handleLogin}
            onRequestConfirmation={(title, message, onConfirm, isDestructive) => {
              setConfirmationConfig({
                isOpen: true,
                title,
                message,
                onConfirm,
                isDestructive,
              });
            }}
          />
        )}
      </main>

      {/* Footer with Persistent Help Callout */}
      <footer className="w-full border-t border-zinc-200 bg-white py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-800">Online QA Tester</span>
            <span>•</span>
            <span>Quality Engineering Platform</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <span>Stai riscontrando problemi nel sito?</span>
            <a
              href="https://luancerco.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-zinc-900 hover:text-black underline underline-offset-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              <img
                src="/assets/aistudio/logo_LUANCER_square.png"
                alt="Logo Luancer"
                className="w-4 h-4 rounded-sm object-cover shrink-0"
              />
              <span>Passa da me su luancerco.it (Te lo risolvo subito)</span>
              <ExternalLink className="w-3 h-3 text-zinc-600" />
            </a>
          </div>
        </div>
      </footer>

      {/* Test Run Execution Modal */}
      <TestRunModal
        isOpen={!!activeExecutingRun}
        testRun={activeExecutingRun}
        testCases={testCases}
        onClose={() => setActiveExecutingRun(null)}
        onUpdateTestRun={handleUpdateTestRun}
        onCreateBugFromFail={(partialBug) => {
          const newBug: Bug = {
            id: `bug-run-${Date.now()}`,
            projectId: selectedProjectId,
            testRunId: partialBug.testRunId,
            title: partialBug.title || 'Execution Failure',
            description: partialBug.description || '',
            stepsToReproduce: partialBug.stepsToReproduce || '',
            severity: partialBug.severity || 'high',
            priority: partialBug.priority || 'P1',
            status: 'open',
            environment: partialBug.environment || 'QA',
            ownerId: user?.uid || 'current',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          handleSaveBug(newBug);
          setNotification({
            message: `Automatically logged defect: "${newBug.title}"`,
            type: 'success',
          });
        }}
      />

      {/* Confirmation Modal for Google Workspace & Destructive operations */}
      <ConfirmationModal
        isOpen={confirmationConfig.isOpen}
        title={confirmationConfig.title}
        message={confirmationConfig.message}
        isDestructive={confirmationConfig.isDestructive}
        confirmLabel={confirmationConfig.isDestructive ? 'Delete' : 'Proceed'}
        onConfirm={async () => {
          const action = confirmationConfig.onConfirm;
          setConfirmationConfig((prev) => ({ ...prev, isOpen: false }));
          await action();
        }}
        onCancel={() => setConfirmationConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
