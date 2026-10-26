import React, { useState } from 'react';
import {
  Globe,
  Search,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Bug as BugIcon,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  ListTodo,
  Layers,
  Flame,
  Zap,
  Info,
  RefreshCw,
  PlusCircle,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AuditBug,
  AuditViolation,
  AuditMissingElement,
  AuditRecommendation,
  AuditProblemPrediction,
  WebsiteAuditReport,
  Bug,
  TestCase,
} from '../types/qa.ts';
import luancerLogo from './logo_LUANCER_square.png';

interface WebsiteAuditorViewProps {
  onFileBug: (bug: Partial<Bug>) => void;
  onCreateTestCase: (testCase: Partial<TestCase>) => void;
  onSyncTask?: (title: string, notes: string) => void;
  selectedProjectId: string;
}

export const WebsiteAuditorView: React.FC<WebsiteAuditorViewProps> = ({
  onFileBug,
  onCreateTestCase,
  onSyncTask,
  selectedProjectId,
}) => {
  // Input states
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [htmlSnippet, setHtmlSnippet] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string>('');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [auditReport, setAuditReport] = useState<WebsiteAuditReport | null>(null);

  // Active view tab in report
  const [activeReportTab, setActiveReportTab] = useState<
    'all' | 'bugs' | 'violations' | 'missing' | 'recommendations' | 'predictions'
  >('all');

  // Filter & interaction states
  const [bugSeverityFilter, setBugSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionNotices, setActionNotices] = useState<Record<string, string>>({});

  // Quick preset loader
  const handleLoadPreset = (presetUrl: string, presetDesc: string) => {
    setUrl(presetUrl);
    setDescription(presetDesc);
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Seleziona un file immagine valido (PNG, JPG, WEBP).');
      return;
    }

    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Run audit request
  const handleRunAudit = async () => {
    if (!url.trim() && !description.trim() && !htmlSnippet.trim() && !screenshotBase64) {
      setErrorMessage('Inserisci un URL del sito, carica uno screenshot o fornisci una descrizione/codice.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/gemini/website-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim() || undefined,
          description: description.trim() || undefined,
          htmlSnippet: htmlSnippet.trim() || undefined,
          screenshotBase64: screenshotBase64 || undefined,
          mimeType: screenshotBase64?.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante l\'esecuzione dell\'audit.');
      }

      const data: WebsiteAuditReport = await response.json();
      setAuditReport(data);
      setActiveReportTab('all');
    } catch (err: any) {
      console.error('Audit failure:', err);
      setErrorMessage(err.message || 'Si è verificato un errore durante l\'analisi del sito.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding bug to tracker
  const handleRegisterBug = (item: AuditBug) => {
    onFileBug({
      title: `[Audit] ${item.title}`,
      description: `${item.description}\n\nPosizione: ${item.location}\nSoluzione Consigliata: ${item.solution}`,
      stepsToReproduce: item.stepsToReproduce,
      severity: item.severity,
      priority: item.severity === 'critical' ? 'P0' : item.severity === 'high' ? 'P1' : 'P2',
      status: 'open',
      environment: url ? `Sito: ${url}` : 'Audit Online QA',
    });

    setActionNotices((prev) => ({ ...prev, [item.id]: 'Registrato nei Bug!' }));
    setTimeout(() => {
      setActionNotices((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
    }, 3000);
  };

  // Handle creating test case
  const handleCreateTestCaseFromItem = (title: string, steps: string, expectedResult: string, category: string) => {
    onCreateTestCase({
      title: `Verifica: ${title}`,
      suite: `Audit QA - ${category}`,
      type: 'Functional',
      priority: 'high',
      status: 'active',
      preconditions: url ? `Naviga all'indirizzo ${url}` : 'Accedi all\'interfaccia web',
      steps: steps || '1. Carica la pagina web\n2. Ispeziona l\'elemento o il flusso\n3. Verifica il comportamento',
      expectedResult: expectedResult || 'Tutti i requisiti e gli standard di qualità devono essere rispettati.',
      automated: false,
    });
  };

  // Copy helper
  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export full markdown
  const handleExportMarkdown = () => {
    if (!auditReport) return;

    let md = `# Report di Qualità e Audit QA: ${auditReport.targetUrl || 'Sito Web'}\n`;
    md += `Data di analisi: ${new Date(auditReport.analyzedAt).toLocaleString('it-IT')}\n`;
    md += `Punteggio di Qualità: ${auditReport.qualityScore}/100 (Grado ${auditReport.grade})\n\n`;
    md += `## Sintesi Esecutiva\n${auditReport.executiveSummary}\n\n`;

    md += `## 1. Bug e Difetti Rilevati (${auditReport.bugs.length})\n`;
    auditReport.bugs.forEach((b, i) => {
      md += `### ${i + 1}. ${b.title} [${b.severity.toUpperCase()}]\n`;
      md += `- **Tipo**: ${b.type} | **Posizione**: ${b.location}\n`;
      md += `- **Descrizione**: ${b.description}\n`;
      md += `- **Riproduzione**:\n${b.stepsToReproduce}\n`;
      md += `- **Fix Consigliato**: ${b.solution}\n\n`;
    });

    md += `## 2. Violazioni Normative e Standard (${auditReport.violations.length})\n`;
    auditReport.violations.forEach((v, i) => {
      md += `### ${i + 1}. ${v.title} [${v.category}]\n`;
      md += `- **Norma/Standard**: ${v.standard} | **Severità**: ${v.severity}\n`;
      md += `- **Descrizione**: ${v.description}\n`;
      md += `- **Rimedio**: ${v.remediation}\n\n`;
    });

    md += `## 3. Cose Mancanti (${auditReport.missingElements.length})\n`;
    auditReport.missingElements.forEach((m, i) => {
      md += `### ${i + 1}. ${m.title} [${m.category}]\n`;
      md += `- **Importanza**: ${m.importance.toUpperCase()}\n`;
      md += `- **Descrizione**: ${m.description}\n`;
      md += `- **Markup Suggerito**: \`${m.suggestedMarkup}\`\n\n`;
    });

    md += `## 4. Consigli Pratici & Ottimizzazioni (${auditReport.recommendations.length})\n`;
    auditReport.recommendations.forEach((r, i) => {
      md += `### ${i + 1}. ${r.title} [${r.category}]\n`;
      md += `- **Impatto**: ${r.impact.toUpperCase()}\n`;
      md += `- **Consiglio**: ${r.advice}\n`;
      md += `- **Beneficio Atteso**: ${r.expectedBenefit}\n\n`;
    });

    md += `## 5. Previsione Problemi & Rischi Futuri (${auditReport.problemPredictions.length})\n`;
    auditReport.problemPredictions.forEach((p, i) => {
      md += `### ${i + 1}. ${p.title} [Rischio: ${p.riskLevel.toUpperCase()}]\n`;
      md += `- **Scenario**: ${p.scenario}\n`;
      md += `- **Potenziale Malfunzionamento**: ${p.potentialFailure}\n`;
      md += `- **Azione Preventiva**: ${p.preventativeAction}\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = `qa-audit-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(dlUrl);
  };

  const filteredBugs =
    bugSeverityFilter === 'all'
      ? auditReport?.bugs || []
      : (auditReport?.bugs || []).filter((b) => b.severity === bugSeverityFilter);

  return (
    <div className="space-y-6 text-zinc-900 pb-12">
      {/* Top Banner & Header */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-zinc-700" />
            <span>I 5 Pilastri del QA: Bug, Violazioni, Cose Mancanti, Consigli e Previsioni</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Audit di Qualità e Analisi Completa del Sito
          </h1>

          <p className="text-sm text-zinc-600 leading-relaxed font-normal">
            Questo strumento analizza in modo approfondito qualsiasi sito web o pagina: scova{' '}
            <strong className="text-zinc-900 font-semibold">bug e difetti</strong> di qualsiasi natura (layout,
            funzionali, visuali), identifica <strong className="text-zinc-900 font-semibold">violazioni</strong> (WCAG,
            GDPR, sicurezza), rileva <strong className="text-zinc-900 font-semibold">cose mancanti</strong> (CTA,
            validazioni, stati essenziali), offre <strong className="text-zinc-900 font-semibold">consigli pratici</strong>{' '}
            e genera la <strong className="text-zinc-900 font-semibold">previsione di problemi futuri</strong> prima che si
            verifichino in produzione.
          </p>
        </div>

        {/* Quick presets */}
        <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Esempi rapidi di audit:</span>
          <button
            onClick={() =>
              handleLoadPreset(
                'https://portfolio-agency.example.com',
                'Sito aziendale e piattaforma servizi. Verifica responsività mobile, contrasti, conformità e velocità.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
          >
            Sito Aziendale & Servizi
          </button>
          <button
            onClick={() =>
              handleLoadPreset(
                'https://ecommerce-store-demo.example.com',
                'Piattaforma E-commerce con carrello, checkout, pagamenti con carta e catalogo prodotti. Ispeziona flussi critici.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
          >
            E-Commerce Checkout
          </button>
          <button
            onClick={() =>
              handleLoadPreset(
                'https://saas-dashboard.example.com',
                'Dashboard SaaS con grafici, filtri per data, form di configurazione e tabelle dati complesse.'
              )
            }
            className="px-2.5 py-1 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors cursor-pointer"
          >
            SaaS Web App
          </button>
        </div>
      </div>

      {/* Input Form Card */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-5">
        <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-zinc-700" />
          <span>Configura il Target dell'Ispezione</span>
        </h2>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* URL Input */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                URL del Sito Web o Applicazione
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Globe className="w-4 h-4 text-zinc-400" />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://tuosito.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Verrà eseguita l'analisi strutturale, conformità, semantica e ispezione completa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Descrizione del Sito & Obiettivi di Qualità (Opzionale)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Es. E-commerce di abbigliamento, flusso critico carrello -> pagamento Stripe, utenti prevalentemente da smartphone..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>

          {/* Screenshot & Mockup Upload */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5 flex items-center justify-between">
                <span>Screenshot o Mockup Schermo (Opzionale)</span>
                {screenshotBase64 && (
                  <button
                    onClick={() => {
                      setScreenshotBase64(null);
                      setScreenshotName('');
                    }}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Rimuovi
                  </button>
                )}
              </label>

              {screenshotBase64 ? (
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 p-2 text-center group">
                  <img
                    src={screenshotBase64}
                    alt="Target Screenshot"
                    className="max-h-40 mx-auto rounded-lg object-contain"
                  />
                  <div className="mt-2 text-xs font-medium text-zinc-600 truncate">{screenshotName}</div>
                  <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                    Gemini Multimodal Vision Pronto
                  </span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50 rounded-2xl cursor-pointer transition-all">
                  <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                  <span className="text-xs font-semibold text-zinc-800">Carica screenshot del sito</span>
                  <span className="text-[11px] text-zinc-400 mt-0.5">PNG, JPG, WEBP per ispezione visiva pixel-perfect</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Advanced: HTML Snippet */}
        <div className="border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
          >
            <span>Opzioni Avanzate: Snippet DOM / Codice HTML</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3">
              <textarea
                value={htmlSnippet}
                onChange={(e) => setHtmlSnippet(e.target.value)}
                rows={4}
                placeholder="Incolla qui porzioni di codice HTML, tag di form, header o componenti React per verificare semantica e validità..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white resize-none"
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Motore: Gemini 4 Argon & 3.8 Flash • Output 5 Pilastri QA</span>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isLoading}
            className="flex items-center gap-2.5 px-6 py-3 bg-zinc-900 hover:bg-black text-white text-sm font-bold rounded-2xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-300" />
                <span>Analisi in Corso (Bug, Violazioni, Cose Mancanti)...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Esegui Audit Completo del Sito</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {isLoading && (
        <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-xs text-center space-y-4 animate-pulse">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-800">
            <Search className="w-6 h-6 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">Ispezione del sito in corso...</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Stiamo scansionando il layout, verificando la conformità WCAG e GDPR, identificando componenti o validazioni
            mancanti, e calcolando scenari di rischio futuro.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-zinc-600">
            <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">1. Bug & Layout</span>
            <span className="text-zinc-300">→</span>
            <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">2. Violazioni</span>
            <span className="text-zinc-300">→</span>
            <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">3. Cose Mancanti</span>
            <span className="text-zinc-300">→</span>
            <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">4. Consigli</span>
            <span className="text-zinc-300">→</span>
            <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg">5. Previsioni</span>
          </div>
        </div>
      )}

      {/* Audit Report Presentation */}
      {auditReport && !isLoading && (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="bg-white border-2 border-zinc-200 rounded-3xl p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Report Ufficiale QA
                  </span>
                  <span className="text-xs text-zinc-400">•</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(auditReport.analyzedAt).toLocaleString('it-IT')}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  {auditReport.targetUrl ? `Analisi di: ${auditReport.targetUrl}` : 'Risultati Audit Qualità'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 max-w-2xl leading-relaxed">
                  {auditReport.executiveSummary}
                </p>
              </div>

              {/* Quality Score Badge */}
              <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl shrink-0">
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-zinc-900 leading-none">
                    {auditReport.qualityScore}
                    <span className="text-sm font-normal text-zinc-400">/100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mt-1 block">
                    Punteggio Qualità
                  </span>
                </div>
                <div className="h-10 w-px bg-zinc-200"></div>
                <div className="text-center px-2">
                  <div className="text-2xl font-black text-zinc-900">{auditReport.grade}</div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Grado</span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar & Export */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
                  <BugIcon className="w-3.5 h-3.5 text-rose-600" />
                  <span>{auditReport.bugs.length} Bug & Difetti</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>{auditReport.violations.length} Violazioni</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>{auditReport.missingElements.length} Cose Mancanti</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{auditReport.recommendations.length} Consigli</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>{auditReport.problemPredictions.length} Previsioni Rischi</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportMarkdown}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Scarica Report (.md)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5-Pillar Tabs Navigation */}
          <div className="flex border-b border-zinc-200 gap-1 overflow-x-auto pb-px">
            <button
              onClick={() => setActiveReportTab('all')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'all'
                  ? 'bg-zinc-900 text-white border-b-2 border-zinc-900'
                  : 'bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <span>Vista Completa</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">
                {auditReport.bugs.length +
                  auditReport.violations.length +
                  auditReport.missingElements.length +
                  auditReport.recommendations.length +
                  auditReport.problemPredictions.length}
              </span>
            </button>

            <button
              onClick={() => setActiveReportTab('bugs')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'bugs'
                  ? 'bg-rose-600 text-white border-b-2 border-rose-600'
                  : 'bg-white text-zinc-600 hover:text-rose-700 hover:bg-rose-50/50'
              }`}
            >
              <BugIcon className="w-3.5 h-3.5" />
              <span>1. Bug & Difetti</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                {auditReport.bugs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveReportTab('violations')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'violations'
                  ? 'bg-amber-600 text-white border-b-2 border-amber-600'
                  : 'bg-white text-zinc-600 hover:text-amber-700 hover:bg-amber-50/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>2. Violazioni</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                {auditReport.violations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveReportTab('missing')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'missing'
                  ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                  : 'bg-white text-zinc-600 hover:text-blue-700 hover:bg-blue-50/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Cose Mancanti</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                {auditReport.missingElements.length}
              </span>
            </button>

            <button
              onClick={() => setActiveReportTab('recommendations')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'recommendations'
                  ? 'bg-emerald-600 text-white border-b-2 border-emerald-600'
                  : 'bg-white text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>4. Consigli Pratici</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {auditReport.recommendations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveReportTab('predictions')}
              className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeReportTab === 'predictions'
                  ? 'bg-purple-600 text-white border-b-2 border-purple-600'
                  : 'bg-white text-zinc-600 hover:text-purple-700 hover:bg-purple-50/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>5. Previsione Problemi</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                {auditReport.problemPredictions.length}
              </span>
            </button>
          </div>

          {/* Section 1: Bug & Difetti */}
          {(activeReportTab === 'all' || activeReportTab === 'bugs') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
                    <BugIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      1. Bug e Difetti di Qualsiasi Tipo ({filteredBugs.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Difetti visivi, anomalie responsive, mancata esecuzione, errori console e incoerenze di layout
                    </p>
                  </div>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-zinc-400 font-medium hidden sm:inline">Severità:</span>
                  {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setBugSeverityFilter(sev)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                        bugSeverityFilter === sev
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {sev === 'all' ? 'Tutti' : sev}
                    </button>
                  ))}
                </div>
              </div>

              {filteredBugs.length === 0 ? (
                <div className="p-6 bg-white border border-zinc-200 rounded-2xl text-center text-xs text-zinc-500">
                  Nessun difetto trovato per questo filtro di severità.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredBugs.map((bug) => {
                    const sevColor =
                      bug.severity === 'critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : bug.severity === 'high'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : bug.severity === 'medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-zinc-50 text-zinc-700 border-zinc-200';

                    return (
                      <div
                        key={bug.id}
                        className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs space-y-3 transition-all"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sevColor}`}
                              >
                                {bug.severity}
                              </span>
                              <span className="text-[10px] font-medium bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md">
                                {bug.type}
                              </span>
                              {bug.location && (
                                <span className="text-[10px] text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-200 font-mono">
                                  {bug.location}
                                </span>
                              )}
                            </div>
                            <h5 className="text-base font-bold text-zinc-900">{bug.title}</h5>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRegisterBug(bug)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>{actionNotices[bug.id] || 'Registra nei Bug'}</span>
                            </button>

                            <button
                              onClick={() =>
                                handleCreateTestCaseFromItem(
                                  bug.title,
                                  bug.stepsToReproduce,
                                  bug.solution,
                                  'Verifica Bug'
                                )
                              }
                              title="Crea Test Case da questo difetto"
                              className="p-1.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl text-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </button>

                            <a
                              href="https://luancerco.it/"
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Fallo risolvere subito da Luancer & Co."
                              className="p-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4 text-zinc-500" />
                            </a>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-700 leading-relaxed font-normal">{bug.description}</p>

                        {bug.stepsToReproduce && (
                          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 text-xs space-y-1">
                            <span className="font-semibold text-zinc-800 block text-[11px] uppercase tracking-wider">
                              Passi di Riproduzione:
                            </span>
                            <p className="text-zinc-600 whitespace-pre-line font-mono text-[11px]">
                              {bug.stepsToReproduce}
                            </p>
                          </div>
                        )}

                        {bug.solution && (
                          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-200/80 text-xs space-y-1">
                            <span className="font-semibold text-emerald-900 block text-[11px] uppercase tracking-wider">
                              Soluzione / Fix Tecnico Raccomandato:
                            </span>
                            <p className="text-emerald-800 leading-relaxed">{bug.solution}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section 2: Violazioni */}
          {(activeReportTab === 'all' || activeReportTab === 'violations') && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    2. Violazioni Normative e Standard ({auditReport.violations.length})
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Accessibilità WCAG 2.1/2.2 AA, consenso GDPR & Cookie, sicurezza HTTPS/CSP e standard web
                  </p>
                </div>
              </div>

              {auditReport.violations.length === 0 ? (
                <div className="p-6 bg-white border border-zinc-200 rounded-2xl text-center text-xs text-zinc-500">
                  Nessuna violazione critica riscontrata!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {auditReport.violations.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs space-y-3 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            {v.category}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-200">
                            {v.standard}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-zinc-900">{v.title}</h5>
                        <p className="text-xs text-zinc-600 leading-relaxed">{v.description}</p>
                      </div>

                      <div className="pt-2 border-t border-zinc-100 space-y-2">
                        <div className="text-[11px] bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 text-zinc-700">
                          <strong className="text-zinc-900 block font-semibold mb-0.5">Rimedio Conforme:</strong>
                          <span>{v.remediation}</span>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() =>
                              onFileBug({
                                title: `[Violazione] ${v.title}`,
                                description: `${v.description}\n\nNorma: ${v.standard}\nRimedio: ${v.remediation}`,
                                stepsToReproduce: `Verifica conformità standard: ${v.standard}`,
                                severity: v.severity === 'critical' ? 'critical' : 'high',
                                priority: 'P1',
                                status: 'open',
                              })
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Registra Bug
                          </button>
                          <button
                            onClick={() =>
                              handleCreateTestCaseFromItem(
                                v.title,
                                `1. Esegui audit automatico standard ${v.standard}\n2. Verifica rimedio: ${v.remediation}`,
                                'Nessuna violazione deve sussistere',
                                'Violazioni & Compliance'
                              )
                            }
                            className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors cursor-pointer"
                          >
                            Crea Test Case
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 3: Cose Mancanti */}
          {(activeReportTab === 'all' || activeReportTab === 'missing') && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    3. Cose Mancanti ({auditReport.missingElements.length})
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Call to Action essenziali, validazioni dei form, stati vuoti/errore, alt text e metadati SEO
                  </p>
                </div>
              </div>

              {auditReport.missingElements.length === 0 ? (
                <div className="p-6 bg-white border border-zinc-200 rounded-2xl text-center text-xs text-zinc-500">
                  Tutti gli elementi essenziali risultano presenti!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {auditReport.missingElements.map((m) => (
                    <div
                      key={m.id}
                      className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs space-y-3 transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                            {m.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              m.importance === 'essential'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {m.importance}
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-zinc-900">{m.title}</h5>
                        <p className="text-xs text-zinc-600 leading-relaxed">{m.description}</p>
                      </div>

                      {m.suggestedMarkup && (
                        <div className="pt-2 border-t border-zinc-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                              Markup / Validazione Consigliata:
                            </span>
                            <button
                              onClick={() => handleCopyCode(m.id, m.suggestedMarkup)}
                              className="text-[10px] text-zinc-600 hover:text-zinc-900 flex items-center gap-1 cursor-pointer font-medium"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Copiato!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copia</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] font-mono text-zinc-800 overflow-x-auto whitespace-pre-wrap">
                            {m.suggestedMarkup}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Consigli Pratici */}
          {(activeReportTab === 'all' || activeReportTab === 'recommendations') && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    4. Consigli Pratici & Miglioramenti ({auditReport.recommendations.length})
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Ottimizzazioni concrete di UX, conversioni (CRO), velocità di caricamento e gerarchia visiva
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {auditReport.recommendations.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs space-y-3 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {r.category}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                          Impatto {r.impact}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-zinc-900">{r.title}</h5>
                      <p className="text-xs text-zinc-600 leading-relaxed">{r.advice}</p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 text-[11px] text-emerald-800 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/70">
                      <strong className="block font-semibold mb-0.5">Beneficio Atteso:</strong>
                      <span>{r.expectedBenefit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Previsione Problemi */}
          {(activeReportTab === 'all' || activeReportTab === 'predictions') && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    5. Previsione di Problemi & Rischi Futuri ({auditReport.problemPredictions.length})
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Anticipazione di malfunzionamenti sotto carico, incompatibilità browser, schermi atipici e race conditions
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {auditReport.problemPredictions.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 shadow-xs space-y-3 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                          Rischio Previsto
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            p.riskLevel === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : p.riskLevel === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          Rischio {p.riskLevel}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-zinc-900">{p.title}</h5>

                      <div className="text-xs bg-zinc-50 p-2.5 rounded-xl border border-zinc-200 space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider block">
                          Scenario di Rischio:
                        </span>
                        <p className="text-zinc-700">{p.scenario}</p>
                      </div>

                      <p className="text-xs text-rose-700 font-medium">
                        <strong>Potenziale Fallimento:</strong> {p.potentialFailure}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 space-y-2">
                      <div className="text-[11px] bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/70 text-emerald-900">
                        <strong className="block font-semibold mb-0.5">Azione Preventiva / Test di Carico:</strong>
                        <span>{p.preventativeAction}</span>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          onClick={() =>
                            handleCreateTestCaseFromItem(
                              `Test Preventivo: ${p.title}`,
                              `Scenario: ${p.scenario}\nVerifica: ${p.preventativeAction}`,
                              'Il sistema deve gestire lo scenario senza degradare',
                              'Test di Resilienza'
                            )
                          }
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Crea Test Case di Resilienza</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Callout: Need Immediate Fix? */}
          <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl text-center sm:text-left">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                Supporto Rapido per i Problemi Rilevati
              </span>
              <h4 className="text-lg sm:text-xl font-bold">Vuoi risolvere tutti questi bug e violazioni subito?</h4>
              <p className="text-xs sm:text-sm text-zinc-300 font-normal">
                Passa da me su <strong className="text-white">luancerco.it</strong>: ti fornisco assistenza tecnica
                diretta e risoluzione istantanea per ogni difetto individuato in questo report.
              </p>
            </div>

            <a
              href="https://luancerco.it/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3.5 bg-white text-zinc-900 hover:bg-zinc-100 text-sm font-bold rounded-2xl shadow-md transition-all shrink-0 cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-[#e0f1e6]">
                <img
                  src={luancerLogo}
                  alt="Logo Luancer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span>Risolvi su luancerco.it</span>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
