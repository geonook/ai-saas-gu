'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, Equal, TrendingUp, TrendingDown } from 'lucide-react';

interface ComparisonIndicatorProps {
  relativeRatio: number;
  variant?: 'default' | 'compact' | 'minimal';
  showTrend?: boolean;
  className?: string;
}

export function ComparisonIndicator({ 
  relativeRatio, 
  variant = 'default',
  showTrend = true,
  className 
}: ComparisonIndicatorProps) {
  const isAbove = relativeRatio > 1;
  const isEqual = Math.abs(relativeRatio - 1) < 0.1; // Consider ratios between 0.9-1.1 as "equal"
  const ratio = isAbove ? relativeRatio : (1 / relativeRatio);
  
  const getComparisonText = () => {
    if (isEqual) return '接近頻道中位數';
    
    if (isAbove) {
      if (relativeRatio >= 3) return `遠超頻道平均 (${ratio.toFixed(1)}x)`;
      if (relativeRatio >= 2) return `大幅超越 (${ratio.toFixed(1)}x)`;
      if (relativeRatio >= 1.5) return `明顯超越 (${ratio.toFixed(1)}x)`;
      return `輕微超越 (${ratio.toFixed(1)}x)`;
    } else {
      if (relativeRatio <= 0.33) return `遠低於平均 (${ratio.toFixed(1)}x)`;
      if (relativeRatio <= 0.5) return `大幅低於 (${ratio.toFixed(1)}x)`;
      if (relativeRatio <= 0.67) return `明顯低於 (${ratio.toFixed(1)}x)`;
      return `輕微低於 (${ratio.toFixed(1)}x)`;
    }
  };

  const getIcon = () => {
    if (isEqual) return Equal;
    return isAbove ? ArrowUp : ArrowDown;
  };

  const getTrendIcon = () => {
    if (isEqual) return Equal;
    return isAbove ? TrendingUp : TrendingDown;
  };

  const getColorClasses = () => {
    if (isEqual) return 'bg-slate-100 text-slate-700 border-slate-200';
    
    if (isAbove) {
      if (relativeRatio >= 2) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      return 'bg-green-100 text-green-800 border-green-200';
    } else {
      if (relativeRatio <= 0.5) return 'bg-red-100 text-red-800 border-red-200';
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  if (variant === 'minimal') {
    const Icon = getIcon();
    return (
      <div className={cn("flex items-center gap-1 text-xs", className)}>
        <Icon className={cn("h-3 w-3", isAbove ? 'text-green-600' : isEqual ? 'text-slate-600' : 'text-red-600')} />
        <span className="font-medium">{ratio.toFixed(1)}x</span>
      </div>
    );
  }

  if (variant === 'compact') {
    const Icon = getIcon();
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 text-xs px-2 py-0.5", getColorClasses(), className)}
      >
        <Icon className="h-3 w-3" />
        <span>{ratio.toFixed(1)}x</span>
      </Badge>
    );
  }

  const Icon = showTrend ? getTrendIcon() : getIcon();
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 px-3 py-1.5 text-xs font-medium",
        getColorClasses(),
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{getComparisonText()}</span>
    </Badge>
  );
}

// Helper function to get comparison summary for multiple videos
export function getChannelComparisonSummary(videos: Array<{ relativeRatio?: number }>) {
  const validRatios = videos
    .map(v => v.relativeRatio)
    .filter((ratio): ratio is number => typeof ratio === 'number' && ratio > 0);
  
  if (validRatios.length === 0) return null;
  
  const above = validRatios.filter(r => r > 1.1).length;
  const equal = validRatios.filter(r => r >= 0.9 && r <= 1.1).length;
  const below = validRatios.filter(r => r < 0.9).length;
  const total = validRatios.length;
  
  return {
    above: { count: above, percentage: (above / total) * 100 },
    equal: { count: equal, percentage: (equal / total) * 100 },
    below: { count: below, percentage: (below / total) * 100 },
    total,
    averageRatio: validRatios.reduce((sum, r) => sum + r, 0) / validRatios.length,
  };
}