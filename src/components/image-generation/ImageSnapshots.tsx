'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react'
import { Trash2, Package } from 'lucide-react'
import { GenerationSnapshot } from '@/hooks/useImageGeneration'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertDialog } from '@/components/ui/alert-dialog'

type SnapshotOrientation = 'horizontal' | 'vertical'

// AI 模型輔助函數
const getModelIcon = (modelId: string): string => {
  switch (modelId) {
    case 'nano-banana':
      return '⚡'
    case 'seedream-v4':
      return '📸'
    default:
      return '🤖'
  }
}

const getModelShortName = (modelId: string): string => {
  switch (modelId) {
    case 'nano-banana':
      return 'Nano'
    case 'seedream-v4':
      return 'Seed'
    default:
      return modelId.slice(0, 4)
  }
}

const getModelFullName = (modelId: string): string => {
  switch (modelId) {
    case 'nano-banana':
      return 'Nano Banana'
    case 'seedream-v4':
      return 'Seedream V4.0'
    default:
      return modelId
  }
}

const getModelBadgeColor = (modelId: string): string => {
  switch (modelId) {
    case 'nano-banana':
      return 'bg-purple-100 text-purple-700 border-purple-200' // 推薦模型用淡紫色
    case 'seedream-v4':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

interface ImageSnapshotsProps {
  snapshots: GenerationSnapshot[]
  activeSnapshotId: string | null
  onSelect: (snapshotId: string) => void
  onDelete: (snapshotId: string) => void
  orientation?: SnapshotOrientation
  className?: string
}

interface SnapshotItemProps {
  snapshot: GenerationSnapshot
  isActive: boolean
  onSelect: (snapshotId: string) => void
  onDelete: (snapshotId: string) => void
  orientation: SnapshotOrientation
}

function SnapshotItem({ snapshot, isActive, onSelect, onDelete, orientation }: SnapshotItemProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(snapshot.blob)
    setPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [snapshot.blob])

  const formattedTime = useMemo(() => {
    return new Date(snapshot.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [snapshot.createdAt])

  // 截取 prompt 預覽文字
  const promptPreview = useMemo(() => {
    if (!snapshot.prompt) return ''
    return snapshot.prompt.length > 40 
      ? snapshot.prompt.substring(0, 40) + '...'
      : snapshot.prompt
  }, [snapshot.prompt])

  const wrapperClass = orientation === 'vertical'
    ? `relative w-full max-w-[220px] ${isActive ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`
    : `relative w-32 shrink-0 ${isActive ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`

  return (
    <>
      <div className={wrapperClass}>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`group block w-full overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                isActive ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 hover:border-blue-400'
              }`}
              onClick={() => onSelect(snapshot.id)}
              >
                <div className="relative aspect-square bg-gray-50">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Snapshot preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-xs text-gray-400">Loading…</div>
                  )}
                  
                  {/* 右上角三層結構：批次徽章 + 模型徽章 + 刪除按鈕 */}
                  <div className="absolute top-2 right-2 flex items-start gap-1">
                    {/* 批次組徽章 */}
                    {snapshot.batchGroupId && snapshot.batchGroupSize && snapshot.batchGroupSize > 1 && (
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-700 border-orange-200 backdrop-blur-sm pointer-events-none"
                            >
                              <Package className="size-2.5 mr-1" />
                              {snapshot.batchIndex !== undefined ? snapshot.batchIndex + 1 : '?'}/{snapshot.batchGroupSize}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>批次生成組 ({snapshot.batchGroupSize} 張)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    {/* 內層：模型徽章 */}
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0.5 ${getModelBadgeColor(snapshot.selectedModel)} backdrop-blur-sm pointer-events-none`}
                          >
                            <span className="mr-1">{getModelIcon(snapshot.selectedModel)}</span>
                            {getModelShortName(snapshot.selectedModel)}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getModelFullName(snapshot.selectedModel)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {/* 外層：刪除按鈕 */}
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setShowDeleteDialog(true)
                            }}
                            className="inline-flex size-6 items-center justify-center rounded-full bg-white/90 shadow transition-all duration-200 hover:bg-red-50 hover:shadow-md hover:scale-110 backdrop-blur-sm"
                            aria-label="Delete snapshot"
                          >
                            <Trash2 className="size-3 text-gray-500 hover:text-red-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>刪除此快照</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className="flex flex-col px-3 py-2 text-left">
                  <span className="text-xs font-medium text-gray-600">{formattedTime}</span>
                  {snapshot.prompt && (
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <span className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {promptPreview}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-sm">
                        <p className="text-sm">{snapshot.prompt}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>點擊恢復此設置</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="確認刪除"
        description="確定要刪除此快照嗎？此操作無法復原。"
        cancelText="取消"
        confirmText="刪除"
        confirmVariant="destructive"
        onConfirm={() => {
          onDelete(snapshot.id)
        }}
      />
    </>
  )
}

export function ImageSnapshots({ snapshots, activeSnapshotId, onSelect, onDelete, orientation = 'horizontal', className }: ImageSnapshotsProps) {
  const isVertical = orientation === 'vertical'
  
  if (snapshots.length === 0) {
    return (
      <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${isVertical ? 'h-full min-h-[240px]' : 'mt-6'} ${className ?? ''}`}>
        <div className={`flex h-full items-center justify-center p-8 text-center ${isVertical ? 'flex-col' : ''}`}>
          <div className="text-gray-400">
            <svg
              className="mx-auto mb-3 h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm font-medium">尚無快照</p>
            <p className="mt-1 text-xs">生成的圖片會自動保存在此</p>
          </div>
        </div>
      </div>
    )
  }

  const VISIBLE_LIMIT = 4
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldShowToggle = isVertical && snapshots.length > VISIBLE_LIMIT

  useEffect(() => {
    if (!shouldShowToggle && isExpanded) {
      setIsExpanded(false)
    }
  }, [shouldShowToggle, isExpanded])

  const displayedSnapshots = useMemo(() => {
    if (isVertical && !isExpanded) {
      return snapshots.slice(0, VISIBLE_LIMIT)
    }
    return snapshots
  }, [isExpanded, isVertical, snapshots])

  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm ${isVertical ? 'flex h-full min-h-[240px] w-full max-w-[250px] flex-col' : 'mt-6 p-4'} ${className ?? ''}`}>
      <div className={`flex items-center justify-between ${isVertical ? 'px-4 pt-3' : 'mb-3'}`}>
        <h3 className="text-sm font-semibold text-gray-800">快照歷史</h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {snapshots.length}
        </span>
      </div>
      <div
        className={isVertical
          ? `flex-1 px-4 pb-4 flex flex-col gap-3 items-center pt-1 ${isExpanded ? 'overflow-y-auto' : ''}`
          : 'flex gap-4 overflow-x-auto pb-1'}
      >
        {displayedSnapshots.map((snapshot) => (
          <SnapshotItem
            key={snapshot.id}
            snapshot={snapshot}
            isActive={snapshot.id === activeSnapshotId}
            onSelect={onSelect}
            onDelete={onDelete}
            orientation={orientation}
          />
        ))}
      </div>
      {shouldShowToggle && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:shadow-sm active:scale-[0.98]"
          >
            {isExpanded ? '收合' : '展開全部'}
          </button>
        </div>
      )}
    </div>
  )
}
