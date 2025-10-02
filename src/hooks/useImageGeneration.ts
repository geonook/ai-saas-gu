'use client'

import { useState, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_IMAGE_GENERATION_WEBHOOK_URL || "https://n8n.guccidgi.com/webhook/nano-banana"

const SNAPSHOT_LIMIT = 15
const BATCH_DELAY_MS = 300

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

type GenerationCountOption = 1 | 2 | 4 | 9

export type GenerationJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface GenerationJob {
  id: string
  variationLabel: string
  status: GenerationJobStatus
  result?: Blob
  error?: string
  startedAt?: number
  finishedAt?: number
  savedToSnapshot?: boolean
}

export interface GenerationSnapshot {
  id: string
  blob: Blob
  prompt: string
  videoPrompt: string
  videoText: string
  selectedModel: string
  createdAt: number
  sourceJobId?: string
  batchGroupId?: string
  batchGroupSize?: number
  batchIndex?: number
}

interface UseImageGenerationReturn {
  // State
  mainImageFile: File | null
  productImageFile: File | null
  prompt: string
  setPrompt: (prompt: string) => void
  selectedModel: string
  setSelectedModel: (model: string) => void
  generatedImageBlob: Blob | null
  isGenerating: boolean
  isImageGenerationSuccessful: boolean
  error: string | null
  clearError: () => void
  resetAll: () => void
  generationCount: GenerationCountOption
  setGenerationCount: (count: GenerationCountOption) => void
  batchJobs: GenerationJob[]
  activeBatchJobId: string | null
  isBatchGenerating: boolean
  selectBatchResult: (jobId: string) => void
  retryBatchJob: (jobId: string) => Promise<void>
  cancelBatchGeneration: () => void
  
  // Canvas refs
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>
  
  // Generation
  generateImage: () => Promise<void>
  
  // File handling
  handleMainFile: (file: File) => void
  handleProductFile: (file: File) => void
  resetProductFile: () => void
  
  // Result actions
  downloadImage: () => void
  cropImage: () => void
  updateGeneratedImage: (blob: Blob) => void
  reuseGeneratedImageAsMain: () => void
  
  // Video state
  videoPrompt: string
  setVideoPrompt: (prompt: string) => void
  videoText: string
  setVideoText: (text: string) => void
  currentTaskId: string | null
  isVideoGenerating: boolean
  isCheckingVideo: boolean
  videoBlob: Blob | null
  
  // Video actions
  generateVideo: () => Promise<void>
  generateVideoAuto: () => Promise<void>
  checkVideoStatus: () => Promise<void>
  downloadVideo: () => void
  resetVideoPreview: () => void
  
  // Airtable save
  saveToAirtable: () => Promise<void>
  isSavingToAirtable: boolean
  generatedImageUrl: string | null
  generatedVideoUrl: string | null

  // Snapshots
  snapshots: GenerationSnapshot[]
  activeSnapshotId: string | null
  loadSnapshot: (snapshotId: string) => void
  deleteSnapshot: (snapshotId: string) => void
  saveBatchJobToSnapshots: (jobIds: string[]) => void
  saveAllCompletedBatchJobs: () => void
}

export function useImageGeneration(): UseImageGenerationReturn {
  // State
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [productImageFile, setProductImageFile] = useState<File | null>(null)
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('nano-banana')
  const [generatedImageBlob, setGeneratedImageBlob] = useState<Blob | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImageGenerationSuccessful, setIsImageGenerationSuccessful] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<GenerationSnapshot[]>([])
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null)
  const [generationCountState, setGenerationCountState] = useState<GenerationCountOption>(1)
  const [batchJobs, setBatchJobs] = useState<GenerationJob[]>([])
  const [activeBatchJobId, setActiveBatchJobId] = useState<string | null>(null)
  const [isBatchGenerating, setIsBatchGenerating] = useState(false)
  const batchControllersRef = useRef<Map<string, AbortController>>(new Map())
  const batchCancelledRef = useRef(false)
  const activeBatchJobIdRef = useRef<string | null>(null)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null)
  
  // Video state
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoText, setVideoText] = useState('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [isVideoGenerating, setIsVideoGenerating] = useState(false)
  const [isCheckingVideo, setIsCheckingVideo] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)

  // Airtable save state
  const [isSavingToAirtable, setIsSavingToAirtable] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null)

  // Toast notifications
  const { infoToast, successToast, errorToast } = useToast()

  // Utils
  const showError = useCallback((message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }, [])

  const clearError = () => setError(null)

  // Reset video preview state (helper function)
  const resetVideoPreview = useCallback(() => {
    setCurrentTaskId(null)
    setIsVideoGenerating(false)
    setIsCheckingVideo(false)
    setVideoBlob(null)
  }, [])

  const clearBatchState = useCallback(() => {
    batchControllersRef.current.forEach((controller) => controller.abort())
    batchControllersRef.current.clear()
    batchCancelledRef.current = false
    setBatchJobs([])
    setIsBatchGenerating(false)
    setActiveBatchJobId(null)
    activeBatchJobIdRef.current = null
  }, [])

  const handleSetGenerationCount = useCallback((count: GenerationCountOption) => {
    setGenerationCountState(count)
    if (count === 1) {
      clearBatchState()
    }
  }, [clearBatchState])

  // Reset all states to initial values
  const resetAll = useCallback(() => {
    setMainImageFile(null)
    setProductImageFile(null)
    setPrompt('')
    setSelectedModel('nano-banana')
    setGeneratedImageBlob(null)
    setIsGenerating(false)
    setIsImageGenerationSuccessful(false)
    setError(null)
    setVideoPrompt('')
    setVideoText('')
    setSnapshots([])
    setActiveSnapshotId(null)
    resetVideoPreview()
    clearBatchState()
    setGenerationCountState(1)
  }, [resetVideoPreview, clearBatchState])

  // Custom setPrompt that resets generation state
  const handleSetPrompt = useCallback((newPrompt: string) => {
    setPrompt(newPrompt)
    // Reset generation state when prompt changes significantly
    if (newPrompt !== prompt) {
      setIsImageGenerationSuccessful(false)
    }
  }, [prompt])

  const validateFile = useCallback((file: File): boolean => {
    const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    const MAX_SIZE_MB = 10
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
    
    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showError(`Unsupported file type "${file.type}". Please use: ${ACCEPTED_TYPES.join(', ')}`)
      return false
    }
    
    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      const actualSizeMB = Math.round(file.size / (1024 * 1024) * 100) / 100
      showError(`File too large (${actualSizeMB}MB). Maximum size is ${MAX_SIZE_MB}MB.`)
      return false
    }
    
    // Validate minimum file size (avoid empty/corrupted files)
    if (file.size < 1024) {
      showError("File appears to be empty or corrupted.")
      return false
    }
    
    return true
  }, [showError])

  const canvasToBlob = useCallback((canvas: HTMLCanvasElement, type = "image/png", quality = 0.95): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create blob from canvas'))
          }
        }, type, quality)
      } catch (error) {
        reject(new Error(`Canvas to blob conversion failed: ${error}`))
      }
    })
  }, [])

  const getSimplifiedRatio = (width: number, height: number): string => {
    if (!width || !height) return "1:1"
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
    const divisor = gcd(width, height)
    return `${width / divisor}:${height / divisor}`
  }

  const createSnapshotId = useCallback(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }, [])

  const addSnapshot = useCallback((blob: Blob, sourceJobId?: string, batchGroupId?: string, batchGroupSize?: number, batchIndex?: number) => {
    const snapshot: GenerationSnapshot = {
      id: createSnapshotId(),
      blob,
      prompt: prompt.trim(),
      videoPrompt: videoPrompt.trim(),
      videoText: videoText.trim(),
      selectedModel,
      createdAt: Date.now(),
      sourceJobId,
      batchGroupId,
      batchGroupSize,
      batchIndex,
    }

    setSnapshots((prev) => {
      const nextSnapshots = [snapshot, ...prev]
      if (nextSnapshots.length > SNAPSHOT_LIMIT) {
        return nextSnapshots.slice(0, SNAPSHOT_LIMIT)
      }
      return nextSnapshots
    })
    setActiveSnapshotId(snapshot.id)
  }, [createSnapshotId, prompt, videoPrompt, videoText, selectedModel])

  const loadSnapshot = useCallback((snapshotId: string) => {
    const snapshot = snapshots.find((item) => item.id === snapshotId)
    if (!snapshot) {
      return
    }

    setPrompt(snapshot.prompt)
    setVideoPrompt(snapshot.videoPrompt)
    setVideoText(snapshot.videoText)
    setSelectedModel(snapshot.selectedModel)
    setGeneratedImageBlob(snapshot.blob)
    setIsImageGenerationSuccessful(true)
    setActiveSnapshotId(snapshot.id)
    resetVideoPreview()
  }, [snapshots, resetVideoPreview])

  const deleteSnapshot = useCallback((snapshotId: string) => {
    let removedSnapshot: GenerationSnapshot | undefined
    let hasRemainingForJob = false

    setSnapshots((prev) => {
      const nextSnapshots = prev.filter((snapshot) => {
        if (snapshot.id === snapshotId) {
          removedSnapshot = snapshot
          return false
        }
        return true
      })

      if (removedSnapshot?.sourceJobId) {
        hasRemainingForJob = nextSnapshots.some(
          (snapshot) => snapshot.sourceJobId === removedSnapshot?.sourceJobId
        )
      }

      if (snapshotId === activeSnapshotId) {
        const nextActive = nextSnapshots[0] ?? null
        setActiveSnapshotId(nextActive ? nextActive.id : null)
        resetVideoPreview()

        if (nextActive) {
          setPrompt(nextActive.prompt)
          setVideoPrompt(nextActive.videoPrompt)
          setVideoText(nextActive.videoText)
          setGeneratedImageBlob(nextActive.blob)
          setIsImageGenerationSuccessful(true)
        } else {
          setGeneratedImageBlob(null)
          setIsImageGenerationSuccessful(false)
        }
      }

      return nextSnapshots
    })

    if (removedSnapshot?.sourceJobId && !hasRemainingForJob) {
      setBatchJobs((prev) =>
        prev.map((job) =>
          job.id === removedSnapshot?.sourceJobId
            ? { ...job, savedToSnapshot: false }
            : job
        )
      )
    }
  }, [activeSnapshotId, resetVideoPreview])

  const saveBatchJobToSnapshots = useCallback((jobIds: string[]) => {
    if (jobIds.length === 0) return

    const jobsToSave = batchJobs.filter(job =>
      jobIds.includes(job.id) &&
      job.status === 'completed' &&
      job.result &&
      !job.savedToSnapshot
    )

    if (jobsToSave.length === 0) {
      infoToast.general('沒有可保存的結果', '所選的結果可能已保存或未完成生成')
      return
    }

    const batchGroupId = jobsToSave.length > 1 ? `batch-group-${Date.now()}` : undefined
    const batchGroupSize = jobsToSave.length > 1 ? jobsToSave.length : undefined

    jobsToSave.forEach((job, index) => {
      if (job.result) {
        addSnapshot(
          job.result,
          job.id,
          batchGroupId,
          batchGroupSize,
          batchGroupSize ? index : undefined
        )
      }
    })

    // Mark jobs as saved
    setBatchJobs(prev =>
      prev.map(job =>
        jobIds.includes(job.id) ? { ...job, savedToSnapshot: true } : job
      )
    )

    const count = jobsToSave.length
    if (count === 1) {
      successToast.general('✅ 已加入快照', '已將選中的結果加入快照歷史')
    } else {
      successToast.general(`✅ 已加入 ${count} 個快照`, `已將 ${count} 個結果加入快照歷史`)
    }
  }, [batchJobs, addSnapshot, infoToast, successToast])

  const saveAllCompletedBatchJobs = useCallback(() => {
    const completedJobIds = batchJobs
      .filter(job => job.status === 'completed' && job.result && !job.savedToSnapshot)
      .map(job => job.id)

    if (completedJobIds.length === 0) {
      infoToast.general('沒有新的結果', '所有已完成的結果都已保存到快照')
      return
    }

    saveBatchJobToSnapshots(completedJobIds)
  }, [batchJobs, saveBatchJobToSnapshots, infoToast])

  // File handling
  const handleMainFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setMainImageFile(file)
      // Reset generation state when changing files
      setIsImageGenerationSuccessful(false)
    }
  }, [validateFile])

  const handleProductFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setProductImageFile(file)
      // Reset generation state when changing files
      setIsImageGenerationSuccessful(false)
    }
  }, [validateFile])

  const resetProductFile = useCallback(() => {
    setProductImageFile(null)
    setIsImageGenerationSuccessful(false)
  }, [])

  const reuseGeneratedImageAsMain = useCallback(() => {
    if (!generatedImageBlob) {
      showError('No generated image available to reuse.')
      return
    }

    if (typeof File === 'undefined') {
      showError('File API is not available in this environment.')
      return
    }

    const filename = `generated-main-${Date.now()}.png`
    const file = new File([generatedImageBlob], filename, {
      type: generatedImageBlob.type || 'image/png',
      lastModified: Date.now(),
    })

    handleMainFile(file)
    setGeneratedImageBlob(null)
    setIsImageGenerationSuccessful(false)
    resetVideoPreview()
  }, [generatedImageBlob, handleMainFile, resetVideoPreview, showError])

  const updateJob = useCallback((jobId: string, updater: (job: GenerationJob) => GenerationJob) => {
    setBatchJobs((prev) => prev.map((job) => (job.id === jobId ? updater(job) : job)))
  }, [])

  const createMaskBlob = useCallback(async (): Promise<Blob> => {
    if (!drawingCanvasRef.current) {
      throw new Error('Drawing canvas not available for mask creation')
    }

    const maskExportCanvas = document.createElement('canvas')
    maskExportCanvas.width = drawingCanvasRef.current.width
    maskExportCanvas.height = drawingCanvasRef.current.height
    const maskCtx = maskExportCanvas.getContext('2d')

    if (!maskCtx) {
      throw new Error('Failed to get mask canvas context')
    }

    const maxPixels = 16777216
    const totalPixels = maskExportCanvas.width * maskExportCanvas.height
    if (totalPixels > maxPixels) {
      throw new Error(`Canvas too large: ${totalPixels} pixels exceeds ${maxPixels} limit`)
    }

    maskCtx.fillStyle = 'black'
    maskCtx.fillRect(0, 0, maskExportCanvas.width, maskExportCanvas.height)
    maskCtx.drawImage(drawingCanvasRef.current, 0, 0)

    return canvasToBlob(maskExportCanvas, 'image/jpeg', 0.95)
  }, [canvasToBlob])

  const buildFormData = useCallback((maskBlob: Blob, variationLabel?: string) => {
    if (!mainImageFile) {
      throw new Error('Character image is required before generating.')
    }

    const form = new FormData()
    const action = productImageFile ? "generate_image" : "generate_image_no_product"
    form.append("action", action)
    form.append("main_image", mainImageFile)
    form.append("mask_image", maskBlob, "mask.jpeg")
    form.append("prompt", prompt.trim())
    form.append("model", selectedModel)

    if (variationLabel) {
      form.append("variation_label", variationLabel)
    }

    if (productImageFile) {
      form.append("reference_image", productImageFile)
    }

    if (drawingCanvasRef.current) {
      form.append(
        "aspect_ratio",
        getSimplifiedRatio(drawingCanvasRef.current.width, drawingCanvasRef.current.height)
      )
    }

    return form
  }, [mainImageFile, productImageFile, prompt, selectedModel, drawingCanvasRef])

  const performGenerationRequest = useCallback(
    async (
      form: FormData,
      controller: AbortController,
      expectedVariationLabel?: string
    ): Promise<{ blob: Blob; variationLabel?: string }> => {
      const timeoutId = setTimeout(() => controller.abort(), 300000)

      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          body: form,
          signal: controller.signal,
        })

        if (!res.ok) {
          let errorText = 'Unknown server error'
          try {
            errorText = await res.text()
          } catch {
            // ignore
          }
          throw new Error(`Server error (${res.status}): ${errorText.slice(0, 200)}`)
        }

        const responseLabel = res.headers.get('X-Variation-Label')?.trim() || expectedVariationLabel

        let responseBlob = await res.blob()

        if (!responseBlob || responseBlob.size === 0) {
          throw new Error('Received empty response from server')
        }

        const maxSize = 100 * 1024 * 1024
        if (responseBlob.size > maxSize) {
          throw new Error(`Response too large: ${Math.round(responseBlob.size / 1024 / 1024)}MB exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`)
        }

        if (!responseBlob.type || !responseBlob.type.startsWith('image/')) {
          const buffer = await responseBlob.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let mimeType = 'image/png'

          if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            mimeType = 'image/jpeg'
          } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            mimeType = 'image/png'
          } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
            mimeType = 'image/gif'
          } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            mimeType = 'image/webp'
          }

          responseBlob = new Blob([buffer], { type: mimeType })
        }

        return { blob: responseBlob, variationLabel: responseLabel }
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out after 3 minutes. The image generation is taking longer than expected. Please try again.')
          }
          if (fetchError.message.includes('ERR_CONNECTION_CLOSED') || fetchError.message.includes('network')) {
            throw new Error('Connection was closed during image generation. This usually happens when the process takes too long. Please try again.')
          }
          throw fetchError
        }
        throw new Error('Unknown network error')
      } finally {
        clearTimeout(timeoutId)
      }
    }, [])

  const runBatchGeneration = useCallback(async (
    count: GenerationCountOption,
    maskBlob: Blob
  ): Promise<{ completed: number; failed: number; cancelled: boolean }> => {
    clearBatchState()
    batchCancelledRef.current = false
    activeBatchJobIdRef.current = null

    const batchId = `batch-${Date.now()}`
    const jobs: GenerationJob[] = Array.from({ length: count }, (_, index) => ({
      id: `${batchId}-${index + 1}`,
      variationLabel: `${batchId}-var-${index + 1}`,
      status: 'pending',
      savedToSnapshot: false,
    }))
    const jobIdByVariation = new Map<string, string>(
      jobs.map((job) => [job.variationLabel, job.id])
    )

    setBatchJobs(jobs)
    setIsBatchGenerating(true)

    let completed = 0
    let failed = 0
    const jobPromises: Promise<void>[] = []

    const launchJob = (job: GenerationJob) => {
      if (batchCancelledRef.current) {
        updateJob(job.id, (current) => ({
          ...current,
          status: 'cancelled',
          error: 'Cancelled by user',
          finishedAt: Date.now(),
        }))
        return Promise.resolve()
      }

      const controller = new AbortController()
      batchControllersRef.current.set(job.id, controller)

      updateJob(job.id, (current) => ({
        ...current,
        status: 'running',
        startedAt: Date.now(),
        error: undefined,
        finishedAt: undefined,
        savedToSnapshot: current.savedToSnapshot ?? false,
      }))

      let form: FormData
      try {
        form = buildFormData(maskBlob, job.variationLabel)
      } catch (error) {
        batchControllersRef.current.delete(job.id)
        const message = error instanceof Error ? error.message : 'Failed to prepare request'
        updateJob(job.id, (current) => ({
          ...current,
          status: 'failed',
          error: message,
          finishedAt: Date.now(),
        }))
        failed += 1
        return Promise.resolve()
      }

      return performGenerationRequest(
        form,
        controller,
        job.variationLabel
      )
        .then(({ blob, variationLabel: returnedLabel }) => {
          batchControllersRef.current.delete(job.id)

          const targetVariation = returnedLabel ?? job.variationLabel
          const targetJobId = jobIdByVariation.get(targetVariation) ?? job.id

          if (targetJobId !== job.id) {
            console.warn('Variation label mismatch', {
              expected: job.variationLabel,
              received: returnedLabel,
            })
          updateJob(job.id, (current) => ({
            ...current,
            status: 'completed',
            result: blob,
            finishedAt: Date.now(),
            savedToSnapshot: current.savedToSnapshot ?? false,
          }))
          }

          updateJob(targetJobId, (current) => ({
            ...current,
            status: 'completed',
            result: blob,
            finishedAt: Date.now(),
            savedToSnapshot: current.savedToSnapshot ?? false,
          }))

          completed += 1

          if (!activeBatchJobIdRef.current) {
            setGeneratedImageBlob(blob)
            setIsImageGenerationSuccessful(true)
            setActiveBatchJobId(targetJobId)
            activeBatchJobIdRef.current = targetJobId
          }
        })
        .catch((error) => {
          batchControllersRef.current.delete(job.id)
          const message = error instanceof Error ? error.message : 'Unknown error'
          const status: GenerationJobStatus = batchCancelledRef.current ? 'cancelled' : 'failed'

          updateJob(job.id, (current) => ({
            ...current,
            status,
            error: status === 'failed' ? message : 'Cancelled by user',
            finishedAt: Date.now(),
            savedToSnapshot: current.savedToSnapshot ?? false,
          }))

          if (status === 'failed') {
            failed += 1
          }
        })
    }

    for (let i = 0; i < jobs.length; i++) {
      if (batchCancelledRef.current) {
        break
      }

      const job = jobs[i]
      jobPromises.push(launchJob(job))

      if (i < jobs.length - 1) {
        await sleep(BATCH_DELAY_MS)
      }
    }

    await Promise.allSettled(jobPromises)
    setIsBatchGenerating(false)
    return { completed, failed, cancelled: batchCancelledRef.current }
  }, [buildFormData, clearBatchState, performGenerationRequest, updateJob, setGeneratedImageBlob, setIsImageGenerationSuccessful, setActiveBatchJobId, setIsBatchGenerating])

  const selectBatchResult = useCallback((jobId: string) => {
    const job = batchJobs.find((item) => item.id === jobId)
    if (!job || !job.result) {
      return
    }

    setGeneratedImageBlob(job.result)
    setIsImageGenerationSuccessful(true)
    setActiveBatchJobId(jobId)
    activeBatchJobIdRef.current = jobId

    if (!job.savedToSnapshot) {
      addSnapshot(job.result, job.id)
      updateJob(jobId, (current) => ({
        ...current,
        savedToSnapshot: true,
      }))
    }
  }, [batchJobs, setGeneratedImageBlob, setIsImageGenerationSuccessful, setActiveBatchJobId, addSnapshot, updateJob])

  const retryBatchJob = useCallback(async (jobId: string) => {
    const target = batchJobs.find((job) => job.id === jobId)
    if (!target) {
      return
    }

    const maskBlob = await createMaskBlob()
    const controller = new AbortController()
    batchControllersRef.current.set(jobId, controller)

    updateJob(jobId, (current) => ({
      ...current,
      status: 'running',
      startedAt: Date.now(),
      finishedAt: undefined,
      error: undefined,
      savedToSnapshot: false,
    }))

    try {
      const form = buildFormData(maskBlob, target.variationLabel)
      const { blob } = await performGenerationRequest(form, controller, target.variationLabel)
      batchControllersRef.current.delete(jobId)

      updateJob(jobId, (current) => ({
        ...current,
        status: 'completed',
        result: blob,
        finishedAt: Date.now(),
      }))

      if (activeBatchJobIdRef.current === jobId || !activeBatchJobIdRef.current) {
        setGeneratedImageBlob(blob)
        setIsImageGenerationSuccessful(true)
        setActiveBatchJobId(jobId)
        activeBatchJobIdRef.current = jobId
      }
    } catch (error) {
      batchControllersRef.current.delete(jobId)
      const message = error instanceof Error ? error.message : 'Unknown error'
      updateJob(jobId, (current) => ({
        ...current,
        status: 'failed',
        error: message,
        finishedAt: Date.now(),
      }))
    }
  }, [batchJobs, buildFormData, createMaskBlob, performGenerationRequest, updateJob, setGeneratedImageBlob, setIsImageGenerationSuccessful, setActiveBatchJobId])

  const cancelBatchGeneration = useCallback(() => {
    if (!isBatchGenerating) {
      return
    }

    batchCancelledRef.current = true
    batchControllersRef.current.forEach((controller) => controller.abort())
    batchControllersRef.current.clear()
    setBatchJobs((prev) => prev.map((job) => {
      if (job.status === 'pending' || job.status === 'running') {
        return {
          ...job,
          status: 'cancelled',
          error: 'Cancelled by user',
          finishedAt: Date.now(),
        }
      }
      return job
    }))
    setIsBatchGenerating(false)
    setIsGenerating(false)
  }, [isBatchGenerating])

  // Image generation
  const generateImage = useCallback(async () => {
    if (!mainImageFile || !prompt.trim()) {
      showError("Please provide a character image and describe how you'd like to modify it.")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImageBlob(null)
    setIsImageGenerationSuccessful(false)

    try {
      const maskBlob = await createMaskBlob()

      if (generationCountState > 1) {
        const summary = await runBatchGeneration(generationCountState, maskBlob)
        if (summary.completed === 0 && !summary.cancelled) {
          showError('All batch variations failed. Please try again or adjust your prompt.')
        }
      } else {
        const controller = new AbortController()
        const form = buildFormData(maskBlob)
        const { blob } = await performGenerationRequest(form, controller)
        setGeneratedImageBlob(blob)
        setIsImageGenerationSuccessful(true)
        addSnapshot(blob)
      }
    } catch (error) {
      console.error('Image generation failed:', error)
      setGeneratedImageBlob(null)
      setIsImageGenerationSuccessful(false)
      showError(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
      setIsBatchGenerating(false)
    }
  }, [mainImageFile, prompt, generationCountState, createMaskBlob, runBatchGeneration, buildFormData, performGenerationRequest, addSnapshot, showError])

  // Result actions
  const downloadImage = useCallback(() => {
    if (!generatedImageBlob) return
    
    const url = URL.createObjectURL(generatedImageBlob)
    const link = document.createElement('a')
    link.download = `generated-image-${Date.now()}.png`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [generatedImageBlob])

  const cropImage = useCallback(() => {
    // This will be handled by the modal in the component
  }, [])

  // Update generated image (for cropping)
  const updateGeneratedImage = useCallback((blob: Blob) => {
    setGeneratedImageBlob(blob)
    setSnapshots((prev) => prev.map((snapshot) => {
      if (snapshot.id !== activeSnapshotId) {
        return snapshot
      }
      return {
        ...snapshot,
        blob,
        createdAt: Date.now(),
      }
    }))
    // Keep generation successful state since we're just modifying an already successful generation
  }, [activeSnapshotId])

  // Video generation
  const generateVideo = useCallback(async () => {
    if (!generatedImageBlob || !isImageGenerationSuccessful) {
      showError("Please generate an image successfully first.")
      return
    }
    if (!videoPrompt.trim()) {
      showError("Please enter a video prompt.")
      return
    }

    // Reset all video-related state to ensure clean slate for new generation
    resetVideoPreview()
    setIsVideoGenerating(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("action", "generate_video")
      form.append("image", generatedImageBlob, "source-image.png")
      form.append("video_prompt", videoPrompt.trim())
      form.append("text_overlay", videoText.trim())
      
      // Use aspect ratio from generated image or default
      form.append("aspect_ratio", "9:16") // Default for video

      const res = await fetch(WEBHOOK_URL, { method: "POST", body: form })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 200)}`)
      }
      
      // Try to parse as JSON first
      let data
      let taskId = null
      
      try {
        const contentType = res.headers.get("content-type")
        if (contentType && (contentType.includes("application/json") || contentType.includes("text/"))) {
          data = await res.json()
          
          // Handle array response format: [{ "taskId": "..." }]
          const responseData = Array.isArray(data) ? data[0] : data
          
          taskId = responseData.taskId || responseData.task_id || responseData.id
        } else {
          // If not JSON, try to extract task ID from response text
          const responseText = await res.text()
          
          // Try to extract task ID from various formats
          const taskIdMatch = responseText.match(/(?:task[_-]?id|id)[":\s]+["']?([a-zA-Z0-9-_]+)["']?/i)
          if (taskIdMatch) {
            taskId = taskIdMatch[1]
          } else {
            // If we can't find a task ID pattern, generate a temporary one for UI purposes
            taskId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
          }
        }
      } catch (parseError) {
        console.error("Error parsing server response:", parseError)
        // Generate a temporary task ID so the UI still shows the status check section
        taskId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      }

      if (taskId) {
        setCurrentTaskId(taskId)
      } else {
        // Even if we don't get a proper task ID, show the status section with a fallback ID
        const fallbackTaskId = `fallback-${Date.now()}`
        setCurrentTaskId(fallbackTaskId)
        showError("Video generation started, but no task ID was provided. You can still try checking the status.")
      }

    } catch (err) {
      console.error("Error in generateVideo:", err)
      showError("Error starting video generation: " + (err instanceof Error ? err.message : 'Unknown error'))
      
      // In case of error, still show the status section with an error task ID for debugging
      const errorTaskId = `error-${Date.now()}`
      setCurrentTaskId(errorTaskId)
    } finally {
      setIsVideoGenerating(false)
    }
  }, [generatedImageBlob, isImageGenerationSuccessful, videoPrompt, videoText, showError, resetVideoPreview])

  // Video generation (Auto Mode) - same as generateVideo but with different action
  const generateVideoAuto = useCallback(async () => {
    if (!generatedImageBlob || !isImageGenerationSuccessful) {
      showError("Please generate an image successfully first.")
      return
    }
    if (!videoPrompt.trim()) {
      showError("Please enter a video prompt.")
      return
    }

    // Reset all video-related state to ensure clean slate for new generation
    resetVideoPreview()
    setIsVideoGenerating(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("action", "generate_video_auto") // Only difference from generateVideo
      form.append("image", generatedImageBlob, "source-image.png")
      form.append("video_prompt", videoPrompt.trim())
      form.append("text_overlay", videoText.trim())
      
      // Use aspect ratio from generated image or default
      form.append("aspect_ratio", "9:16") // Default for video

      const res = await fetch(WEBHOOK_URL, { method: "POST", body: form })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 200)}`)
      }
      
      // Try to parse as JSON first
      let data
      let taskId = null
      
      try {
        const contentType = res.headers.get("content-type")
        if (contentType && (contentType.includes("application/json") || contentType.includes("text/"))) {
          data = await res.json()
          
          // Handle array response format: [{ "taskId": "..." }]
          const responseData = Array.isArray(data) ? data[0] : data
          
          taskId = responseData.taskId || responseData.task_id || responseData.id
        } else {
          // If not JSON, try to extract task ID from response text
          const responseText = await res.text()
          
          // Try to extract task ID from various formats
          const taskIdMatch = responseText.match(/(?:task[_-]?id|id)[":\s]+["']?([a-zA-Z0-9-_]+)["']?/i)
          if (taskIdMatch) {
            taskId = taskIdMatch[1]
          } else {
            // If we can't find a task ID pattern, generate a temporary one for UI purposes
            taskId = `temp-auto-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
          }
        }
      } catch (parseError) {
        console.error("Error parsing server response (auto mode):", parseError)
        // Generate a temporary task ID so the UI still shows the status check section
        taskId = `temp-auto-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
      }

      if (taskId) {
        setCurrentTaskId(taskId)
      } else {
        // Even if we don't get a proper task ID, show the status section with a fallback ID
        const fallbackTaskId = `fallback-auto-${Date.now()}`
        setCurrentTaskId(fallbackTaskId)
        showError("Video generation (auto mode) started, but no task ID was provided. You can still try checking the status.")
      }

    } catch (err) {
      console.error("Error in generateVideoAuto:", err)
      showError("Error starting video generation (auto mode): " + (err instanceof Error ? err.message : 'Unknown error'))
      
      // In case of error, still show the status section with an error task ID for debugging
      const errorTaskId = `error-auto-${Date.now()}`
      setCurrentTaskId(errorTaskId)
    } finally {
      setIsVideoGenerating(false)
    }
  }, [generatedImageBlob, isImageGenerationSuccessful, videoPrompt, videoText, showError, resetVideoPreview])

  // Check video status
  const checkVideoStatus = useCallback(async () => {
    if (!currentTaskId) {
      showError("No Task ID found to check.")
      return
    }

    setIsCheckingVideo(true)
    setError(null)

    try {
      // Handle special task ID types
      if (currentTaskId.startsWith('temp-') || currentTaskId.startsWith('fallback-') || currentTaskId.startsWith('error-')) {
        showError("This is a temporary task ID. The actual video generation may not have started properly. Please try generating the video again.")
        return
      }

      const form = new FormData()
      form.append("action", "check_video")
      form.append("taskId", currentTaskId)

      const res = await fetch(WEBHOOK_URL, { method: "POST", body: form })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 200)}`)
      }
      
      const contentType = res.headers.get("content-type")
      if (contentType && (contentType.includes("application/json") || contentType.includes("text/"))) {
        const data = await res.json()
        
        // Handle array response format if applicable
        const responseData = Array.isArray(data) ? data[0] : data
        
        // Check the response structure based on the format you provided
        if (responseData.code === 200) {
          const videoData = responseData.data
          
          // Check if video is still processing
          if (videoData.response === null || videoData.successFlag === 0) {
            infoToast.general(
              "🎬 影片生成中",
              "您的影片正在製作中，請稍後再檢查狀態..."
            )
            return
          }
          
          // Check if video generation completed successfully
          if (videoData.successFlag === 1 && videoData.response) {
            // Try to parse the response to get video URL
            try {
              let videoUrl: string | null = null
              
              // The response might be a string containing the video URL or a JSON object
              if (typeof videoData.response === 'string') {
                // Try to parse as JSON first
                try {
                  const parsedResponse = JSON.parse(videoData.response)
                  videoUrl = parsedResponse.resultUrls?.[0] ||  // Primary: resultUrls array (as per your format)
                           parsedResponse.videoUrl || 
                           parsedResponse.video_url || 
                           parsedResponse.url || 
                           parsedResponse.output
                } catch {
                  // If not JSON, check if it's a direct URL
                  if (videoData.response.startsWith('http')) {
                    videoUrl = videoData.response
                  }
                }
              } else if (typeof videoData.response === 'object') {
                videoUrl = videoData.response.resultUrls?.[0] ||  // Primary: resultUrls array (as per your format)
                          videoData.response.videoUrl || 
                          videoData.response.video_url || 
                          videoData.response.url || 
                          videoData.response.output
              }
              
              if (videoUrl) {
                // Store the generated video URL for Airtable saving
                setGeneratedVideoUrl(videoUrl)
                
                try {
                  const videoResponse = await fetch(videoUrl)
                  if (videoResponse.ok) {
                    const videoBlob = await videoResponse.blob()
                    if (videoBlob.size > 0) {
                      setVideoBlob(videoBlob)
                      successToast.general(
                        "🎉 影片生成完成！",
                        "您的影片已成功製作完成，可以下載了"
                      )
                      return
                    }
                  }
                } catch (fetchError) {
                  console.error('Error fetching video from URL:', fetchError)
                }
              }
              
              showError("Video generation completed, but no video file was found. Please try again.")
              
            } catch (parseError) {
              console.error('Error parsing video response:', parseError)
              showError("Video generation completed, but response format is unexpected. Please try again.")
            }
          } else {
            // Check for error conditions
            if (videoData.errorCode || videoData.errorMessage) {
              showError(`Video generation failed: ${videoData.errorMessage || 'Unknown error'}. Please try generating again.`)
            } else {
              showError("Video generation status is unclear. Please try checking again.")
            }
          }
        } else {
          // Non-200 response code
          showError(`Server returned error: ${responseData.msg || 'Unknown error'}. Please try again.`)
        }
      } else {
        // Video is ready as binary data
        const responseBlob = await res.blob()
        
        if (responseBlob.size === 0) {
          throw new Error("Received empty video file")
        }
        
        setVideoBlob(responseBlob)
      }

    } catch (err) {
      console.error("Error in checkVideoStatus:", err)
      showError("Error checking video status: " + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setIsCheckingVideo(false)
    }
  }, [currentTaskId, showError])

  // Download video
  const downloadVideo = useCallback(() => {
    if (!videoBlob) return
    
    const url = URL.createObjectURL(videoBlob)
    const link = document.createElement('a')
    link.download = `generated-video-${Date.now()}.mp4`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [videoBlob])

  // Save to Airtable
  const saveToAirtable = useCallback(async () => {
    if (!mainImageFile || !productImageFile || !prompt || !generatedImageBlob) {
      showError("Missing required data. Please ensure all images, video, and prompts are available before saving.")
      return
    }

    setIsSavingToAirtable(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("action", "save_airtable")
      
      // File attachments (original images)
      form.append("character_image", mainImageFile, mainImageFile.name)
      form.append("product_image", productImageFile, productImageFile.name)
      
      // File attachments (generated content as files instead of URLs)
      if (generatedImageBlob) {
        const generatedImageFile = new File([generatedImageBlob], `generated-image-${Date.now()}.jpg`, { 
          type: generatedImageBlob.type || 'image/jpeg' 
        })
        form.append("generated_image_file", generatedImageFile, generatedImageFile.name)
      }
      
      if (videoBlob) {
        const generatedVideoFile = new File([videoBlob], `generated-video-${Date.now()}.mp4`, { 
          type: videoBlob.type || 'video/mp4' 
        })
        form.append("generated_video_file", generatedVideoFile, generatedVideoFile.name) 
      }
      
      // Prompts and text
      form.append("image_prompt", prompt.trim())
      form.append("video_prompt", videoPrompt.trim())
      form.append("video_transcript", videoText.trim())
      
      // Add timestamp
      form.append("created_at", new Date().toISOString())

      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: form,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`)
      }

      // Check if response has content before parsing JSON
      const responseText = await response.text()
      
      let result
      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText)
        } catch (jsonError) {
          result = { message: responseText }
        }
      } else {
        result = { message: 'Success (empty response)' }
      }

      successToast.general(
        "🎉 儲存成功！",
        "資料已成功儲存到 Airtable 資料庫"
      )

    } catch (error) {
      console.error('❌ Error saving to Airtable:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      showError(`Failed to save to Airtable: ${errorMessage}`)
      
      errorToast.general(
        "💾 儲存失敗",
        "無法儲存到資料庫，請稍後再試"
      )
    } finally {
      setIsSavingToAirtable(false)
    }
  }, [mainImageFile, productImageFile, prompt, videoPrompt, videoText, generatedImageBlob, videoBlob, showError, successToast, errorToast])

  return {
    // State
    mainImageFile,
    productImageFile,
    prompt,
    setPrompt: handleSetPrompt,
    selectedModel,
    setSelectedModel,
    generatedImageBlob,
    isGenerating,
    isImageGenerationSuccessful,
    error,
    clearError,
    resetAll,
    generationCount: generationCountState,
    setGenerationCount: handleSetGenerationCount,
    batchJobs,
    activeBatchJobId,
    isBatchGenerating,
    selectBatchResult,
    retryBatchJob,
    cancelBatchGeneration,
    
    // Canvas refs
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
    cropImage,
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
    resetVideoPreview,
    
    // Airtable save
    saveToAirtable,
    isSavingToAirtable,
    generatedImageUrl,
    generatedVideoUrl,

    // Snapshots
    snapshots,
    activeSnapshotId,
    loadSnapshot,
    deleteSnapshot,
    saveBatchJobToSnapshots,
    saveAllCompletedBatchJobs,
  }
}
