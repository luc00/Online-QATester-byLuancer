import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  Upload,
  Play,
  Bug,
  RefreshCw,
  Crop,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Bug as BugType } from '../types/qa.ts';

interface VisualInspectorViewProps {
  onFileBugFromAnalysis: (bug: Partial<BugType>) => void;
}

export const VisualInspectorView: React.FC<VisualInspectorViewProps> = ({
  onFileBugFromAnalysis,
}) => {
  const [subTab, setSubTab] = useState<'image' | 'video' | 'generate'>('image');

  // --- 1. IMAGE UNDERSTANDING (gemini-4-argon) ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/png');
  const [imageAnalysisPrompt, setImageAnalysisPrompt] = useState(
    'Identify all UI defects, visual layout bugs, alignment miscalculations, font clipping, and contrast violations in this screenshot. Provide a formal QA Defect Report with steps to reproduce and recommended CSS fixes.'
  );
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // --- 2. VIDEO UNDERSTANDING (gemini-4-argon) ---
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [videoMime, setVideoMime] = useState('video/mp4');
  const [videoAnalysisPrompt, setVideoAnalysisPrompt] = useState(
    'Analyze this video screen recording for key information. Provide: 1. Chronological timeline with exact timestamps. 2. Exact timestamp where the bug manifests. 3. Step-by-step reproduction sequence. 4. Root cause diagnosis.'
  );
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // --- 3. ASPECT RATIO IMAGE GENERATION (nano banana / 3-pro) ---
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [modelChoice, setModelChoice] = useState<'gemini-nano-banana-2.1' | 'gemini-3-pro-image'>(
    'gemini-nano-banana-2.1'
  );
  const [genPrompt, setGenPrompt] = useState(
    'High-resolution e-commerce hero banner mockup featuring mobile phones and checkout cart on a sleek neon glass desk, QA test fixture'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImgResult, setGeneratedImgResult] = useState<string | null>(null);

  const aspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMime(file.type || 'image/png');
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setImageAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzingImage(true);
    try {
      const res = await fetch('/api/gemini/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: imageMime,
          prompt: imageAnalysisPrompt,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setImageAnalysisResult(data.analysis);
      } else {
        setImageAnalysisResult(data.error || 'Failed to inspect image.');
      }
    } catch (err: any) {
      setImageAnalysisResult(`Error: ${err.message || 'Server request failed'}`);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoMime(file.type || 'video/mp4');
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedVideo(event.target?.result as string);
        setVideoAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!selectedVideo) return;
    setIsAnalyzingVideo(true);
    try {
      const res = await fetch('/api/gemini/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64: selectedVideo,
          mimeType: videoMime,
          prompt: videoAnalysisPrompt,
        }),
      });
      const data = await res.json();
      if (data.analysis) {
        setVideoAnalysisResult(data.analysis);
      } else {
        setVideoAnalysisResult(data.error || 'Failed to analyze video.');
      }
    } catch (err: any) {
      setVideoAnalysisResult(`Error: ${err.message || 'Server request failed'}`);
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!genPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: genPrompt,
          aspectRatio,
          modelChoice,
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImgResult(data.imageUrl);
      } else {
        alert(data.error || 'Image generation failed');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-900">
      {/* Header and Sub Tabs - White & Minimalist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Visual & Multimodal QA Suite</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              Gemini 4 Argon
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Detect UI layout defects in screenshots, isolate video bug timestamps, and synthesize aspect-ratio test assets.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center p-1 bg-white border border-zinc-200 rounded-xl shadow-2xs">
          <button
            onClick={() => setSubTab('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'image'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Analyze Screenshot</span>
          </button>

          <button
            onClick={() => setSubTab('video')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'video'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Analyze Video</span>
          </button>

          <button
            onClick={() => setSubTab('generate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'generate'
                ? 'bg-zinc-900 text-white shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Aspect Ratio Test Assets</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: SCREENSHOT / IMAGE UNDERSTANDING --- */}
      {subTab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-zinc-700" />
                <span>Upload Screenshot for Visual Inspection</span>
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">gemini-4-argon</span>
            </div>

            <div
              onClick={() => imageInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/70 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]"
            >
              {selectedImage ? (
                <div className="space-y-3">
                  <img
                    src={selectedImage}
                    alt="Uploaded preview"
                    className="max-h-56 mx-auto rounded-lg object-contain border border-zinc-200 shadow-sm"
                  />
                  <p className="text-xs text-zinc-600 font-medium">Click to replace screenshot</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800">
                    Click or drag & drop UI screenshot / defect capture
                  </p>
                  <p className="text-[11px] text-zinc-400">Supports PNG, JPEG, WebP, GIF</p>
                </div>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-600 font-medium block mb-1">
                Visual Inspection Directives
              </label>
              <textarea
                rows={3}
                value={imageAnalysisPrompt}
                onChange={(e) => setImageAnalysisPrompt(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <button
              onClick={handleAnalyzeImage}
              disabled={isAnalyzingImage || !selectedImage}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAnalyzingImage ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting Visual Layout via Gemini 4 Argon...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Visual Defect Analysis</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Visual QA Inspection Report</span>
                </h3>
                {imageAnalysisResult && (
                  <button
                    onClick={() => {
                      onFileBugFromAnalysis({
                        title: 'Visual Regression: Defect identified in screenshot inspection',
                        description: imageAnalysisResult,
                        stepsToReproduce: '1. Inspect UI element displayed in screenshot\n2. Observe styling mismatch',
                        severity: 'medium',
                        priority: 'P2',
                        environment: 'Visual QA / Gemini 4 Argon',
                      });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Bug className="w-3 h-3 text-rose-600" />
                    <span>Log as Defect</span>
                  </button>
                )}
              </div>

              {imageAnalysisResult ? (
                <div className="prose max-w-none text-xs text-zinc-800 space-y-3 leading-relaxed whitespace-pre-line bg-zinc-50 p-4 rounded-xl border border-zinc-200 font-mono">
                  {imageAnalysisResult}
                </div>
              ) : (
                <div className="py-20 text-center text-zinc-400 text-xs">
                  Upload an image and run analysis to inspect UI visual layout bugs, contrast violations, text clipping, and responsive faults.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: VIDEO UNDERSTANDING (gemini-4-argon) --- */}
      {subTab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-zinc-700" />
                <span>Upload Defect Video Recording</span>
              </h3>
              <span className="text-[10px] text-zinc-500 font-mono">gemini-4-argon</span>
            </div>

            <div
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-zinc-50/70 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px]"
            >
              {selectedVideo ? (
                <div className="space-y-3 w-full">
                  <video
                    src={selectedVideo}
                    controls
                    className="max-h-56 mx-auto rounded-lg border border-zinc-200 shadow-sm"
                  />
                  <p className="text-xs text-zinc-600 font-medium">Click to select different video</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center mx-auto">
                    <Video className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-800">
                    Upload screen capture recording (.mp4, .webm)
                  </p>
                  <p className="text-[11px] text-zinc-400">Analyze bug timestamps, reproduction steps, and lag</p>
                </div>
              )}
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-600 font-medium block mb-1">
                Video Analysis Directives
              </label>
              <textarea
                rows={3}
                value={videoAnalysisPrompt}
                onChange={(e) => setVideoAnalysisPrompt(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <button
              onClick={handleAnalyzeVideo}
              disabled={isAnalyzingVideo || !selectedVideo}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAnalyzingVideo ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini 4 Argon Parsing Video Timeline...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Analyze Video Content with Gemini 4 Argon</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Play className="w-4 h-4 text-zinc-700 fill-current" />
                  <span>Video Reproduction & Timeline Breakdown</span>
                </h3>
                {videoAnalysisResult && (
                  <button
                    onClick={() => {
                      onFileBugFromAnalysis({
                        title: 'Video Triage: Timestamped Defect Reproduction',
                        description: videoAnalysisResult,
                        stepsToReproduce: 'Extracted from video reproduction recording',
                        severity: 'high',
                        priority: 'P1',
                        environment: 'Screen Recording / Video QA',
                      });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Bug className="w-3 h-3 text-rose-600" />
                    <span>Log as Defect</span>
                  </button>
                )}
              </div>

              {videoAnalysisResult ? (
                <div className="prose max-w-none text-xs text-zinc-800 space-y-3 leading-relaxed whitespace-pre-line bg-zinc-50 p-4 rounded-xl border border-zinc-200 font-mono">
                  {videoAnalysisResult}
                </div>
              ) : (
                <div className="py-20 text-center text-zinc-400 text-xs">
                  Upload a screen capture recording of an issue to extract timestamps, steps to reproduce, and root causes using Gemini 4 Argon.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: CONTROL IMAGE ASPECT RATIOS (Synthetic QA Test Assets) --- */}
      {subTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Crop className="w-4 h-4 text-zinc-700" />
                <span>Synthetic QA Image Generator with Aspect Ratio Control</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Generate high-fidelity test images for responsive banner testing, avatar fixtures, and UI mockups.
              </p>
            </div>

            <div>
              <label className="text-xs text-zinc-700 font-medium block mb-1">Generator Model</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModelChoice('gemini-nano-banana-2.1')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    modelChoice === 'gemini-nano-banana-2.1'
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  gemini-nano-banana-2.1 (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setModelChoice('gemini-3-pro-image')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    modelChoice === 'gemini-3-pro-image'
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  gemini-3-pro-image (Studio Quality)
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-zinc-700 font-medium">Aspect Ratio Affordance</label>
                <span className="font-mono text-xs font-bold text-zinc-900">{aspectRatio}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {aspectRatios.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-mono font-semibold border transition-all cursor-pointer text-center ${
                      aspectRatio === ratio
                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-700 font-medium block mb-1">Asset Description Prompt</label>
              <textarea
                rows={3}
                value={genPrompt}
                onChange={(e) => setGenPrompt(e.target.value)}
                placeholder="Describe the UI mockup or test asset to generate..."
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={isGenerating || !genPrompt.trim()}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing ({aspectRatio}) Asset via {modelChoice}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Test Asset ({aspectRatio})</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-zinc-700" />
                  <span>Generated Test Asset</span>
                </h3>
                {generatedImgResult && (
                  <span className="text-xs font-mono text-zinc-700 font-semibold">{aspectRatio}</span>
                )}
              </div>

              {generatedImgResult ? (
                <div className="space-y-4">
                  <div className="bg-zinc-50 p-2 rounded-xl border border-zinc-200 flex items-center justify-center">
                    <img
                      src={generatedImgResult}
                      alt="Generated test asset"
                      className="max-h-72 rounded-lg object-contain"
                    />
                  </div>
                  <a
                    href={generatedImgResult}
                    download={`qa-test-asset-${aspectRatio.replace(':', 'x')}.png`}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Download Image</span>
                  </a>
                </div>
              ) : (
                <div className="py-24 text-center text-zinc-400 text-xs">
                  Select an aspect ratio (1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9) and generate synthetic test fixtures for layout QA.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
