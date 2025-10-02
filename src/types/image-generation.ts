export interface ImageGenerationRequest {
  action: 'generate_image'
  main_image: File
  mask_image: Blob
  reference_image: File
  prompt: string
  aspect_ratio: string
}

export interface VideoGenerationRequest {
  action: 'generate_video'
  image: Blob
  video_prompt: string
  text_overlay: string
  aspect_ratio: string
}

export interface VideoStatusRequest {
  action: 'check_video'
  taskId: string
}

export interface VideoTaskResponse {
  taskId: string
}

export interface VideoStatusResponse {
  status: 'processing' | 'completed' | 'failed'
  message?: string
}

export interface AspectRatioOption {
  label: string
  ratio: number | null
  stringRatio: string
}

export interface ImageGenerationState {
  mainImageFile: File | null
  productImageFile: File | null
  prompt: string
  generatedImageBlob: Blob | null
  isGenerating: boolean
  error: string | null
}

export interface VideoGenerationState {
  videoPrompt: string
  videoText: string
  currentTaskId: string | null
  isVideoGenerating: boolean
  isCheckingVideo: boolean
  videoBlob: Blob | null
}