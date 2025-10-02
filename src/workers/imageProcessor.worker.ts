// imageProcessor.worker.ts
// WebWorker - 在背景處理圖片，不影響主畫面

/**
 * 這個 Worker 負責處理繁重的圖片運算
 * 在背景執行，不會讓使用者介面凍結
 */

// 監聽主執行緒傳來的訊息
self.addEventListener('message', async (event) => {
  const { type, data } = event.data

  try {
    switch (type) {
      case 'CREATE_MASK':
        const mask = await createMask(data)
        self.postMessage({ type: 'MASK_CREATED', data: mask })
        break

      case 'PROCESS_IMAGE':
        const processed = await processImage(data)
        self.postMessage({ type: 'IMAGE_PROCESSED', data: processed })
        break

      case 'RESIZE_IMAGE':
        const resized = await resizeImage(data)
        self.postMessage({ type: 'IMAGE_RESIZED', data: resized })
        break

      default:
        self.postMessage({ type: 'ERROR', error: 'Unknown operation' })
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Processing failed'
    })
  }
})

/**
 * 創建遮罩圖片
 * 這是最耗時的操作，特別適合在 Worker 中執行
 */
async function createMask(data: {
  canvasWidth: number
  canvasHeight: number
  drawingData: ImageData
}): Promise<Blob> {
  // 創建離屏 Canvas（不顯示在畫面上的 Canvas）
  const offscreenCanvas = new OffscreenCanvas(
    data.canvasWidth,
    data.canvasHeight
  )
  const ctx = offscreenCanvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // 填充黑色背景
  ctx.fillStyle = 'black'
  ctx.fillRect(0, 0, data.canvasWidth, data.canvasHeight)

  // 繪製白色遮罩區域
  ctx.putImageData(data.drawingData, 0, 0)

  // 轉換為 Blob
  const blob = await offscreenCanvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.95
  })

  return blob
}

/**
 * 處理圖片（調整大小、壓縮等）
 */
async function processImage(data: {
  imageBlob: Blob
  maxWidth: number
  maxHeight: number
}): Promise<Blob> {
  // 讀取圖片
  const bitmap = await createImageBitmap(data.imageBlob)

  // 計算新尺寸
  let { width, height } = bitmap
  const { maxWidth, maxHeight } = data

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height)
    width = Math.floor(width * ratio)
    height = Math.floor(height * ratio)
  }

  // 創建新的 Canvas 並調整大小
  const offscreenCanvas = new OffscreenCanvas(width, height)
  const ctx = offscreenCanvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)

  // 返回處理後的圖片
  return await offscreenCanvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.9
  })
}

/**
 * 智慧調整圖片大小
 */
async function resizeImage(data: {
  imageBlob: Blob
  targetWidth: number
  targetHeight: number
  maintainAspectRatio: boolean
}): Promise<Blob> {
  const bitmap = await createImageBitmap(data.imageBlob)

  let { targetWidth, targetHeight } = data

  if (data.maintainAspectRatio) {
    const aspectRatio = bitmap.width / bitmap.height
    if (targetWidth / targetHeight > aspectRatio) {
      targetWidth = Math.floor(targetHeight * aspectRatio)
    } else {
      targetHeight = Math.floor(targetWidth / aspectRatio)
    }
  }

  const offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight)
  const ctx = offscreenCanvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // 使用高品質縮放
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)

  return await offscreenCanvas.convertToBlob({
    type: 'image/png',
    quality: 1
  })
}

// TypeScript 型別宣告
export type WorkerMessageType =
  | 'CREATE_MASK'
  | 'PROCESS_IMAGE'
  | 'RESIZE_IMAGE'

export type WorkerResponseType =
  | 'MASK_CREATED'
  | 'IMAGE_PROCESSED'
  | 'IMAGE_RESIZED'
  | 'ERROR'

export interface WorkerMessage {
  type: WorkerMessageType
  data: any
}

export interface WorkerResponse {
  type: WorkerResponseType
  data?: any
  error?: string
}