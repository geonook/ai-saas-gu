'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Clock, Sparkles } from 'lucide-react'

export interface AIModel {
  id: string
  name: string
  description: string
  inferenceTime: string
  strengths: string[]
  recommended?: boolean
  type: 'realistic' | 'artistic' | 'hybrid'
}

const AI_MODELS: AIModel[] = [ 
{
    id: 'nano-banana',
    name: 'Nano Banana',
    description: '智能理解，平衡品質',
    inferenceTime: '~60s',
    strengths: ['文字理解', '概念', '創新'],
    recommended: true,
    type: 'hybrid'
  },
  {
    id: 'seedream-v4',
    name: 'Seedream V4.0',
    description: '新一代，高保真度',
    inferenceTime: '~60s',
    strengths: ['中文支持', '概念', '保真度'],
    type: 'realistic'
  }
]

const LOCAL_STORAGE_KEY = 'ai-model-preference'

interface AIModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  className?: string
  disabled?: boolean
}

const getModelTypeIcon = (type: AIModel['type']) => {
  switch (type) {
    case 'realistic':
      return '📸'
    case 'artistic':
      return '🎨'
    case 'hybrid':
      return '⚡'
    default:
      return '🤖'
  }
}

export function AIModelSelector({ 
  selectedModel, 
  onModelChange, 
  className,
  disabled = false 
}: AIModelSelectorProps) {
  const [mounted, setMounted] = useState(false)

  // Handle hydration
  useEffect(() => {
    setMounted(true)
    
    // Load saved preference from localStorage
    const savedModel = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (savedModel && AI_MODELS.find(model => model.id === savedModel)) {
      onModelChange(savedModel)
    }
  }, [onModelChange])

  const handleModelChange = (modelId: string) => {
    onModelChange(modelId)
    // Persist to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, modelId)
  }

  const selectedModelData = AI_MODELS.find(model => model.id === selectedModel)

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: '#000000' }}>AI Model</span>
        <div className="h-9 w-48 rounded-md border border-input bg-gray-50 animate-pulse" />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      <label htmlFor="ai-model-select" className="text-sm font-medium whitespace-nowrap" style={{ color: '#000000' }}>
        AI Model
      </label>
      <Select
        value={selectedModel}
        onValueChange={handleModelChange}
        disabled={disabled}
      >
        <SelectTrigger id="ai-model-select" className="w-48 text-gray-900">
          <SelectValue>
            {selectedModelData ? (
              <div className="flex items-center gap-2 text-gray-900">
                <span className="text-sm">
                  {getModelTypeIcon(selectedModelData.type)}
                </span>
                <span className="truncate text-sm font-medium text-gray-900">{selectedModelData.name}</span>
                {selectedModelData.recommended && (
                  <Badge
                    variant="outline"
                    className="ml-auto border-gray-300 bg-white text-gray-600 text-xs px-1.5 py-0"
                  >
                    推薦
                  </Badge>
                )}
              </div>
            ) : (
              'Select model...'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AI_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-start gap-3 py-1">
                <span className="text-lg mt-0.5">
                  {getModelTypeIcon(model.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{model.name}</span>
                    {model.recommended && (
                      <Badge
                        variant="outline"
                        className="border-gray-300 bg-white text-gray-600 text-xs px-1.5 py-0"
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-gray-500" />
                        推薦
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {model.description}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {model.inferenceTime}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {model.strengths.map((strength, index) => (
                        <span
                          key={index}
                          className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export { AI_MODELS }
