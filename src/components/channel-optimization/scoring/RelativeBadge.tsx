'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Star, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';

interface RelativeBadgeProps {
  score: number;
  tier: 'channel-star' | 'above-average' | 'near-average' | 'below-average';
  relativeRatio?: number;
  variant?: 'default' | 'compact' | 'icon-only' | 'with-ratio';
  showIcon?: boolean;
  className?: string;
}

export function RelativeBadge({ 
  score, 
  tier, 
  relativeRatio,
  variant = 'default', 
  showIcon = true,
  className 
}: RelativeBadgeProps) {
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

  if (variant === 'with-ratio' && relativeRatio) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Badge 
          variant="outline" 
          className={cn("gap-1.5 px-2.5 py-1", tierConfig.badgeColor)}
        >
          {showIcon && <Icon className="h-3.5 w-3.5" />}
          <div className="flex items-center gap-1">
            <span className="font-semibold">{score}</span>
            <span className="text-xs opacity-75">•</span>
            <span className="text-xs">{tierConfig.label}</span>
          </div>
        </Badge>
        
        {relativeRatio !== 1 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "gap-1 text-xs px-2 py-0.5",
              relativeRatio > 1 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}
          >
            {relativeRatio > 1 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            <span>
              {relativeRatio > 1 
                ? `${relativeRatio.toFixed(1)}x`
                : `${(1 / relativeRatio).toFixed(1)}x`
              }
            </span>
          </Badge>
        )}
      </div>
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

function getTierConfig(tier: RelativeBadgeProps['tier']) {
  switch (tier) {
    case 'channel-star':
      return {
        label: '頻道之星',
        icon: Star,
        iconColor: 'text-amber-600',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
      };
    case 'above-average':
      return {
        label: '高於平均',
        icon: TrendingUp,
        iconColor: 'text-emerald-600',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100',
      };
    case 'near-average':
      return {
        label: '接近平均',
        icon: Minus,
        iconColor: 'text-slate-600',
        badgeColor: 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100',
      };
    case 'below-average':
      return {
        label: '低於平均',
        icon: TrendingDown,
        iconColor: 'text-rose-600',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100',
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