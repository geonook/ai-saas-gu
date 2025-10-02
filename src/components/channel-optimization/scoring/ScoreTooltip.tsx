'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Info, Trophy, Target, BarChart3, Users, Eye, ThumbsUp } from 'lucide-react';
import { YouTubeVideo } from '@/types/channel-optimization';

interface ScoreTooltipProps {
  video: YouTubeVideo;
  type?: 'absolute' | 'relative' | 'both';
  children: React.ReactNode;
  className?: string;
}

export function ScoreTooltip({ 
  video, 
  type = 'both', 
  children,
  className 
}: ScoreTooltipProps) {
  const absoluteScore = video.absoluteScore ?? 0;
  const relativeScore = video.relativeScore ?? 0;

  const getAbsoluteExplanation = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-amber-600">
        <Trophy className="h-4 w-4" />
        <span className="font-semibold">YouTube Universal Score: {absoluteScore}</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Based on YouTube-wide standards including:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Click-through rates vs category average</li>
          <li>Watch time and retention metrics</li>
          <li>Engagement rate (likes, comments, shares)</li>
          <li>Title and thumbnail optimization</li>
        </ul>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {getAbsoluteTierLabel(absoluteScore)}
        </Badge>
      </div>
    </div>
  );

  const getRelativeExplanation = () => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-600">
        <Target className="h-4 w-4" />
        <span className="font-semibold">Channel Relative Score: {relativeScore}</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>Compared to this channel's performance:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Views per subscriber ratio</li>
          <li>Engagement vs channel average</li>
          <li>Performance relative to channel size</li>
          <li>Success compared to similar content</li>
        </ul>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-xs">
          {getRelativeTierLabel(relativeScore)}
        </Badge>
        {video.relativeRatio && video.relativeRatio !== 1 && (
          <Badge variant="secondary" className="text-xs">
            {video.relativeRatio > 1 
              ? `${video.relativeRatio.toFixed(1)}x above median`
              : `${(1 / video.relativeRatio).toFixed(1)}x below median`
            }
          </Badge>
        )}
      </div>
    </div>
  );

  const getBothExplanation = () => (
    <div className="space-y-4 max-w-sm">
      <div className="text-center">
        <h4 className="font-semibold text-sm mb-1">Performance Scoring System</h4>
        <p className="text-xs text-muted-foreground">Dual-perspective video analysis</p>
      </div>
      
      {getAbsoluteExplanation()}
      
      <div className="border-t border-border my-3" />
      
      {getRelativeExplanation()}
      
      <div className="border-t border-border my-3" />
      
      <div className="bg-muted/50 rounded p-2">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Key Metrics</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {video.viewCount && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{formatNumber(video.viewCount)} views</span>
            </div>
          )}
          {video.likeCount && (
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              <span>{formatNumber(video.likeCount)} likes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getTooltipContent = () => {
    switch (type) {
      case 'absolute':
        return getAbsoluteExplanation();
      case 'relative':
        return getRelativeExplanation();
      case 'both':
      default:
        return getBothExplanation();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("cursor-help", className)}>
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-0">
          <div className="p-3">
            {getTooltipContent()}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact info button component for scores
export function ScoreInfoButton({ 
  video, 
  type = 'both',
  className 
}: { 
  video: YouTubeVideo; 
  type?: 'absolute' | 'relative' | 'both';
  className?: string;
}) {
  return (
    <ScoreTooltip video={video} type={type} className={className}>
      <Info className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
    </ScoreTooltip>
  );
}

// Helper functions
function getAbsoluteTierLabel(score: number): string {
  if (score >= 80) return 'YouTube頂尖';
  if (score >= 60) return 'YouTube高表現';
  if (score >= 40) return 'YouTube中等';
  if (score >= 20) return 'YouTube普通';
  return '需要改進';
}

function getRelativeTierLabel(score: number): string {
  if (score >= 70) return '頻道之星';
  if (score >= 50) return '高於平均';
  if (score >= 30) return '接近平均';
  return '低於平均';
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}