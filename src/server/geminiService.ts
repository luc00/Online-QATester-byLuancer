import { Router, Request, Response } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const router = Router();

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// 1. Multi-turn Chat Endpoint with specific QA role system instruction and model selection
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, qaRole, modelName, enableHighThinking } = req.body;
    const ai = getGenAI();

    // Map model based on guidelines
    // Allowed: gemini-4-argon (complex), gemini-3.8-flash (general), gemini-3.1-flash-lite (fast)
    let selectedModel = modelName || 'gemini-3.8-flash';
    if (!['gemini-4-argon', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'].includes(selectedModel)) {
      selectedModel = 'gemini-3.8-flash';
    }

    let roleInstruction = `You are an elite QA Engineer and Quality Assurance Lead expert.`;
    if (qaRole === 'generator') {
      roleInstruction = `You are a Senior Test Case Architect. Specialise in boundary value analysis, equivalence partitioning, state transition, and BDD Gherkin scenarios (Given-When-Then). Generate clear, reproducible, industry-standard test cases with step-by-step instructions and measurable expected results.`;
    } else if (qaRole === 'triage') {
      roleInstruction = `You are a Principal Defect Triage & Root Cause Analysis Specialist. Analyze stack traces, network payloads, server logs, and user steps. Pinpoint root causes, regression impacts, reproduction reliability, and suggest immediate remediation steps.`;
    } else if (qaRole === 'automation') {
      roleInstruction = `You are a Test Automation Architect expert in Playwright, Cypress, Jest, and Postman. Provide robust, resilient automation scripts using Page Object Models, explicit assertions, and anti-flakiness patterns.`;
    } else {
      roleInstruction = `You are a Lead QA Engineer advising on test strategy, test matrix design, security testing, performance verification, and test execution management.`;
    }

    const contents = (messages || []).map((m: { role: string; text: string }) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    const config: any = {
      systemInstruction: roleInstruction,
    };

    if (enableHighThinking && selectedModel === 'gemini-4-argon') {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
      // Do NOT set maxOutputTokens with thinkingLevel.HIGH
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    res.json({
      reply: response.text || 'No response generated.',
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ error: error.message || 'Failed to process chat request' });
  }
});

// 2. Image Analysis using gemini-4-argon
router.post('/analyze-image', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required.' });
    }

    const ai = getGenAI();
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/png',
        data: cleanBase64,
      },
    };

    const userPrompt = prompt || `You are an expert QA Visual Inspector. Inspect this screenshot / image for:
1. UI Layout bugs, visual regressions, misalignments, overflowing or truncated text, broken styling.
2. Contrast or accessibility failures.
3. Functional or modal error states displayed.
4. Provide a structured QA Defect Report with:
- Bug Summary
- Severity & Priority
- Steps to Reproduce
- Expected vs Actual Visual Result
- Recommended CSS / UI Fix.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [imagePart, { text: userPrompt }],
      },
    });

    res.json({
      analysis: response.text,
      modelUsed: 'gemini-4-argon',
    });
  } catch (error: any) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze image' });
  }
});

// 3. Aspect Ratio Image Generation for QA mockups/test assets using gemini-nano-banana-2.1 or gemini-3-pro-image
router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio, modelChoice } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGenAI();
    const selectedModel = modelChoice === 'gemini-3-pro-image' ? 'gemini-3-pro-image' : 'gemini-nano-banana-2.1';

    // Supported aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9
    const validRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9', '1:4', '1:8', '4:1', '8:1'];
    const targetAspectRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: targetAspectRatio,
          imageSize: '1K',
        },
      },
    });

    let generatedImageUrl = '';
    let responseText = '';

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/png';
        generatedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        responseText += part.text;
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ error: 'No image data returned from model', responseText });
    }

    res.json({
      imageUrl: generatedImageUrl,
      aspectRatio: targetAspectRatio,
      modelUsed: selectedModel,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

// 4. Video Content Analysis using gemini-4-argon
router.post('/analyze-video', async (req: Request, res: Response) => {
  try {
    const { videoBase64, mimeType, prompt } = req.body;
    if (!videoBase64) {
      return res.status(400).json({ error: 'videoBase64 is required.' });
    }

    const ai = getGenAI();
    const cleanBase64 = videoBase64.replace(/^data:[^;]+;base64,/, '');

    const videoPart = {
      inlineData: {
        mimeType: mimeType || 'video/mp4',
        data: cleanBase64,
      },
    };

    const userPrompt = prompt || `You are an expert QA Engineer analyzing a video screen recording of a software bug or user testing session.
Please provide:
1. Chronological Timeline of events with exact timestamps (e.g. 00:03 - user clicks button, 00:07 - spinner hangs).
2. Bug Occurrence Point: At which exact timestamp did the failure or unexpected behavior manifest?
3. Step-by-Step Reproduction Procedure deduced from the video.
4. Root Cause Hypothesis & Network/UI latency observation.
5. Severity Assessment (Critical / High / Medium / Low).`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: {
        parts: [videoPart, { text: userPrompt }],
      },
    });

    res.json({
      analysis: response.text,
      modelUsed: 'gemini-4-argon',
    });
  } catch (error: any) {
    console.error('Video analysis error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze video' });
  }
});

// 5. High Thinking Deep Analysis using gemini-4-argon with thinkingLevel: ThinkingLevel.HIGH
router.post('/deep-thinking', async (req: Request, res: Response) => {
  try {
    const { problemStatement, logs, architectureContext } = req.body;
    if (!problemStatement) {
      return res.status(400).json({ error: 'problemStatement is required.' });
    }

    const ai = getGenAI();

    const promptText = `Conduct a deep, exhaustive QA reasoning analysis on the following complex technical testing issue:

PROBLEM STATEMENT:
${problemStatement}

${logs ? `DIAGNOSTIC LOGS / PAYLOADS:\n${logs}\n` : ''}
${architectureContext ? `SYSTEM CONTEXT:\n${architectureContext}\n` : ''}

REQUIRED OUTPUT SECTIONS:
1. Executive Technical Summary & Failure Mechanism
2. Mathematical / Logic Race Condition & Boundary Edge Analysis
3. Multi-Component Ripple Effect & State Corruption Risks
4. Exhaustive Test Matrix (Edge cases, malicious payloads, concurrency loads)
5. Architectural Remediation & Code-Level Safeguards`;

    // MUST use gemini-4-argon and set thinkingLevel to ThinkingLevel.HIGH. Do not set maxOutputTokens.
    const response = await ai.models.generateContent({
      model: 'gemini-4-argon',
      contents: [{ text: promptText }],
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    res.json({
      analysis: response.text,
      modelUsed: 'gemini-4-argon (ThinkingLevel.HIGH)',
    });
  } catch (error: any) {
    console.error('Deep thinking error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete deep thinking analysis' });
  }
});

// 6. Automated Test Case & BDD Suite Generator
router.post('/generate-test-cases', async (req: Request, res: Response) => {
  try {
    const { featureDescription, suiteName, framework } = req.body;
    if (!featureDescription) {
      return res.status(400).json({ error: 'featureDescription is required.' });
    }

    const ai = getGenAI();

    const prompt = `You are a Lead QA Test Engineer. Generate 4 to 6 comprehensive test cases for the feature: "${featureDescription}" in suite "${suiteName || 'General'}".
Include positive paths, negative edge cases, validation boundaries, and security considerations.

Return pure JSON matching this exact structure:
[
  {
    "title": "Short descriptive test case title",
    "suite": "${suiteName || 'General'}",
    "type": "Functional" | "UI/UX" | "API" | "Security" | "Performance",
    "priority": "low" | "medium" | "high" | "critical",
    "status": "active",
    "preconditions": "Required state before execution",
    "steps": "1. Step one\\n2. Step two\\n3. Step three",
    "expectedResult": "Clear verifiable outcome",
    "automated": ${framework ? 'true' : 'false'},
    "codeSnippet": "Playwright or Gherkin script if applicable"
  }
]
Output ONLY valid JSON. No markdown ticks, no commentary.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
    });

    const raw = response.text || '[]';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = [];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = [];
    }

    res.json({
      testCases: parsed,
      rawText: response.text,
    });
  } catch (error: any) {
    console.error('Generate test cases error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate test cases' });
  }
});

// 7. Automated Bug Severity & Priority Classifier using Gemini
router.post('/suggest-severity', async (req: Request, res: Response) => {
  try {
    const { title, description, stepsToReproduce, environment } = req.body;
    if (!description && !title) {
      return res.status(400).json({ error: 'Title or description is required for severity analysis.' });
    }

    const ai = getGenAI();

    const prompt = `You are a Principal QA Defect Triage Specialist. Analyze this bug report and classify its severity and priority accurately.

BUG TITLE: ${title || 'N/A'}
DESCRIPTION: ${description || 'N/A'}
STEPS TO REPRODUCE: ${stepsToReproduce || 'N/A'}
ENVIRONMENT: ${environment || 'N/A'}

SEVERITY CRITERIA:
- critical: System crash, data loss, security compromise, payment failure, core feature completely blocked with no workaround.
- high: Major feature broken, financial miscalculation, severe performance degradation, affects many users with difficult workaround.
- medium: Non-critical feature malfunction, cosmetic/layout defect affecting usability, edge-case failure with reasonable workaround.
- low: Minor cosmetic defect, typo, slight alignment inconsistency, negligible user impact.

PRIORITY CRITERIA:
- P0: Blocker - stop-the-line immediate fix.
- P1: High - urgent fix required in next build.
- P2: Medium - normal sprint schedule.
- P3: Low - backlogged / cosmetic.

Respond ONLY with valid JSON in this exact structure:
{
  "severity": "critical" | "high" | "medium" | "low",
  "priority": "P0" | "P1" | "P2" | "P3",
  "rationale": "Brief 1-2 sentence explanation of why this severity and priority was assigned."
}
No markdown backticks, no extra text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
    });

    const raw = response.text || '{}';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    let result = { severity: 'medium', priority: 'P2', rationale: 'Standard defect classification.' };
    try {
      result = JSON.parse(cleaned);
    } catch {
      // fallback
    }

    res.json(result);
  } catch (error: any) {
    console.error('Suggest severity error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze severity' });
  }
});

// 8. Full Website QA Auditor: Bugs, Violations, Missing Elements, Recommendations, and Problem Predictions
router.post('/website-audit', async (req: Request, res: Response) => {
  try {
    const { url, description, htmlSnippet, screenshotBase64, mimeType } = req.body;

    if (!url && !description && !htmlSnippet && !screenshotBase64) {
      return res.status(400).json({
        error: 'Fornisci almeno un URL, uno screenshot, uno snippet HTML o una descrizione del sito da analizzare.',
      });
    }

    const ai = getGenAI();

    // Optionally attempt a fast server-side HTML/headers fetch if URL provided
    let fetchedHtml = '';
    let fetchedStatus = '';
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Online-QA-Tester-Auditor/1.0',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
        clearTimeout(timeoutId);
        fetchedStatus = `HTTP Status: ${resp.status} ${resp.statusText}`;
        const text = await resp.text();
        // take first 15000 chars of HTML to inspect title, meta, structure
        fetchedHtml = text.slice(0, 15000);
      } catch (e: any) {
        fetchedStatus = `Note: direct server fetch returned "${e.message}", relying on DOM snippet, screenshots and contextual analysis.`;
      }
    }

    const promptText = `Sei un Lead Principal QA Auditor e Software Quality Assurance Specialist di livello mondiale.
Il tuo compito principale in questo QA Tester è eseguire un'ispezione approfondita e rigorosa per trovare:
1. BUG O DIFETTI DI QUALSIASI TIPO (layout, visuali, rotture responsive, pulsanti non funzionanti, overflow, z-index, errori logici o console).
2. VIOLAZIONI (normative WCAG 2.1/2.2 per l'accessibilità, conformità GDPR/Cookie/Privacy, problemi di sicurezza HTTPS/CSP/input, standard web e SEO).
3. COSE MANCANTI (CTA chiare mancanti, validazioni dei form o messaggi di errore assenti, stati di loading/empty mancanti, attributi alt delle immagini, meta tag essenziali, contatti o note legali assenti).
4. CONSIGLI PRATICI (ottimizzazioni UX e usabilità, conversion rate optimization CRO, prestazioni e velocità, leggibilità e gerarchia visiva).
5. PREVISIONE DI PROBLEMI (scenari di rischio futuro: picchi di traffico, connessioni mobili 3G/lente, rottura su schermi piccoli < 380px, race conditions con chiamate API asincrone, incompatibilità browser Safari iOS vs Chrome).

TARGET AUDIT:
${url ? `URL DEL SITO: ${url}\n` : ''}
${fetchedStatus ? `STATO CONNESSIONE: ${fetchedStatus}\n` : ''}
${description ? `DESCRIZIONE E OBIETTIVI DEL SITO:\n${description}\n` : ''}
${htmlSnippet ? `SNIPPET CODICE / DOM:\n${htmlSnippet}\n` : ''}
${fetchedHtml ? `ESTRATTO HTML SITO:\n${fetchedHtml}\n` : ''}

IMPORTANTE: Se l'utente ha fornito un'immagine/screenshot, analizzala pixel per pixel identificando difetti visivi, elementi disallineati, contrasti scarsi, testi troncati, e spaziature non omogenee.

Genera un report rigoroso e pratico in lingua ITALIANA. Rispondi ESCLUSIVAMENTE con un oggetto JSON valido strutturato esattamente come segue (senza backticks markdown, senza testo introduttivo o conclusivo):
{
  "qualityScore": 78,
  "grade": "B",
  "executiveSummary": "Sintesi esecutiva in 2-3 frasi sullo stato qualitativo complessivo del sito, evidenziando i punti più critici.",
  "bugs": [
    {
      "id": "bug-1",
      "title": "Titolo chiaro del bug",
      "type": "layout" | "functional" | "visual" | "logic" | "performance",
      "severity": "critical" | "high" | "medium" | "low",
      "description": "Descrizione tecnica dettagliata del difetto",
      "stepsToReproduce": "1. Apri la pagina\\n2. Riduci la larghezza della finestra o clicca sul componente\\n3. Osserva l'anomalia",
      "location": "Header / Form di contatto / Footer / Griglia prodotti",
      "solution": "Fix tecnico o CSS consigliato"
    }
  ],
  "violations": [
    {
      "id": "viol-1",
      "title": "Titolo della violazione riscontrata",
      "category": "WCAG Accessibilità" | "Privacy & GDPR" | "Sicurezza & HTTPS" | "Standard Web & SEO",
      "severity": "critical" | "high" | "medium",
      "standard": "es. WCAG 2.1 AA 1.4.3 (Contrasto minimo) oppure GDPR Art. 7 o CSP mancante",
      "description": "Dettaglio della violazione rilevata",
      "remediation": "Come sanare la violazione in modo conforme"
    }
  ],
  "missingElements": [
    {
      "id": "miss-1",
      "title": "Elemento, stato o componente mancante",
      "category": "Call to Action (CTA)" | "Validazione Form" | "Meta & SEO / OpenGraph" | "Stati di Caricamento/Errore" | "Trasparenza & Legale",
      "importance": "essential" | "recommended" | "optional",
      "description": "Perché questo elemento è indispensabile e cosa manca esattamente",
      "suggestedMarkup": "Esempio sintetico di markup HTML, attributo o validazione da aggiungere"
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Consiglio pratico di miglioramento",
      "category": "UX & Usabilità" | "Conversione (CRO)" | "Velocità & Performance" | "Esperienza Mobile" | "Tipografia & Gerarchia",
      "impact": "high" | "medium" | "low",
      "advice": "Spiegazione concreta del consiglio e come implementarlo",
      "expectedBenefit": "Beneficio atteso su usabilità, engagement o conversioni"
    }
  ],
  "problemPredictions": [
    {
      "id": "pred-1",
      "title": "Previsione di potenziale malfunzionamento futuro",
      "riskLevel": "high" | "medium" | "low",
      "scenario": "Scenario in cui si manifesterà il problema (es. picco promozionale, schermo iPhone SE, offline transitorio)",
      "potentialFailure": "Cosa rischia di rompersi o come fallirà l'esperienza utente",
      "preventativeAction": "Azione preventiva o test di carico da implementare prima del rilascio"
    }
  ]
}`;

    const parts: any[] = [];
    if (screenshotBase64) {
      const cleanBase64 = screenshotBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: promptText });

    const modelToUse = screenshotBase64 ? 'gemini-4-argon' : 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: { parts },
    });

    const raw = response.text || '{}';
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedResult: any = null;
    try {
      parsedResult = JSON.parse(cleaned);
    } catch {
      // Fallback extract JSON between { and }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        try {
          parsedResult = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        } catch (e2) {
          console.error('Fallback JSON parsing failed:', e2);
        }
      }
    }

    if (!parsedResult) {
      return res.status(500).json({
        error: 'Impossibile formattare la risposta dell\'audit. Riprova con parametri differenti.',
        raw: response.text,
      });
    }

    // Ensure all 5 arrays exist
    parsedResult.id = `audit-${Date.now()}`;
    parsedResult.targetUrl = url;
    parsedResult.targetDescription = description;
    parsedResult.analyzedAt = new Date().toISOString();
    parsedResult.bugs = parsedResult.bugs || [];
    parsedResult.violations = parsedResult.violations || [];
    parsedResult.missingElements = parsedResult.missingElements || [];
    parsedResult.recommendations = parsedResult.recommendations || [];
    parsedResult.problemPredictions = parsedResult.problemPredictions || [];
    parsedResult.qualityScore = typeof parsedResult.qualityScore === 'number' ? parsedResult.qualityScore : 75;
    parsedResult.grade = parsedResult.grade || 'B';

    res.json(parsedResult);
  } catch (error: any) {
    console.error('Website audit error:', error);
    res.status(500).json({ error: error.message || 'Errore durante l\'esecuzione dell\'audit del sito' });
  }
});

export default router;
