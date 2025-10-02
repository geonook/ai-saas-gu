'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Target, Star, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PerformanceBadgeProps {
  score: number;
  tier: 'youtube-top' | 'youtube-high' | 'youtube-medium' | 'youtube-normal' | 'needs-improvement';
  variant?: 'default' | 'compact' | 'icon-only';
  showIcon?: boolean;
  className?: string;
}

export function PerformanceBadge({ 
  score, 
  tier, 
  variant = 'default', 
  showIcon = true,
  className 
}: PerformanceBadgeProps) {
  const tierConfig = getTierConfig(tier);
  const Icon = tierConfig.icon;

  if (variant === 'icon-only') {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <Icon className={cn("h-4 w-4", tierConfig.iconColor)} />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Badge 
        variant="outline" 
        className={cn("gap-1 text-xs", tierConfig.badgeColor, className)}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        <span className="font-medium">{score}</span>
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("gap-1.5 px-2.5 py-1", tierConfig.badgeColor, className)}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <div className="flex items-center gap-1">
        <span className="font-semibold">{score}</span>
        <span className="text-xs opacity-75">•</span>
        <span className="text-xs">{tierConfig.label}</span>
      </div>
    </Badge>
  );
}

function getTierConfig(tier: PerformanceBadgeProps['tier']) {
  switch (tier) {
    case 'youtube-top':
      return {
        label: 'YouTube頂尖',
        icon: Trophy,
        iconColor: 'text-yellow-600',
        badgeColor: 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
      };
    case 'youtube-high':
      return {
        label: 'YouTube高表現',
        icon: Award,
        iconColor: 'text-blue-600',
        badgeColor: 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100',
      };
    case 'youtube-medium':
      return {
        label: 'YouTube中等',
        icon: Target,
        iconColor: 'text-amber-600',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      };
    case 'youtube-normal':
      return {
        label: 'YouTube普通',
        icon: Minus,
        iconColor: 'text-orange-600',
        badgeColor: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100',
      };
    case 'needs-improvement':
      return {
        label: '需要改進',
        icon: TrendingDown,
        iconColor: 'text-red-600',
        badgeColor: 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100',
      };
    default:
      return {
        label: 'Unknown',
        icon: Minus,
        iconColor: 'text-gray-600',
        badgeColor: 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100',
      };
  }
}