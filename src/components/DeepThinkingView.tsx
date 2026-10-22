import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  Zap,
  RefreshCw,
  Terminal,
  Layers,
  FileCode,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';

export const DeepThinkingView: React.FC = () => {
  const [problemStatement, setProblemStatement] = useState(
    'Concurrent double-spend and inventory underflow during high-volume flash sales with distributed Redis locks and PostgreSQL isolation levels.'
  );
  const [logs, setLogs] = useState(
    `[2026-10-21 08:31:02.104] WARN  checkout.service - Redis lock acquired: user_992 lock_ttl=200ms
[2026-10-21 08:31:02.310] ERROR db.pool - Lock expired before transaction commit; worker_2 overwrote inventory count from 1 to 0; duplicate order #9924 completed.`
  );
  const [architectureContext, setArchitectureContext] = useState(
    'Node.js Express microservices, PostgreSQL with Read Committed isolation, Redis cluster for distributed locking.'
  );

  const [isThinking, setIsThinking] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunDeepThinking = async () => {
    if (!problemStatement.trim()) return;
    setIsThinking(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini/deep-thinking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemStatement,
          logs,
          architectureContext,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysisResult(data.analysis);
      } else {
        setAnalysisResult(data.error || 'Failed to complete deep thinking.');
      }
    } catch (err: any) {
      setAnalysisResult(`Error: ${err.message || 'Server request failed'}`);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCopy = () => {
    if (analysisResult) {
      navigator.clipboard.writeText(analysisResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Top Banner - White Minimalist */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-zinc-700" />
            <span>High Thinking Mode Enabled</span>
          </span>
          <span className="text-xs text-zinc-400 font-mono">gemini-4-argon • ThinkingLevel.HIGH</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Deep QA Reasoning & Root Cause Architecture Lab
        </h2>
        <p className="text-xs text-zinc-600 mt-1 max-w-3xl leading-relaxed">
          Leverage maximum reasoning capacity to diagnose elusive race conditions, multi-threaded deadlocks, asynchronous timing anomalies, and synthesize combinatorial boundary test matrices.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div>
            <label className="text-xs text-zinc-700 font-semibold block mb-1">
              Complex Testing Problem / Edge Condition
            </label>
            <textarea
              rows={3}
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              placeholder="Describe the failure symptom, flaky behavior, or concurrency hypothesis..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-700 font-semibold block mb-1 flex items-center justify-between">
              <span>Diagnostic Logs, Payloads, or Stack Traces</span>
              <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
            </label>
            <textarea
              rows={4}
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              placeholder="Paste relevant terminal logs, network requests, or database query traces..."
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-[11px] font-mono text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-700 font-semibold block mb-1">
              System Context & Architectural Topology
            </label>
            <input
              type="text"
              value={architectureContext}
              onChange={(e) => setArchitectureContext(e.target.value)}
              placeholder="e.g. Distributed microservices, Kafka queue, Redis cache, PostgreSQL"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            />
          </div>

          {/* Preset Prompts */}
          <div>
            <span className="text-[11px] text-zinc-500 font-medium block mb-1.5">Quick Scenarios</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setProblemStatement('Flaky Cypress/Playwright automated test suite timing out on OAuth redirect flow.');
                  setLogs('[Error: Timeout 30000ms exceeded waiting for locator("header.user-avatar")]');
                  setArchitectureContext('SPA React with Next.js API route and third-party Google OAuth popup');
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] border border-zinc-200 transition-colors cursor-pointer"
              >
                Flaky E2E Timeout
              </button>
              <button
                type="button"
                onClick={() => {
                  setProblemStatement('Deadlock between simultaneous balance updates in banking ledger under high parallel load.');
                  setLogs('ERROR: deadlock detected; Process 4124 waits for ShareLock on transaction 891');
                  setArchitectureContext('PostgreSQL Read Committed, Spring Boot, 100 concurrent threads');
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] border border-zinc-200 transition-colors cursor-pointer"
              >
                Database Deadlock
              </button>
            </div>
          </div>

          <button
            onClick={handleRunDeepThinking}
            disabled={isThinking || !problemStatement.trim()}
            className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isThinking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-300" />
                <span>Executing High Thinking Reasoning (gemini-4-argon)...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                <span>Execute High Thinking Analysis</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Results Terminal */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold text-zinc-900">Deep Thinking Output Matrix</h3>
              </div>
              {analysisResult && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-zinc-500 hover:text-zinc-900 text-xs font-medium cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {analysisResult ? (
              <div className="prose max-w-none text-xs text-zinc-800 space-y-3 leading-relaxed whitespace-pre-line bg-zinc-50 p-4 rounded-xl border border-zinc-200 font-mono max-h-[550px] overflow-y-auto">
                {analysisResult}
              </div>
            ) : (
              <div className="py-24 text-center text-zinc-400 text-xs">
                {isThinking ? (
                  <div className="space-y-3">
                    <RefreshCw className="w-8 h-8 text-zinc-800 animate-spin mx-auto" />
                    <p className="font-semibold text-zinc-800">
                      Gemini 4 Argon is reasoning at ThinkingLevel.HIGH...
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Exploring combinatorial permutations, edge-case race conditions, and proof verification.
                    </p>
                  </div>
                ) : (
                  'Specify an intricate concurrency or architectural defect to activate High Thinking mode.'
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
