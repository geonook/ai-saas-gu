'use client'

import { useEffect, useRef } from 'react'

interface ProgressSliderProps {
  id?: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (value: number) => void
  className?: string
  disabled?: boolean
}

export function ProgressSlider({
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  className = '',
  disabled = false
}: ProgressSliderProps) {
  const sliderRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // 更新進度條
  const updateProgress = () => {
    if (!sliderRef.current || !progressRef.current) return

    const percentage = ((value - min) / (max - min)) * 100
    progressRef.current.style.width = `${percentage}%`
  }

  // 處理滑桿變化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    onChange(newValue)
  }

  // 當值改變時更新進度條
  useEffect(() => {
    updateProgress()
  }, [value, min, max])

  return (
    <div className={`relative ${className}`}>
      {/* 進度條背景 */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* 已填充的進度條 */}
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-200 ease-out"
          style={{ width: '0%' }}
        />
      </div>

      {/* 實際的 range input */}
      <input
        ref={sliderRef}
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="relative z-10 w-full h-2 bg-transparent cursor-pointer appearance-none slider-transparent"
        style={{
          background: 'transparent'
        }}
      />

      <style jsx>{`
        .slider-transparent {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }

        .slider-transparent::-webkit-slider-track {
          background: transparent;
          height: 8px;
        }

        .slider-transparent::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: #3b82f6;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
          position: relative;
          z-index: 3;
        }

        .slider-transparent::-webkit-slider-thumb:hover {
          background: #2563eb;
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .slider-transparent::-moz-range-track {
          background: transparent;
          height: 8px;
          border: none;
        }

        .slider-transparent::-moz-range-thumb {
          background: #3b82f6;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        .slider-transparent::-moz-range-thumb:hover {
          background: #2563eb;
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .slider-transparent:focus {
          outline: none;
        }

        .slider-transparent:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .slider-transparent:focus::-moz-range-thumb {
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .slider-transparent:disabled {
          cursor: not-allowed;
        }

        .slider-transparent:disabled::-webkit-slider-thumb {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .slider-transparent:disabled::-moz-range-thumb {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}