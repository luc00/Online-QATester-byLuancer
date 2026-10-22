import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  BrainCircuit,
  Zap,
  Code,
  Shield,
  Trash2,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { ChatMessage } from '../types/qa.ts';

interface CopilotChatViewProps {
  chatMessages: ChatMessage[];
  onSendMessage: (msg: ChatMessage) => Promise<void>;
  onClearHistory: () => void;
  userId: string;
}

export const CopilotChatView: React.FC<CopilotChatViewProps> = ({
  chatMessages,
  onSendMessage,
  onClearHistory,
  userId,
}) => {
  const [inputText, setInputText] = useState('');
  const [qaRole, setQaRole] = useState<'lead' | 'generator' | 'triage' | 'automation'>('lead');
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-4-argon'>(
    'gemini-3.8-flash'
  );
  const [enableHighThinking, setEnableHighThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `chat-${Date.now()}`,
      role: 'user',
      text: inputText.trim(),
      qaRole,
      modelName: selectedModel,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    };

    setInputText('');
    await onSendMessage(userMessage);

    setIsLoading(true);
    try {
      const historyToSend = [...chatMessages, userMessage].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend,
          qaRole,
          modelName: selectedModel,
          enableHighThinking: enableHighThinking && selectedModel === 'gemini-4-argon',
        }),
      });

      const data = await res.json();
      const modelReplyText = data.reply || data.error || 'No response returned from model.';

      const modelMessage: ChatMessage = {
        id: `chat-${Date.now() + 1}`,
        role: 'model',
        text: modelReplyText,
        qaRole,
        modelName: data.modelUsed || selectedModel,
        ownerId: userId,
        createdAt: new Date().toISOString(),
      };

      await onSendMessage(modelMessage);
    } catch (err: any) {
      const errMessage: ChatMessage = {
        id: `chat-${Date.now() + 1}`,
        role: 'model',
        text: `Error communicating with QA Copilot: ${err.message || 'Server error'}`,
        qaRole,
        modelName: selectedModel,
        ownerId: userId,
        createdAt: new Date().toISOString(),
      };
      await onSendMessage(errMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { id: 'lead', label: 'QA Lead & Strategist', desc: 'Test plans, risk analysis & coverage matrices' },
    { id: 'generator', label: 'BDD & Test Generator', desc: 'Equivalence partitions & Given-When-Then' },
    { id: 'triage', label: 'Root Cause & Triage', desc: 'Stack traces, network bugs & failure reproduction' },
    { id: 'automation', label: 'Automation Architect', desc: 'Playwright, Cypress, and Jest scripts' },
  ];

  return (
    <div className="flex flex-col h-[78vh] bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs text-zinc-900">
      {/* Top Configuration Toolbar - White Minimalist */}
      <div className="bg-white border-b border-zinc-100 p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Role Selector */}
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-zinc-700" />
          <span className="text-xs text-zinc-500 font-medium">Role:</span>
          <select
            value={qaRole}
            onChange={(e) => setQaRole(e.target.value as any)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900 font-semibold"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model Selection and High Thinking toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 bg-zinc-100 rounded-xl border border-zinc-200">
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Fast tasks"
            >
              3.1 Flash-Lite
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.8-flash')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                selectedModel === 'gemini-3.8-flash'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="General QA tasks"
            >
              3.8 Flash
            </button>
            <button
              onClick={() => setSelectedModel('gemini-4-argon')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                selectedModel === 'gemini-4-argon'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Complex QA reasoning"
            >
              4 Argon
            </button>
          </div>

          {selectedModel === 'gemini-4-argon' && (
            <label className="flex items-center gap-1.5 text-xs text-purple-700 cursor-pointer bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl">
              <input
                type="checkbox"
                checked={enableHighThinking}
                onChange={(e) => setEnableHighThinking(e.target.checked)}
                className="rounded border-purple-300 text-purple-600 focus:ring-0"
              />
              <span className="font-semibold text-[10px]">Thinking High</span>
            </label>
          )}

          <button
            onClick={onClearHistory}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message Thread (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-zinc-50/50">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">AI QA Engineering Copilot</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Multi-turn testing assistant powered by Gemini. Ask to generate edge cases, design test matrices, triage error logs, or create Playwright code.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full pt-2">
              {[
                'Design a boundary-value test matrix for a credit card input field.',
                'Generate Playwright automation script with page object model for user login.',
                'What are common race conditions in shopping cart checkout and how do we test them?',
              ].map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(qp)}
                  className="text-left p-2.5 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 text-xs border border-zinc-200 shadow-2xs transition-colors cursor-pointer"
                >
                  "{qp}"
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-white text-zinc-700 border border-zinc-200 shadow-2xs'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-zinc-900 text-white shadow-2xs rounded-tr-none'
                    : 'bg-white border border-zinc-200 text-zinc-800 shadow-2xs rounded-tl-none'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-zinc-100 text-[10px] text-zinc-400 font-mono">
                    <span className="font-semibold text-zinc-700">QA Copilot</span>
                    <span>•</span>
                    <span>{msg.modelName || selectedModel}</span>
                  </div>
                )}
                <div className="whitespace-pre-line font-mono text-[11px]">{msg.text}</div>
                <div
                  className={`text-[9px] mt-1 text-right ${
                    isUser ? 'text-zinc-400' : 'text-zinc-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-zinc-500 flex items-center gap-2 shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-600" />
              <span>QA Copilot is formulating test recommendations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-zinc-100 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask ${roles.find((r) => r.id === qaRole)?.label}...`}
          className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
