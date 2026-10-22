import { getAccessToken } from './firebase.ts';
import { TestCase, Bug } from '../types/qa.ts';

// Helper to check authentication
async function getValidToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google to access Google Sheets and Tasks.');
  }
  return token;
}

// ==========================================
// 1. GOOGLE SHEETS INTEGRATION
// ==========================================

export interface ExportToSheetsResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Creates a new Google Spreadsheet and exports Test Cases into it
 */
export async function exportTestCasesToSheets(
  title: string,
  testCases: TestCase[]
): Promise<ExportToSheetsResult> {
  const token = await getValidToken();

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `QA Test Suite: ${title} (${new Date().toLocaleDateString()})`,
      },
      sheets: [
        {
          properties: {
            title: 'Test Cases',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  // 2. Prepare Rows
  const headers = [
    'Test ID',
    'Suite',
    'Title',
    'Type',
    'Priority',
    'Status',
    'Preconditions',
    'Steps',
    'Expected Result',
    'Automated',
    'Updated At',
  ];

  const rows = testCases.map((tc) => [
    tc.id,
    tc.suite,
    tc.title,
    tc.type,
    tc.priority.toUpperCase(),
    tc.status.toUpperCase(),
    tc.preconditions || 'N/A',
    tc.steps,
    tc.expectedResult,
    tc.automated ? 'YES' : 'NO',
    new Date(tc.updatedAt).toLocaleString(),
  ]);

  const values = [headers, ...rows];

  // 3. Append Data
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Test Cases!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json();
    throw new Error(err.error?.message || 'Failed to write rows to Google Spreadsheet');
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Creates a new Google Spreadsheet and exports Bugs/Defects into it
 */
export async function exportBugsToSheets(
  projectName: string,
  bugs: Bug[]
): Promise<ExportToSheetsResult> {
  const token = await getValidToken();

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `QA Defect Tracker: ${projectName} (${new Date().toLocaleDateString()})`,
      },
      sheets: [
        {
          properties: {
            title: 'Defects',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet for defects');
  }

  const spreadsheet = await createRes.json();
  const spreadsheetId = spreadsheet.spreadsheetId;

  const headers = [
    'Bug ID',
    'Title',
    'Severity',
    'Priority',
    'Status',
    'Environment',
    'Description',
    'Steps to Reproduce',
    'Created At',
  ];

  const rows = bugs.map((b) => [
    b.id,
    b.title,
    b.severity.toUpperCase(),
    b.priority,
    b.status.toUpperCase(),
    b.environment || 'QA',
    b.description,
    b.stepsToReproduce,
    new Date(b.createdAt).toLocaleString(),
  ]);

  const values = [headers, ...rows];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Defects!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Reads test cases from an existing Google Spreadsheet ID or URL
 */
export async function importTestCasesFromSheets(spreadsheetIdOrUrl: string): Promise<Partial<TestCase>[]> {
  const token = await getValidToken();

  // Extract ID from URL if full URL is pasted
  let spreadsheetId = spreadsheetIdOrUrl.trim();
  const urlMatch = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    spreadsheetId = urlMatch[1];
  }

  const readRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!readRes.ok) {
    const err = await readRes.json();
    throw new Error(err.error?.message || 'Failed to read Google Spreadsheet. Verify spreadsheet ID & permissions.');
  }

  const data = await readRes.json();
  const rows = data.values || [];
  if (rows.length < 2) {
    return [];
  }

  const headers = rows[0].map((h: string) => h.toLowerCase());
  const titleIdx = headers.findIndex((h: string) => h.includes('title') || h.includes('name'));
  const suiteIdx = headers.findIndex((h: string) => h.includes('suite') || h.includes('module'));
  const stepsIdx = headers.findIndex((h: string) => h.includes('step'));
  const expectedIdx = headers.findIndex((h: string) => h.includes('expected') || h.includes('result'));
  const priorityIdx = headers.findIndex((h: string) => h.includes('priority'));

  const parsedCases: Partial<TestCase>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[titleIdx >= 0 ? titleIdx : 0]) continue;

    parsedCases.push({
      title: titleIdx >= 0 ? row[titleIdx] : row[0] || 'Imported Test Case',
      suite: suiteIdx >= 0 && row[suiteIdx] ? row[suiteIdx] : 'Imported Suite',
      type: 'Functional',
      priority: (priorityIdx >= 0 && ['low', 'medium', 'high', 'critical'].includes(row[priorityIdx]?.toLowerCase())
        ? row[priorityIdx].toLowerCase()
        : 'medium') as any,
      status: 'active',
      preconditions: 'None specified',
      steps: stepsIdx >= 0 && row[stepsIdx] ? row[stepsIdx] : 'Execute test steps',
      expectedResult: expectedIdx >= 0 && row[expectedIdx] ? row[expectedIdx] : 'Passes verification',
      automated: false,
    });
  }

  return parsedCases;
}

// ==========================================
// 2. GOOGLE TASKS INTEGRATION
// ==========================================

export interface GoogleTaskList {
  id: string;
  title: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}

/**
 * Get user's Google Tasks Lists
 */
export async function getGoogleTaskLists(): Promise<GoogleTaskList[]> {
  const token = await getValidToken();

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to retrieve Google Tasks lists');
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Get all tasks from a specific list
 */
export async function getGoogleTasks(taskListId = '@default'): Promise<GoogleTask[]> {
  const token = await getValidToken();

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to retrieve tasks from Google Tasks');
  }

  const data = await res.json();
  return (data.items || []).map((t: any) => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    status: t.status,
    due: t.due,
  }));
}

/**
 * Create a new task in Google Tasks (e.g. from a QA Bug or remediation action)
 */
export async function createGoogleTask(
  taskListId = '@default',
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  const token = await getValidToken();

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create Google Task');
  }

  return await res.json();
}

/**
 * Mark a task completed or update in Google Tasks
 */
export async function updateGoogleTask(
  taskListId = '@default',
  taskId: string,
  updates: Partial<GoogleTask>
): Promise<GoogleTask> {
  const token = await getValidToken();

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to update Google Task');
  }

  return await res.json();
}

/**
 * Delete a Google Task
 */
export async function deleteGoogleTask(
  taskListId = '@default',
  taskId: string
): Promise<void> {
  const token = await getValidToken();

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to delete Google Task');
  }
}
