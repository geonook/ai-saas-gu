'use client'

interface VideoGenerationProps {
  videoPrompt: string
  setVideoPrompt: (prompt: string) => void
  videoText: string
  setVideoText: (text: string) => void
  onGenerateVideo: () => void
  onGenerateVideoAuto: () => void
  isGenerating: boolean
}

const promptSuggestions = [
  '緩慢拉近',
  '緩慢拉遠',
  '向左平移',
  '向右平移',
  '環繞旋轉（半圈即可）',
  '從上往下俯視',
  '手持感抖動（輕微）'
]

export function VideoGeneration({
  videoPrompt,
  setVideoPrompt,
  videoText,
  setVideoText,
  onGenerateVideo,
  onGenerateVideoAuto,
  isGenerating
}: VideoGenerationProps) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center size-7 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
          3
        </span>
        <h2 className="text-xl font-semibold">Generate Video</h2>
      </div>

      <div>
        <label htmlFor="videoPrompt" className="block text-sm font-medium text-gray-700 mb-2">
          Video Prompt
        </label>
        <textarea
          id="videoPrompt"
          rows={3}
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          className="w-full resize-y rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 p-4 text-[15px] text-black"
          placeholder="e.g., a gentle zoom-in, cinematic dolly shot..."
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {promptSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setVideoPrompt(suggestion)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <label htmlFor="videoText" className="block text-sm font-medium text-gray-700 mb-2">
          What the character says (UGC)
        </label>
        <textarea
          id="videoText"
          rows={3}
          value={videoText}
          onChange={(e) => setVideoText(e.target.value)}
          className="w-full resize-y rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 p-4 text-[15px] text-black"
          placeholder="e.g., 'Taiwanese Giant Fried Chicken — crispy, juicy, and packed with irresistible flavor in every bite'"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onGenerateVideo}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 text-white px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-all"
        >
          {isGenerating && (
            <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
            </svg>
          )}
          <span>Generate Video</span>
        </button>
        
        <button
          onClick={onGenerateVideoAuto}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all"
        >
          {isGenerating && (
            <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
            </svg>
          )}
          <span>Generate Video (Auto Mode)</span>
        </button>
      </div>
    </section>
  )
}