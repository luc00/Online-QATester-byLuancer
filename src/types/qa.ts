export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type BugPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TestCaseStatus = 'draft' | 'active' | 'deprecated';
export type TestRunStatus = 'in_progress' | 'completed';
export type TestResultStatus = 'passed' | 'failed' | 'blocked' | 'skipped';

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  title: string;
  suite: string;
  type: string; // 'Functional' | 'UI/UX' | 'API' | 'Security' | 'Performance'
  priority: Priority;
  status: TestCaseStatus;
  preconditions: string;
  steps: string;
  expectedResult: string;
  automated: boolean;
  codeSnippet?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRun {
  id: string;
  projectId: string;
  title: string;
  environment: string; // 'Production' | 'Staging' | 'Dev' | 'QA'
  status: TestRunStatus;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  executedBy?: string;
  durationSeconds?: number;
  formattedDuration?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRunResult {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: TestResultStatus;
  actualResult: string;
  notes?: string;
  executedAt: string;
  executedBy: string;
}

export interface Bug {
  id: string;
  projectId: string;
  testRunId?: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  environment?: string;
  visualArtifactUrl?: string;
  videoAnalysisNotes?: string;
  linkedTaskId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  qaRole?: 'lead' | 'generator' | 'triage' | 'automation';
  modelName?: string;
  ownerId?: string;
  createdAt: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  notes?: string;
  due?: string;
}

// 5-Pillar Website QA Audit Types
export interface AuditBug {
  id: string;
  title: string;
  type: 'layout' | 'functional' | 'visual' | 'logic' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  stepsToReproduce: string;
  location: string;
  solution: string;
}

export interface AuditViolation {
  id: string;
  title: string;
  category: 'WCAG Accessibilità' | 'Privacy & GDPR' | 'Sicurezza & HTTPS' | 'Standard Web & SEO';
  severity: 'critical' | 'high' | 'medium';
  standard: string; // e.g. "WCAG 2.1 AA 1.4.3", "GDPR Art. 7", "OWASP Top 10"
  description: string;
  remediation: string;
}

export interface AuditMissingElement {
  id: string;
  title: string;
  category: 'Call to Action (CTA)' | 'Validazione Form' | 'Meta & SEO / OpenGraph' | 'Stati di Caricamento/Errore' | 'Trasparenza & Legale';
  importance: 'essential' | 'recommended' | 'optional';
  description: string;
  suggestedMarkup: string;
}

export interface AuditRecommendation {
  id: string;
  title: string;
  category: 'UX & Usabilità' | 'Conversione (CRO)' | 'Velocità & Performance' | 'Esperienza Mobile' | 'Tipografia & Gerarchia';
  impact: 'high' | 'medium' | 'low';
  advice: string;
  expectedBenefit: string;
}

export interface AuditProblemPrediction {
  id: string;
  title: string;
  riskLevel: 'high' | 'medium' | 'low';
  scenario: string; // e.g. "Picco di traffico o connessione 3G lenta", "Risoluzione mobile < 375px"
  potentialFailure: string;
  preventativeAction: string;
}

export interface WebsiteAuditReport {
  id: string;
  targetUrl?: string;
  targetDescription?: string;
  analyzedAt: string;
  qualityScore: number; // 0 to 100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  executiveSummary: string;
  bugs: AuditBug[];
  violations: AuditViolation[];
  missingElements: AuditMissingElement[];
  recommendations: AuditRecommendation[];
  problemPredictions: AuditProblemPrediction[];
}
