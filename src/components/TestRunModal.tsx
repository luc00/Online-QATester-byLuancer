import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  Bug as BugIcon,
  Clock,
  Timer,
  ChevronRight,
  ChevronLeft,
  X,
  FileCheck,
} from 'lucide-react';
import { TestRun, TestCase, TestResultStatus, Bug } from '../types/qa.ts';

interface TestRunModalProps {
  isOpen: boolean;
  testRun: TestRun | null;
  testCases: TestCase[];
  onClose: () => void;
  onUpdateTestRun: (updatedRun: TestRun) => Promise<void>;
  onCreateBugFromFail: (bug: Partial<Bug>) => void;
}

export const TestRunModal: React.FC<TestRunModalProps> = ({
  isOpen,
  testRun,
  testCases,
  onClose,
  onUpdateTestRun,
  onCreateBugFromFail,
}) => {
  if (!isOpen || !testRun) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [actualResultInput, setActualResultInput] = useState('');
  const [resultsMap, setResultsMap] = useState<Record<string, { status: TestResultStatus; actual: string }>>({});

  // Stopwatch state
  const [seconds, setSeconds] = useState<number>(testRun.durationSeconds || 0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(true);

  // Stopwatch ticker
  useEffect(() => {
    let interval: any = null;
    if (isStopwatchRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  const casesInRun = testCases.filter((tc) => tc.projectId === testRun.projectId);
  const currentCase = casesInRun[currentIndex] || casesInRun[0];

  const handleRecordStatus = (status: TestResultStatus) => {
    if (!currentCase) return;

    const newMap = {
      ...resultsMap,
      [currentCase.id]: {
        status,
        actual: actualResultInput || (status === 'passed' ? 'Verified as expected' : 'Issue encountered'),
      },
    };
    setResultsMap(newMap);

    // If failed, offer to file bug immediately
    if (status === 'failed') {
      onCreateBugFromFail({
        title: `[Failure in ${testRun.title}] ${currentCase.title}`,
        stepsToReproduce: currentCase.steps,
        description: `Test step failed during execution in ${testRun.environment}.\nActual Outcome: ${
          actualResultInput || 'Did not match expected result.'
        }`,
        severity: currentCase.priority === 'critical' ? 'critical' : 'high',
        priority: 'P1',
        environment: testRun.environment,
        testRunId: testRun.id,
      });
    }

    // Auto advance to next case if available
    if (currentIndex < casesInRun.length - 1) {
      setCurrentIndex((i) => i + 1);
      setActualResultInput('');
    }
  };

  // Helper to format duration for display and storage
  const formatDurationDisplay = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatStopwatchDigital = (totalSec: number): string => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handlePauseAndClose = async () => {
    setIsStopwatchRunning(false);
    const updated: TestRun = {
      ...testRun,
      durationSeconds: seconds,
      formattedDuration: formatDurationDisplay(seconds),
      updatedAt: new Date().toISOString(),
    };
    await onUpdateTestRun(updated);
    onClose();
  };

  const handleCompleteRun = async () => {
    setIsStopwatchRunning(false);

    let passed = 0;
    let failed = 0;
    let blocked = 0;
    let skipped = 0;

    Object.values(resultsMap).forEach((r) => {
      if (r.status === 'passed') passed++;
      if (r.status === 'failed') failed++;
      if (r.status === 'blocked') blocked++;
      if (r.status === 'skipped') skipped++;
    });

    const formattedDuration = formatDurationDisplay(seconds);

    const updated: TestRun = {
      ...testRun,
      passed,
      failed,
      blocked,
      skipped,
      total: casesInRun.length,
      status: 'completed',
      durationSeconds: seconds,
      formattedDuration,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateTestRun(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs text-zinc-900">
      <div className="w-full max-w-3xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Integrated Stopwatch - White & Minimalist */}
        <div className="px-6 py-4 bg-white border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-100 text-zinc-800 rounded-xl">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">{testRun.title}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {testRun.environment}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Progress: <strong className="text-zinc-800">{Object.keys(resultsMap).length}</strong> / {casesInRun.length} evaluated
              </p>
            </div>
          </div>

          {/* Interactive Stopwatch Widget */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Timer className={`w-4 h-4 ${isStopwatchRunning ? 'text-zinc-900 animate-pulse' : 'text-zinc-400'}`} />
                <span className="font-mono text-xs font-bold text-zinc-900 tracking-wider">
                  {formatStopwatchDigital(seconds)}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isStopwatchRunning ? 'bg-emerald-500 animate-ping' : 'bg-zinc-400'
                  }`}
                />
              </div>

              {/* Stopwatch Controls */}
              <div className="flex items-center gap-1 pl-2 border-l border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsStopwatchRunning((prev) => !prev)}
                  className="p-1 text-zinc-600 hover:text-zinc-900 rounded transition-colors cursor-pointer"
                  title={isStopwatchRunning ? 'Pause Stopwatch' : 'Resume Stopwatch'}
                >
                  {isStopwatchRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSeconds(0)}
                  className="p-1 text-zinc-400 hover:text-zinc-800 rounded transition-colors cursor-pointer"
                  title="Reset Stopwatch"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={handlePauseAndClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
              title="Close / Pause"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5 text-xs">
          {currentCase ? (
            <>
              {/* Stepper info */}
              <div className="flex items-center justify-between bg-zinc-50 px-4 py-2.5 rounded-xl border border-zinc-200">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Case</span>
                  <span className="font-bold text-zinc-900">
                    {currentIndex + 1} of {casesInRun.length}
                  </span>
                  <span className="text-zinc-300">•</span>
                  <span className="font-mono text-zinc-600 font-semibold">{currentCase.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    className="p-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentIndex === casesInRun.length - 1}
                    onClick={() => setCurrentIndex((i) => Math.min(casesInRun.length - 1, i + 1))}
                    className="p-1 text-zinc-500 hover:text-zinc-900 disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-zinc-900 mb-1">{currentCase.title}</h4>
                <div className="flex items-center gap-2 text-zinc-500">
                  <span>Suite: <strong className="text-zinc-800">{currentCase.suite}</strong></span>
                  <span>•</span>
                  <span>Priority: <strong className="text-zinc-800 uppercase">{currentCase.priority}</strong></span>
                </div>
              </div>

              {currentCase.preconditions && (
                <div>
                  <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                    Preconditions
                  </span>
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-zinc-800">
                    {currentCase.preconditions}
                  </div>
                </div>
              )}

              <div>
                <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Steps to Execute
                </span>
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 font-mono text-[11px] text-zinc-800 whitespace-pre-line leading-relaxed">
                  {currentCase.steps}
                </div>
              </div>

              <div>
                <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Expected Result
                </span>
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 text-emerald-900">
                  {currentCase.expectedResult}
                </div>
              </div>

              <div>
                <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-1">
                  Actual Result / Tester Observations
                </span>
                <textarea
                  rows={2}
                  value={actualResultInput}
                  onChange={(e) => setActualResultInput(e.target.value)}
                  placeholder="Note actual response, HTTP status, or unexpected UI behaviour..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Status Actions */}
              <div className="pt-2">
                <span className="text-zinc-500 font-semibold uppercase text-[10px] tracking-wider block mb-2">
                  Record Test Verdict
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => handleRecordStatus('passed')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Pass</span>
                  </button>

                  <button
                    onClick={() => handleRecordStatus('failed')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Fail & Log Defect</span>
                  </button>

                  <button
                    onClick={() => handleRecordStatus('blocked')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Blocked</span>
                  </button>

                  <button
                    onClick={() => handleRecordStatus('skipped')}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Skip</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-zinc-400">
              No test cases found in this project. Please create or generate test cases first.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-zinc-400">Recorded:</span>
            <span className="text-emerald-700 font-medium">
              {Object.values(resultsMap).filter((r) => r.status === 'passed').length} Pass
            </span>
            <span className="text-rose-700 font-medium">
              {Object.values(resultsMap).filter((r) => r.status === 'failed').length} Fail
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePauseAndClose}
              className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Pause Run
            </button>
            <button
              onClick={handleCompleteRun}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4" />
              <span>Complete & Finalize ({formatStopwatchDigital(seconds)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
