'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Info, TrendingUp } from 'lucide-react';
import { YouTubeVideo, AbsoluteTier, RelativeTier } from '@/types/channel-optimization';

interface DualScoreDisplayProps {
  video: YouTubeVideo;
  showProgress?: boolean;
  variant?: 'compact' | 'detailed' | 'minimal';
  className?: string;
}

export function DualScoreDisplay({ 
  video, 
  showProgress = false, 
  variant = 'detailed',
  className 
}: DualScoreDisplayProps) {
  const absoluteScore = video.absoluteScore ?? 0;
  const relativeScore = video.relativeScore ?? 0;
  const absoluteTier = getAbsoluteTier(absoluteScore);
  const relativeTier = getRelativeTier(relativeScore);

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="text-sm font-medium">{absoluteScore}</div>
        <div className="text-xs text-muted-foreground">|</div>
        <div className="text-sm font-medium text-blue-600">{relativeScore}</div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2", className)}>
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-amber-500" />
                  <span className="text-sm font-medium">{absoluteScore}</span>
                  <Badge variant="outline" className={cn("text-xs px-1 py-0 hidden sm:inline-flex", absoluteTier.color)}>
                    {absoluteTier.label}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">YouTube Universal Score</p>
                  <p className="text-xs text-muted-foreground">{absoluteTier.label}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="w-px h-4 bg-border hidden sm:block" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-medium text-blue-600">{relativeScore}</span>
                  <Badge variant="outline" className={cn("text-xs px-1 py-0 hidden sm:inline-flex", relativeTier.color)}>
                    {relativeTier.label}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <p className="font-medium">Channel Relative Score</p>
                  <p className="text-xs text-muted-foreground">{relativeTier.label}</p>
                  {video.relativeRatio && (
                    <p className="text-xs text-muted-foreground">
                      {video.relativeRatio.toFixed(1)}x channel median
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Mobile: Show badges below scores */}
        <div className="flex gap-1 sm:hidden">
          <Badge variant="outline" className={cn("text-xs px-1 py-0", absoluteTier.color)}>
            {absoluteTier.label}
          </Badge>
          <Badge variant="outline" className={cn("text-xs px-1 py-0", relativeTier.color)}>
            {relativeTier.label}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Score Headers */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Performance Scores</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <div>
                    <p className="font-medium text-amber-600">Universal Score</p>
                    <p className="text-xs">Based on YouTube-wide standards and best practices</p>
                  </div>
                  <div>
                    <p className="font-medium text-blue-600">Channel Score</p>
                    <p className="text-xs">Compared to this channel's own performance history</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Dual Score Display */}
      <div className="grid grid-cols-2 gap-4">
        {/* Absolute Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-medium text-amber-700">Universal</span>
            </div>
            <span className="text-lg font-bold text-amber-600">{absoluteScore}</span>
          </div>
          {showProgress && (
            <Progress 
              value={absoluteScore} 
              className="h-2"
              style={{
                backgroundColor: 'rgb(254 243 199)', // amber-100
                ['--progress-foreground' as any]: absoluteTier.color
              }}
            />
          )}
          <Badge 
            variant="outline" 
            className={cn("text-xs w-full justify-center", absoluteTier.color)}
          >
            {absoluteTier.label}
          </Badge>
        </div>

        {/* Relative Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium text-blue-700">Channel</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{relativeScore}</span>
          </div>
          {showProgress && (
            <Progress 
              value={relativeScore} 
              className="h-2"
              style={{
                backgroundColor: 'rgb(219 234 254)', // blue-100
                ['--progress-foreground' as any]: relativeTier.color
              }}
            />
          )}
          <Badge 
            variant="outline" 
            className={cn("text-xs w-full justify-center", relativeTier.color)}
          >
            {relativeTier.label}
          </Badge>
        </div>
      </div>

      {/* Comparison Indicator */}
      {video.relativeRatio && video.relativeRatio !== 1 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
          <TrendingUp className="h-3 w-3" />
          <span>
            {video.relativeRatio > 1 
              ? `${video.relativeRatio.toFixed(1)}x above channel median`
              : `${(1 / video.relativeRatio).toFixed(1)}x below channel median`
            }
          </span>
        </div>
      )}
    </div>
  );
}

// Helper functions for tier calculation
function getAbsoluteTier(score: number): AbsoluteTier {
  if (score >= 80) {
    return {
      tier: 'youtube-top',
      label: 'YouTube頂尖',
      color: 'bg-green-100 text-green-800 border-green-200',
      range: [80, 100]
    };
  }
  if (score >= 60) {
    return {
      tier: 'youtube-high',
      label: 'YouTube高表現',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      range: [60, 79]
    };
  }
  if (score >= 40) {
    return {
      tier: 'youtube-medium',
      label: 'YouTube中等',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      range: [40, 59]
    };
  }
  if (score >= 20) {
    return {
      tier: 'youtube-normal',
      label: 'YouTube普通',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      range: [20, 39]
    };
  }
  return {
    tier: 'needs-improvement',
    label: '需要改進',
    color: 'bg-red-100 text-red-800 border-red-200',
    range: [0, 19]
  };
}

function getRelativeTier(score: number): RelativeTier {
  if (score >= 70) {
    return {
      tier: 'channel-star',
      label: '頻道之星',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      range: [70, 100]
    };
  }
  if (score >= 50) {
    return {
      tier: 'above-average',
      label: '高於平均',
      color: 'bg-green-100 text-green-800 border-green-200',
      range: [50, 69]
    };
  }
  if (score >= 30) {
    return {
      tier: 'near-average',
      label: '接近平均',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      range: [30, 49]
    };
  }
  return {
    tier: 'below-average',
    label: '低於平均',
    color: 'bg-red-100 text-red-800 border-red-200',
    range: [0, 29]
  };
}