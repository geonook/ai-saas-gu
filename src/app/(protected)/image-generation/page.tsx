'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/image-generation/ImageUpload'
import { DrawingCanvas } from '@/components/image-generation/DrawingCanvas'
import { ProductUpload } from '@/components/image-generation/ProductUpload'
import { ImageResult } from '@/components/image-generation/ImageResult'
import { ImageSnapshots } from '@/components/image-generation/ImageSnapshots'
import { VideoGeneration } from '@/components/image-generation/VideoGeneration'
import { VideoResult } from '@/components/image-generation/VideoResult'
import { CropperModal } from '@/components/image-generation/modals/CropperModal'
import { AIModelSelector } from '@/components/image-generation/AIModelSelector'
import { BatchGenerationGrid } from '@/components/image-generation/BatchGenerationGrid'
import { useImageGeneration } from '@/hooks/useImageGeneration'
import { ToastProvider } from '@/components/ui/toast'

export default function ImageGenerationPage() {
  const {
    // State
    mainImageFile,
    productImageFile,
    prompt,
    setPrompt,
    selectedModel,
    setSelectedModel,
    generatedImageBlob,
    isGenerating,
    generationCount,
    setGenerationCount,
    batchJobs,
    activeBatchJobId,
    isBatchGenerating,
    selectBatchResult,
    retryBatchJob,
    cancelBatchGeneration,
    isImageGenerationSuccessful,
    error,
    clearError,
    // Canvas state
    canvasRef,
    drawingCanvasRef,
    // Generation
    generateImage,
    // File handling
    handleMainFile,
    handleProductFile,
    resetProductFile,
    // Result actions
    downloadImage,
    updateGeneratedImage,
    reuseGeneratedImageAsMain,
    // Video state
    videoPrompt,
    setVideoPrompt,
    videoText,
    setVideoText,
    currentTaskId,
    isVideoGenerating,
    isCheckingVideo,
    videoBlob,
    // Video actions
    generateVideo,
    generateVideoAuto,
    checkVideoStatus,
    downloadVideo,
    // Airtable save
    saveToAirtable,
    isSavingToAirtable,
    snapshots,
    activeSnapshotId,
    loadSnapshot,
    deleteSnapshot,
    saveBatchJobToSnapshots,
    saveAllCompletedBatchJobs,
  } = useImageGeneration()

  const [showCropperModal, setShowCropperModal] = useState(false)

  const generationOptions: Array<{ value: 1 | 2 | 4 | 9; label: string; helper: string }> = [
    { value: 1, label: '1 image', helper: 'Single run' },
    { value: 2, label: '2 images', helper: 'Parallel run' },
    { value: 4, label: '4 images', helper: 'Parallel run' },
    { value: 9, label: '9 images', helper: 'Parallel run' },
  ]

  const isBatchMode = generationCount > 1
  const batchInProgress = isGenerating && isBatchGenerating
  const generateButtonLabel = isBatchMode ? `Generate ${generationCount} Variations` : 'Generate Image'

  const isGenerateEnabled = Boolean(mainImageFile && prompt.trim().length > 0)

  return (
    <ToastProvider>
      <div className="max-w-4xl mx-auto px-4 py-10">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-base font-semibold tracking-wide uppercase">
          ❮AI效率革命聯盟❯
        </div>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          BananaDreams V2.1
        </h1>
        <p className="text-muted-foreground mt-2">
          Mix images, perfect your edits, and generate videos - all in one powerful workflow.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button 
            onClick={clearError}
            className="text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Setup Your Assets */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center size-7 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
            1
          </span>
          <h2 className="text-xl font-semibold">Setup Your Assets</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Character Image</p>
            <ImageUpload onFileUpload={handleMainFile} />
            {mainImageFile && (
              <DrawingCanvas 
                canvasRef={canvasRef}
                drawingCanvasRef={drawingCanvasRef}
                imageFile={mainImageFile}
              />
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Product Image <span className="text-xs font-normal text-gray-500">(optional)</span></p>
            <ProductUpload 
              onFileUpload={handleProductFile}
              onReset={resetProductFile}
              imageFile={productImageFile}
            />
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
            <label htmlFor="prompt" className="text-sm font-medium text-black">
              Image Prompt
            </label>
            <AIModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={isGenerating}
              className="sm:ml-4"
            />
          </div>
          <textarea
            id="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full resize-y rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 p-4 text-[15px] text-black"
            placeholder="e.g., The character should naturally hold a Taiwanese-style fried chicken cutlet in their left hand."
          />
        </div>
      </section>

      {/* Step 2: Generate & View Image */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center size-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
            2
          </span>
          <h2 className="text-xl font-semibold">Generate & View Image</h2>
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Variations</p>
          <div className="flex flex-wrap items-center gap-2">
            {generationOptions.map((option) => {
              const isActive = generationCount === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setGenerationCount(option.value)}
                  disabled={isGenerating}
                  className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50/60'
                  } ${isGenerating ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-xs text-gray-500">{option.helper}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Variations generate in parallel—pick the ones you like to add into snapshots.
          </p>
        </div>

        <button
          onClick={generateImage}
          disabled={!isGenerateEnabled || isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-all"
        >
          {isGenerating && (
            <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
            </svg>
          )}
          <span>{generateButtonLabel}</span>
        </button>

        <div className="mt-6">
          <div className="relative">
            {snapshots.length > 0 && (
              <div
                className="hidden lg:flex flex-col gap-4 absolute top-0 left-0 w-[250px]"
                style={{ transform: 'translateX(calc(-100% - 1rem))' }}
              >
                <ImageSnapshots
                  snapshots={snapshots}
                  activeSnapshotId={activeSnapshotId}
                  onSelect={loadSnapshot}
                  onDelete={deleteSnapshot}
                  orientation="vertical"
                />
              </div>
            )}

            <ImageResult
              generatedImageBlob={generatedImageBlob}
              isGenerating={isGenerating}
              onDownload={downloadImage}
              onCrop={() => setShowCropperModal(true)}
              onContinueEditing={reuseGeneratedImageAsMain}
            />
          </div>

          {batchJobs.length > 0 && (
            <BatchGenerationGrid
              jobs={batchJobs}
              isGenerating={batchInProgress}
              activeJobId={activeBatchJobId}
              onSelect={selectBatchResult}
              onRetry={retryBatchJob}
              onCancel={cancelBatchGeneration}
              onSaveBatchToSnapshots={saveBatchJobToSnapshots}
              onSaveAllCompleted={saveAllCompletedBatchJobs}
            />
          )}

          {snapshots.length > 0 && (
            <div className="mt-4 lg:hidden">
              <ImageSnapshots
                snapshots={snapshots}
                activeSnapshotId={activeSnapshotId}
                onSelect={loadSnapshot}
                onDelete={deleteSnapshot}
              />
            </div>
          )}
        </div>
      </section>

      {/* Step 3: Generate Video */}
      {generatedImageBlob && isImageGenerationSuccessful && (
        <VideoGeneration
          videoPrompt={videoPrompt}
          setVideoPrompt={setVideoPrompt}
          videoText={videoText}
          setVideoText={setVideoText}
          onGenerateVideo={generateVideo}
          onGenerateVideoAuto={generateVideoAuto}
          isGenerating={isVideoGenerating}
        />
      )}

      {/* Step 4: Video Result */}
      {currentTaskId && (
        <VideoResult
          taskId={currentTaskId}
          isChecking={isCheckingVideo}
          videoBlob={videoBlob}
          onCheckStatus={checkVideoStatus}
          onDownload={downloadVideo}
          onSaveToAirtable={saveToAirtable}
          isSavingToAirtable={isSavingToAirtable}
        />
      )}

      {/* Cropper Modal */}
      {showCropperModal && generatedImageBlob && (
        <CropperModal
          imageBlob={generatedImageBlob}
          onConfirm={(croppedBlob: Blob) => {
            updateGeneratedImage(croppedBlob)
            setShowCropperModal(false)
          }}
          onCancel={() => setShowCropperModal(false)}
        />
      )}
      </div>
    </ToastProvider>
  )
}
