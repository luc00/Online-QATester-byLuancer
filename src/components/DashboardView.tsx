/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  Bug,
  Play,
  FileSpreadsheet,
  ListTodo,
  TrendingUp,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Timer,
  Layers,
  Globe,
  Search,
  ShieldCheck,
  Download,
  ExternalLink,
} from 'lucide-react';
import { Project, TestCase, TestRun, Bug as BugType } from '../types/qa.ts';
import { exportTestCasesToCsv } from '../lib/exportUtils.ts';
import { DashboardWidget } from './DashboardWidget.tsx';

interface DashboardViewProps {
  currentProject: Project | null;
  testCases: TestCase[];
  testRuns: TestRun[];
  bugs: BugType[];
  onOpenTestRun: (run: TestRun) => void;
  onNavigateTab: (tab: string) => void;
  onExportSheets: () => void;
  onSyncTasks: () => void;
  isExporting: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentProject,
  testCases,
  testRuns,
  bugs,
  onOpenTestRun,
  onNavigateTab,
  onExportSheets,
  onSyncTasks,
  isExporting,
}) => {
  const totalCases = testCases.length;
  const automatedCases = testCases.filter((tc) => tc.automated).length;
  const autoPercent = totalCases > 0 ? Math.round((automatedCases / totalCases) * 100) : 0;

  const openBugs = bugs.filter((b) => b.status === 'open' || b.status === 'in_progress');
  const criticalBugs = bugs.filter((b) => b.severity === 'critical' || b.priority === 'P0');
  const p1Bugs = bugs.filter((b) => b.priority === 'P1');

  const activeRun = testRuns.find((r) => r.status === 'in_progress') || testRuns[0];

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Luancer & Co. Banner Assistenza Diretta */}
      <div className="bg-zinc-900 text-white rounded-2xl p-4 sm:p-5 border border-zinc-800 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src="/Online-QATester-byLuancer/assets/aistudio/logo_LUANCER_square.png"
              alt="LUANCER & CO."
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              LUANCER & CO. • ASSISTENZA DIRETTA
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
              <span>Passa da me su luancerco.it</span>
              <span className="text-amber-400">⚡</span>
            </h2>
          </div>
        </div>

        <a
          href="https://luancerco.it/"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <span>Visita luancerco.it</span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-600" />
        </a>
      </div>

      {/* Top Welcome Banner - White & Minimalist */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-zinc-200 p-6 md:p-8 shadow-xs">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200">
              <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
              AI-Powered Quality Assurance
            </span>
            <span className="text-xs text-zinc-400">Workspace Connected</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
            {currentProject ? currentProject.name : 'Quality Engineering Hub'}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            {currentProject?.description ||
              'Execute test plans, triage video & visual defects with Gemini 4 Argon, perform deep thinking root-cause analysis, and sync directly with Google Sheets and Google Tasks.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => onNavigateTab('audit')}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-white" />
              <span>Audit Sito & Risoluzione Bug</span>
            </button>

            {activeRun && (
              <button
                onClick={() => onOpenTestRun(activeRun)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-zinc-600" />
                <span>Esegui Run: {activeRun.title}</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('inspector')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <span>Visual & Video Bug Triage</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            <button
              onClick={() => exportTestCasesToCsv(testCases)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Scarica direttamente tutti i casi di test in formato CSV per il tuo dispositivo"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600" />
              <span>Scarica Casi (CSV)</span>
            </button>

            <button
              onClick={onExportSheets}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 text-emerald-700 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isExporting ? 'Esportazione...' : 'Esporta su Google Sheets'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Pillars QA Card */}
      <div className="bg-white border-2 border-zinc-200 rounded-3xl p-6 shadow-xs relative overflow-hidden transition-all hover:border-zinc-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-800 border border-zinc-200 uppercase tracking-wider">
              Scansione Globale del Sito Web
            </div>
            <h3 className="text-lg sm:text-xl font-black text-zinc-900 tracking-tight">
              Trova Bug di qualsiasi tipo, Violazioni, Cose Mancanti, Consigli e Previsioni
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed font-normal">
              Inserisci l'URL di un sito o carica uno screenshot: l'algoritmo esaminerà layout, accessibilità WCAG, GDPR, validazioni mancanti, UX e genererà previsioni di rischio per schermi mobili e picchi di traffico.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('audit')}
              className="inline-flex items-center gap-2.5 px-5 py-3 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-2xl shadow-xs transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Avvia Ispezione Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-zinc-100">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-rose-600 block mb-1">1. Bug & Difetti</span>
            <p className="text-xs font-semibold text-zinc-900 leading-tight">Layout, responsive, bottoni e visuali</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-amber-600 block mb-1">2. Violazioni</span>
            <p className="text-xs font-semibold text-zinc-900 leading-tight">WCAG 2.1 AA, GDPR, SSL, Standard Web</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-blue-600 block mb-1">3. Cose Mancanti</span>
            <p className="text-xs font-semibold text-zinc-900 leading-tight">CTA, validazioni form, stati vuoti/errori</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-1">4. Consigli Pratici</span>
            <p className="text-xs font-semibold text-zinc-900 leading-tight">Ottimizzazioni UX, CRO e velocità</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-3 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-purple-600 block mb-1">5. Previsione Problemi</span>
            <p className="text-xs font-semibold text-zinc-900 leading-tight">Edge cases, picchi traffico e browser</p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Total Test Cases</span>
            <div className="p-2 rounded-lg bg-zinc-100 text-zinc-800">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 tracking-tight">{totalCases}</span>
            <span className="text-xs text-zinc-400">across all suites</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 flex items-center justify-between border-t border-zinc-100 pt-2">
            <span>Automation ratio</span>
            <span className="font-semibold text-zinc-900">{autoPercent}%</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Active Test Runs</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Play className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className
