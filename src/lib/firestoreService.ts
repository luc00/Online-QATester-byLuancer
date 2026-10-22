import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase.ts';
import { Project, TestCase, TestRun, Bug, ChatMessage } from '../types/qa.ts';

// 1. PROJECTS
export async function getProjects(userId: string): Promise<Project[]> {
  const collPath = 'projects';
  try {
    const q = query(collection(db, collPath), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Project);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function saveProject(project: Project): Promise<void> {
  const docPath = `projects/${project.id}`;
  try {
    await setDoc(doc(db, 'projects', project.id), project);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const docPath = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// 2. TEST CASES
export async function getTestCases(userId: string, projectId?: string): Promise<TestCase[]> {
  const collPath = 'testCases';
  try {
    let q = query(collection(db, collPath), where('ownerId', '==', userId));
    if (projectId) {
      q = query(collection(db, collPath), where('ownerId', '==', userId), where('projectId', '==', projectId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as TestCase);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function saveTestCase(testCase: TestCase): Promise<void> {
  const docPath = `testCases/${testCase.id}`;
  try {
    await setDoc(doc(db, 'testCases', testCase.id), testCase);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteTestCase(testCaseId: string): Promise<void> {
  const docPath = `testCases/${testCaseId}`;
  try {
    await deleteDoc(doc(db, 'testCases', testCaseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// 3. TEST RUNS
export async function getTestRuns(userId: string, projectId?: string): Promise<TestRun[]> {
  const collPath = 'testRuns';
  try {
    let q = query(collection(db, collPath), where('ownerId', '==', userId));
    if (projectId) {
      q = query(collection(db, collPath), where('ownerId', '==', userId), where('projectId', '==', projectId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as TestRun);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function saveTestRun(testRun: TestRun): Promise<void> {
  const docPath = `testRuns/${testRun.id}`;
  try {
    await setDoc(doc(db, 'testRuns', testRun.id), testRun);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// 4. BUGS / DEFECTS
export async function getBugs(userId: string, projectId?: string): Promise<Bug[]> {
  const collPath = 'bugs';
  try {
    let q = query(collection(db, collPath), where('ownerId', '==', userId));
    if (projectId) {
      q = query(collection(db, collPath), where('ownerId', '==', userId), where('projectId', '==', projectId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Bug);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function saveBug(bug: Bug): Promise<void> {
  const docPath = `bugs/${bug.id}`;
  try {
    await setDoc(doc(db, 'bugs', bug.id), bug);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteBug(bugId: string): Promise<void> {
  const docPath = `bugs/${bugId}`;
  try {
    await deleteDoc(doc(db, 'bugs', bugId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

// 5. CHAT MESSAGES
export async function getChatMessages(userId: string): Promise<ChatMessage[]> {
  const collPath = 'chatMessages';
  try {
    const q = query(collection(db, collPath), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => d.data() as ChatMessage)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collPath);
  }
}

export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  const docPath = `chatMessages/${msg.id}`;
  try {
    await setDoc(doc(db, 'chatMessages', msg.id), msg);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}
