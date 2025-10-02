'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

/**
 * useImageWorker Hook
 *
 * 這個 Hook 讓你輕鬆使用 WebWorker 處理圖片
 * 優點：
 * 1. 不會凍結使用者介面
 * 2. 可以同時處理多個圖片
 * 3. 自動處理錯誤
 */
export function useImageWorker() {
  const workerRef = useRef<Worker | null>(null)
  const { errorToast } = useToast()

  // 初始化 Worker
  useEffect(() => {
    // 創建 Worker 實例
    workerRef.current = new Worker(
      new URL('../workers/imageProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    )

    // 清理函數
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  /**
   * 創建遮罩 - 使用 Worker 在背景處理
   *
   * 使用範例：
   * const maskBlob = await createMaskInBackground(canvas, drawingCanvas)
   */
  const createMaskInBackground = useCallback(
    async (
      canvas: HTMLCanvasElement,
      drawingCanvas: HTMLCanvasElement
    ): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'))
          return
        }

        // 獲取繪圖資料
        const drawingCtx = drawingCanvas.getContext('2d')
        if (!drawingCtx) {
          reject(new Error('Cannot get drawing context'))
          return
        }

        // 取得畫布上的圖像資料
        const drawingData = drawingCtx.getImageData(
          0, 0,
          drawingCanvas.width,
          drawingCanvas.height
        )

        // 設定一次性的訊息處理器
        const handleMessage = (event: MessageEvent) => {
          const { type, data, error } = event.data

          if (type === 'MASK_CREATED') {
            workerRef.current?.removeEventListener('message', handleMessage)
            resolve(data)
          } else if (type === 'ERROR') {
            workerRef.current?.removeEventListener('message', handleMessage)
            reject(new Error(error || 'Mask creation failed'))
          }
        }

        // 監聽 Worker 回應
        workerRef.current.addEventListener('message', handleMessage)

        // 發送任務給 Worker
        workerRef.current.postMessage({
          type: 'CREATE_MASK',
          data: {
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            drawingData: drawingData
          }
        })
      })
    },
    []
  )

  /**
   * 處理圖片 - 調整大小和壓縮
   */
  const processImageInBackground = useCallback(
    async (
      imageBlob: Blob,
      maxWidth = 2048,
      maxHeight = 2048
    ): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'))
          return
        }

        const handleMessage = (event: MessageEvent) => {
          const { type, data, error } = event.data

          if (type === 'IMAGE_PROCESSED') {
            workerRef.current?.removeEventListener('message', handleMessage)
            resolve(data)
          } else if (type === 'ERROR') {
            workerRef.current?.removeEventListener('message', handleMessage)
            reject(new Error(error || 'Image processing failed'))
          }
        }

        workerRef.current.addEventListener('message', handleMessage)

        workerRef.current.postMessage({
          type: 'PROCESS_IMAGE',
          data: {
            imageBlob,
            maxWidth,
            maxHeight
          }
        })
      })
    },
    []
  )

  /**
   * 調整圖片大小
   */
  const resizeImageInBackground = useCallback(
    async (
      imageBlob: Blob,
      targetWidth: number,
      targetHeight: number,
      maintainAspectRatio = true
    ): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Worker not initialized'))
          return
        }

        const handleMessage = (event: MessageEvent) => {
          const { type, data, error } = event.data

          if (type === 'IMAGE_RESIZED') {
            workerRef.current?.removeEventListener('message', handleMessage)
            resolve(data)
          } else if (type === 'ERROR') {
            workerRef.current?.removeEventListener('message', handleMessage)
            reject(new Error(error || 'Image resize failed'))
          }
        }

        workerRef.current.addEventListener('message', handleMessage)

        workerRef.current.postMessage({
          type: 'RESIZE_IMAGE',
          data: {
            imageBlob,
            targetWidth,
            targetHeight,
            maintainAspectRatio
          }
        })
      })
    },
    []
  )

  return {
    createMaskInBackground,
    processImageInBackground,
    resizeImageInBackground,
    isWorkerReady: !!workerRef.current
  }
}