'use client'

import { useEffect, useRef, useState, useCallback, RefObject } from 'react'
import { measureCanvasOperation } from '@/lib/performance-monitor'
import { ProgressSlider } from '@/components/ui/ProgressSlider'

const MAX_HISTORY = 50

interface DrawingCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  drawingCanvasRef: RefObject<HTMLCanvasElement | null>
  imageFile: File
}

interface Position {
  x: number
  y: number
}

interface HistoryMetrics {
  index: number
  total: number
  canUndo: boolean
  canRedo: boolean
}

export function DrawingCanvas({ canvasRef, drawingCanvasRef, imageFile }: DrawingCanvasProps) {
  const [brushSize, setBrushSize] = useState(40)
  const [toolMode, setToolMode] = useState<'brush' | 'eraser'>('brush')
  const [eraserSize, setEraserSize] = useState(40)
  const [eraserHardness, setEraserHardness] = useState(80)
  const [eraserOpacity, setEraserOpacity] = useState(100)
  const [historyMetrics, setHistoryMetrics] = useState<HistoryMetrics>({
    index: 0,
    total: 0,
    canUndo: false,
    canRedo: false
  })

  const rectRef = useRef<DOMRect | null>(null)
  const lastPosRef = useRef<Position>({ x: 0, y: 0 })
  const isDrawingRef = useRef(false)
  const strokeModifiedRef = useRef(false)
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef(-1)

  const updateHistoryMetrics = useCallback(() => {
    const total = historyRef.current.length
    const index = historyIndexRef.current
    setHistoryMetrics({
      index: index >= 0 ? index + 1 : 0,
      total,
      canUndo: index > 0,
      canRedo: index >= 0 && index < total - 1
    })
  }, [])

  const captureHistoryState = useCallback(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return
    if (canvas.width === 0 || canvas.height === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Failed to capture history state: missing context')
      return
    }

    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1)
      trimmed.push(snapshot)

      if (trimmed.length > MAX_HISTORY) {
        trimmed.splice(0, trimmed.length - MAX_HISTORY)
      }

      historyRef.current = trimmed
      historyIndexRef.current = trimmed.length - 1
      updateHistoryMetrics()
    } catch (error) {
      console.error('Failed to capture history state:', error)
    }
  }, [drawingCanvasRef, updateHistoryMetrics])

  const resetHistory = useCallback(() => {
    historyRef.current = []
    historyIndexRef.current = -1
    updateHistoryMetrics()

    requestAnimationFrame(() => {
      captureHistoryState()
    })
  }, [captureHistoryState, updateHistoryMetrics])

  const undo = useCallback(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return
    if (historyIndexRef.current <= 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Failed to undo: missing context')
      return
    }

    historyIndexRef.current -= 1
    const snapshot = historyRef.current[historyIndexRef.current]
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      updateHistoryMetrics()
    }
  }, [drawingCanvasRef, updateHistoryMetrics])

  const redo = useCallback(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.error('Failed to redo: missing context')
      return
    }

    if (historyIndexRef.current < 0 || historyIndexRef.current >= historyRef.current.length - 1) return

    historyIndexRef.current += 1
    const snapshot = historyRef.current[historyIndexRef.current]
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      updateHistoryMetrics()
    }
  }, [drawingCanvasRef, updateHistoryMetrics])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
      }

      if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  useEffect(() => {
    if (imageFile && canvasRef.current && drawingCanvasRef.current) {
      const canvas = canvasRef.current
      const drawingCanvas = drawingCanvasRef.current
      const ctx = canvas.getContext('2d')
      const drawingCtx = drawingCanvas.getContext('2d')

      if (ctx && drawingCtx) {
        const img = new Image()
        const imageUrl = URL.createObjectURL(imageFile)

        img.onload = () => {
          measureCanvasOperation('canvas-initialization', () => {
            try {
              const MAX_DIMENSION = 4096
              if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
                const scale = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height)
                canvas.width = drawingCanvas.width = Math.floor(img.width * scale)
                canvas.height = drawingCanvas.height = Math.floor(img.height * scale)
              } else {
                canvas.width = drawingCanvas.width = img.width
                canvas.height = drawingCanvas.height = img.height
              }

              ctx.save()
              ctx.imageSmoothingEnabled = true
              ctx.imageSmoothingQuality = 'high'
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              ctx.restore()

              drawingCtx.save()
              drawingCtx.imageSmoothingEnabled = true
              drawingCtx.imageSmoothingQuality = 'high'
              drawingCtx.globalCompositeOperation = 'source-over'
              drawingCtx.lineCap = 'round'
              drawingCtx.lineJoin = 'round'
              drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height)
              drawingCtx.restore()

              setTimeout(() => {
                layoutStableCalibrateCoordinates()
              }, 50)

              requestAnimationFrame(() => {
                resetHistory()
              })

              URL.revokeObjectURL(imageUrl)
            } catch (error) {
              console.error('Failed to initialize canvas:', error)
              URL.revokeObjectURL(imageUrl)
              throw error
            }
          }, { imageWidth: img.width, imageHeight: img.height })
        }

        img.onerror = () => {
          console.error('Failed to load image for canvas')
          URL.revokeObjectURL(imageUrl)
        }

        img.src = imageUrl
      } else {
        console.error('Failed to get canvas contexts')
      }
    }
  }, [imageFile, canvasRef, drawingCanvasRef, resetHistory])

  const updateRect = useCallback(() => {
    if (drawingCanvasRef.current) {
      const rect = drawingCanvasRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        rectRef.current = rect
      }
    }
  }, [drawingCanvasRef])

  const layoutStableCalibrateCoordinates = useCallback(() => {
    if (!drawingCanvasRef.current) return

    let attemptCount = 0
    const maxAttempts = 10
    let resizeObserver: ResizeObserver | null = null
    let stabilityTimer: NodeJS.Timeout | null = null
    let isComplete = false

    const cleanup = () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (stabilityTimer) {
        clearTimeout(stabilityTimer)
        stabilityTimer = null
      }
    }

    const validateCanvasLayout = (canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(canvas)

      const hasValidRect = rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.top >= 0 && rect.width < window.innerWidth * 2 && rect.height < window.innerHeight * 2
      const hasValidStyle = computedStyle.width !== '0px' && computedStyle.height !== '0px' && computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
      const hasValidCanvasSize = canvas.width > 0 && canvas.height > 0
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0

      return {
        isValid: hasValidRect && hasValidStyle && hasValidCanvasSize && isInViewport,
        rect,
        details: { hasValidRect, hasValidStyle, hasValidCanvasSize, isInViewport }
      }
    }

    const performCalibration = () => {
      if (isComplete || !drawingCanvasRef.current) return false

      attemptCount++
      const validation = validateCanvasLayout(drawingCanvasRef.current)

      if (validation.isValid) {
        rectRef.current = validation.rect
        isComplete = true
        cleanup()
        console.debug(`Layout-stable calibration succeeded on attempt ${attemptCount}:`, validation.rect)
        return true
      }

      console.debug(`Calibration attempt ${attemptCount} failed:`, validation.details)
      return false
    }

    const frameSync = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (performCalibration()) return

          if (attemptCount < maxAttempts) {
            const delay = Math.min(16 * Math.pow(1.5, attemptCount - 1), 200)
            setTimeout(frameSync, delay)
          } else {
            console.warn('Layout-stable calibration failed after maximum attempts, falling back to basic calibration')
            cleanup()
            updateRect()
          }
        })
      })
    }

    if ('ResizeObserver' in window && drawingCanvasRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (isComplete) return

        if (stabilityTimer) clearTimeout(stabilityTimer)
        stabilityTimer = setTimeout(() => {
          performCalibration()
        }, 50)
      })

      resizeObserver.observe(drawingCanvasRef.current)
    }

    frameSync()

    return cleanup
  }, [drawingCanvasRef, updateRect])

  useEffect(() => {
    updateRect()
    window.addEventListener('resize', updateRect)
    return () => window.removeEventListener('resize', updateRect)
  }, [updateRect])

  useEffect(() => {
    if (imageFile) {
      const cleanupFn = layoutStableCalibrateCoordinates()
      return cleanupFn
    }
  }, [imageFile, layoutStableCalibrateCoordinates])

  const getMousePos = useCallback((canvas: HTMLCanvasElement, evt: MouseEvent | TouchEvent): Position => {
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in evt ? evt.touches[0].clientX : evt.clientX
    const clientY = 'touches' in evt ? evt.touches[0].clientY : evt.clientY
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    }
  }, [])

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, from: Position, to: Position) => {
    const size = toolMode === 'brush' ? brushSize : eraserSize
    const composite = toolMode === 'brush' ? 'source-over' : 'destination-out'
    const opacity = toolMode === 'brush' ? 1 : eraserOpacity / 100
    const softness = toolMode === 'brush' ? 0 : Math.max(0, Math.min(1, 1 - eraserHardness / 100))
    const blurRadius = softness > 0 ? Math.max(0.25, (size / 2) * softness * 0.6) : 0

    ctx.save()
    ctx.globalCompositeOperation = composite
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(1, size)
    ctx.globalAlpha = opacity
    ctx.filter = blurRadius > 0 ? `blur(${blurRadius}px)` : 'none'
    ctx.strokeStyle = toolMode === 'brush' ? 'white' : 'rgba(0,0,0,1)'
    ctx.fillStyle = toolMode === 'brush' ? 'white' : 'rgba(0,0,0,1)'

    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(to.x, to.y, Math.max(1, size / 2), 0, 2 * Math.PI)
    ctx.fill()
    ctx.restore()

    strokeModifiedRef.current = true
  }, [toolMode, brushSize, eraserSize, eraserHardness, eraserOpacity])

  const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawingCanvasRef.current) return

    const ctx = drawingCanvasRef.current.getContext('2d')
    if (!ctx) {
      console.error('Failed to get drawing canvas context')
      return
    }

    const pos = getMousePos(drawingCanvasRef.current, e)
    isDrawingRef.current = true
    strokeModifiedRef.current = false
    lastPosRef.current = pos
    drawStroke(ctx, pos, pos)
  }, [drawingCanvasRef, getMousePos, drawStroke])

  const draw = useCallback((e: MouseEvent | TouchEvent) => {
    if (!drawingCanvasRef.current || !isDrawingRef.current) return

    try {
      e.preventDefault()
      const canvas = drawingCanvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Failed to get drawing canvas context')
        return
      }

      const pos = getMousePos(canvas, e)
      if (pos.x < 0 || pos.x > canvas.width || pos.y < 0 || pos.y > canvas.height) {
        return
      }

      drawStroke(ctx, lastPosRef.current, pos)
      lastPosRef.current = pos
    } catch (error) {
      console.error('Drawing operation failed:', error)
    }
  }, [drawingCanvasRef, getMousePos, drawStroke])

  const stopDrawing = useCallback(() => {
    if (!isDrawingRef.current) return

    isDrawingRef.current = false
    if (strokeModifiedRef.current) {
      requestAnimationFrame(() => {
        captureHistoryState()
      })
    }
    strokeModifiedRef.current = false
  }, [captureHistoryState])

  const clearMask = useCallback(() => {
    if (!drawingCanvasRef.current) {
      console.warn('Drawing canvas not available for clearing')
      return
    }

    try {
      const canvas = drawingCanvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Failed to get drawing canvas context for clearing')
        return
      }

      ctx.save()
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.restore()

      requestAnimationFrame(() => {
        captureHistoryState()
      })
    } catch (error) {
      console.error('Failed to clear mask:', error)
    }
  }, [drawingCanvasRef, captureHistoryState])

  useEffect(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const handleMouseDown = (e: MouseEvent) => startDrawing(e)
    const handleMouseMove = (e: MouseEvent) => draw(e)
    const handleMouseUp = () => stopDrawing()
    const handleMouseLeave = () => stopDrawing()

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      startDrawing(e)
    }
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      draw(e)
    }
    const handleTouchEnd = () => {
      stopDrawing()
    }

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [startDrawing, draw, stopDrawing, drawingCanvasRef])

  if (!imageFile) return null

  const activeSize = toolMode === 'brush' ? brushSize : eraserSize

  const handleSizeChange = (value: number) => {
    if (toolMode === 'brush') {
      setBrushSize(value)
    } else {
      setEraserSize(value)
    }
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-gray-700 mb-2">Draw Mask (with white brush)</p>
      <div className="relative border rounded-xl overflow-hidden bg-gray-100 shadow-inner">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-auto block"
          style={{
            imageRendering: 'auto',
            filter: 'brightness(0.85) contrast(1.1)'
          }}
        />
        <canvas
          ref={drawingCanvasRef}
          className="relative z-10 w-full h-auto cursor-crosshair block"
          style={{
            imageRendering: 'auto',
            mixBlendMode: 'normal',
            opacity: 1
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(45deg, transparent 49%, rgba(0,0,0,0.05) 50%, transparent 51%)',
            backgroundSize: '4px 4px',
            mixBlendMode: 'multiply'
          }}
        />
      </div>

      {/* 工具按鈕區域 */}
      <div className="mt-3 space-y-3">
        {/* 第一行：歷史控制按鈕 */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!historyMetrics.canUndo}
            className={`px-3 py-1.5 text-sm rounded-lg border ${historyMetrics.canUndo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!historyMetrics.canRedo}
            className={`px-3 py-1.5 text-sm rounded-lg border ${historyMetrics.canRedo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            ↷ Redo
          </button>
          <span className="text-xs text-gray-500 ml-2">
            History: {historyMetrics.index}/{MAX_HISTORY}
          </span>
        </div>

        {/* 第二行：工具選擇 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Tool:</span>
          <button
            type="button"
            onClick={() => setToolMode('brush')}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${toolMode === 'brush' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            🖌️ Brush
          </button>
          <button
            type="button"
            onClick={() => setToolMode('eraser')}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${toolMode === 'eraser' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}
          >
            🧹 Eraser
          </button>
          <button
            type="button"
            onClick={clearMask}
            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors ml-2"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      {/* 工具參數控制區域 */}
      <div className="mt-4 bg-gray-50 rounded-lg p-4">
        <div className="space-y-4">
          {/* 大小控制 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="toolSize" className="text-sm font-medium text-gray-700">
                {toolMode === 'brush' ? 'Brush' : 'Eraser'} Size
              </label>
              <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border">
                {activeSize}px
              </span>
            </div>
            <ProgressSlider
              id="toolSize"
              min={2}
              max={160}
              value={activeSize}
              onChange={handleSizeChange}
              className="w-full"
            />
          </div>

          {/* 橡皮擦專用控制 */}
          {toolMode === 'eraser' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="eraserHardness" className="text-sm font-medium text-gray-700">
                    Hardness
                  </label>
                  <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border">
                    {eraserHardness}%
                  </span>
                </div>
                <ProgressSlider
                  id="eraserHardness"
                  min={0}
                  max={100}
                  value={eraserHardness}
                  onChange={setEraserHardness}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  0% = Soft edge, 100% = Hard edge
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="eraserOpacity" className="text-sm font-medium text-gray-700">
                    Opacity
                  </label>
                  <span className="text-sm font-semibold text-gray-900 bg-white px-2 py-1 rounded border">
                    {eraserOpacity}%
                  </span>
                </div>
                <ProgressSlider
                  id="eraserOpacity"
                  min={10}
                  max={100}
                  step={5}
                  value={eraserOpacity}
                  onChange={setEraserOpacity}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">
                  How much to erase with each stroke
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
