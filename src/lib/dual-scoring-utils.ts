// Dual Scoring System Utilities
// 雙軌評分系統工具函數

import {
  YouTubeVideo,
  ABSOLUTE_TIER_CONFIG,
  RELATIVE_TIER_CONFIG,
  AbsoluteTier,
  RelativeTier,
} from '@/types/channel-optimization';

/**
 * 根據絕對分數確定等級 - 調整為新的區間
 */
export function determineAbsoluteTier(score: number): AbsoluteTier['tier'] {
  if (score >= 85) return 'youtube-top';    // YouTube頂尖
  if (score >= 70) return 'youtube-high';   // YouTube優秀
  if (score >= 55) return 'youtube-medium'; // YouTube良好
  if (score >= 40) return 'youtube-normal'; // YouTube中等
  return 'needs-improvement';               // 需要改善
}

/**
 * 根據相對分數確定等級
 */
export function determineRelativeTier(score: number): RelativeTier['tier'] {
  if (score >= 70) return 'channel-star';
  if (score >= 50) return 'above-average';
  if (score >= 30) return 'near-average';
  return 'below-average';
}

/**
 * 獲取絕對評級的配置信息
 */
export function getAbsoluteTierConfig(tier: AbsoluteTier['tier']) {
  return ABSOLUTE_TIER_CONFIG[tier];
}

/**
 * 獲取相對評級的配置信息
 */
export function getRelativeTierConfig(tier: RelativeTier['tier']) {
  return RELATIVE_TIER_CONFIG[tier];
}

/**
 * 計算影片的相對表現比率文字描述
 */
export function formatRelativeRatio(ratio: number): string {
  if (ratio >= 3.0) return `${ratio.toFixed(1)}x 爆款表現`;
  if (ratio >= 2.0) return `${ratio.toFixed(1)}x 優秀表現`;
  if (ratio >= 1.5) return `${ratio.toFixed(1)}x 良好表現`;
  if (ratio >= 1.0) return `${ratio.toFixed(1)}x 平均水準`;
  if (ratio >= 0.7) return `${ratio.toFixed(1)}x 略低於平均`;
  return `${ratio.toFixed(1)}x 低於平均`;
}

/**
 * 獲取雙重評分的綜合判斷
 */
export function getDualScoreInsight(
  absoluteScore: number, 
  relativeScore: number
): {
  category: 'star-performer' | 'consistent-quality' | 'hidden-gem' | 'needs-improvement';
  description: string;
  color: string;
} {
  const isAbsoluteHigh = absoluteScore >= 60;
  const isRelativeHigh = relativeScore >= 50;

  if (isAbsoluteHigh && isRelativeHigh) {
    return {
      category: 'star-performer',
      description: '明星影片：絕對優秀 + 頻道亮點',
      color: '#dc2626' // red-600
    };
  }
  
  if (isAbsoluteHigh && !isRelativeHigh) {
    return {
      category: 'consistent-quality',
      description: '穩定品質：頻道整體表現優秀',
      color: '#ea580c' // orange-600
    };
  }
  
  if (!isAbsoluteHigh && isRelativeHigh) {
    return {
      category: 'hidden-gem',
      description: '隱藏瑰寶：頻道內的突出表現',
      color: '#ca8a04' // yellow-600
    };
  }
  
  return {
    category: 'needs-improvement',
    description: '有待改進：兩項指標都需要提升',
    color: '#6b7280' // gray-500
  };
}

/**
 * 過濾影片根據雙重評分標準
 */
export function filterVideosByDualScoring(
  videos: YouTubeVideo[],
  filters: {
    absoluteTier?: AbsoluteTier['tier'][];
    relativeTier?: RelativeTier['tier'][];
    minAbsoluteScore?: number;
    minRelativeScore?: number;
    insightCategory?: string[];
  }
): YouTubeVideo[] {
  return videos.filter(video => {
    // 檢查絕對等級篩選
    if (filters.absoluteTier && filters.absoluteTier.length > 0) {
      if (!video.absoluteTier || !filters.absoluteTier.includes(video.absoluteTier)) {
        return false;
      }
    }

    // 檢查相對等級篩選
    if (filters.relativeTier && filters.relativeTier.length > 0) {
      if (!video.relativeTier || !filters.relativeTier.includes(video.relativeTier)) {
        return false;
      }
    }

    // 檢查最小絕對分數
    if (filters.minAbsoluteScore !== undefined) {
      if (!video.absoluteScore || video.absoluteScore < filters.minAbsoluteScore) {
        return false;
      }
    }

    // 檢查最小相對分數
    if (filters.minRelativeScore !== undefined) {
      if (!video.relativeScore || video.relativeScore < filters.minRelativeScore) {
        return false;
      }
    }

    // 檢查綜合判斷類別
    if (filters.insightCategory && filters.insightCategory.length > 0) {
      if (video.absoluteScore !== undefined && video.relativeScore !== undefined) {
        const insight = getDualScoreInsight(video.absoluteScore, video.relativeScore);
        if (!filters.insightCategory.includes(insight.category)) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  });
}

/**
 * 排序影片根據雙重評分
 */
export function sortVideosByDualScoring(
  videos: YouTubeVideo[],
  sortBy: 'absolute' | 'relative' | 'combined' | 'ratio'
): YouTubeVideo[] {
  return [...videos].sort((a, b) => {
    switch (sortBy) {
      case 'absolute':
        return (b.absoluteScore || 0) - (a.absoluteScore || 0);
      
      case 'relative':
        return (b.relativeScore || 0) - (a.relativeScore || 0);
      
      case 'combined':
        // 綜合分數：絕對分數 60% + 相對分數 40%
        const scoreA = (a.absoluteScore || 0) * 0.6 + (a.relativeScore || 0) * 0.4;
        const scoreB = (b.absoluteScore || 0) * 0.6 + (b.relativeScore || 0) * 0.4;
        return scoreB - scoreA;
      
      case 'ratio':
        return (b.relativeRatio || 0) - (a.relativeRatio || 0);
      
      default:
        return (b.viewCount || 0) - (a.viewCount || 0);
    }
  });
}

/**
 * 計算頻道雙重評分統計摘要
 */
export function calculateDualScoringStats(videos: YouTubeVideo[]): {
  totalWithScores: number;
  averageAbsoluteScore: number;
  averageRelativeScore: number;
  tierDistribution: {
    absolute: Record<AbsoluteTier['tier'], number>;
    relative: Record<RelativeTier['tier'], number>;
  };
  insightDistribution: Record<string, number>;
} {
  const videosWithScores = videos.filter(v => 
    v.absoluteScore !== undefined && v.relativeScore !== undefined
  );

  if (videosWithScores.length === 0) {
    return {
      totalWithScores: 0,
      averageAbsoluteScore: 0,
      averageRelativeScore: 0,
      tierDistribution: {
        absolute: {
          'youtube-top': 0,
          'youtube-high': 0,
          'youtube-medium': 0,
          'youtube-normal': 0,
          'needs-improvement': 0,
        },
        relative: {
          'channel-star': 0,
          'above-average': 0,
          'near-average': 0,
          'below-average': 0,
        },
      },
      insightDistribution: {},
    };
  }

  // 計算平均分數
  const avgAbsolute = videosWithScores.reduce((sum, v) => sum + (v.absoluteScore || 0), 0) / videosWithScores.length;
  const avgRelative = videosWithScores.reduce((sum, v) => sum + (v.relativeScore || 0), 0) / videosWithScores.length;

  // 計算等級分佈
  const absoluteTierDist: Record<AbsoluteTier['tier'], number> = {
    'youtube-top': 0,
    'youtube-high': 0,
    'youtube-medium': 0,
    'youtube-normal': 0,
    'needs-improvement': 0,
  };

  const relativeTierDist: Record<RelativeTier['tier'], number> = {
    'channel-star': 0,
    'above-average': 0,
    'near-average': 0,
    'below-average': 0,
  };

  const insightDist: Record<string, number> = {};

  videosWithScores.forEach(video => {
    if (video.absoluteTier) {
      absoluteTierDist[video.absoluteTier]++;
    }
    if (video.relativeTier) {
      relativeTierDist[video.relativeTier]++;
    }

    if (video.absoluteScore !== undefined && video.relativeScore !== undefined) {
      const insight = getDualScoreInsight(video.absoluteScore, video.relativeScore);
      insightDist[insight.category] = (insightDist[insight.category] || 0) + 1;
    }
  });

  return {
    totalWithScores: videosWithScores.length,
    averageAbsoluteScore: Math.round(avgAbsolute * 10) / 10,
    averageRelativeScore: Math.round(avgRelative * 10) / 10,
    tierDistribution: {
      absolute: absoluteTierDist,
      relative: relativeTierDist,
    },
    insightDistribution: insightDist,
  };
}

/**
 * 獲取影片的雙重評分徽章顏色
 */
export function getScoreBadgeColor(score: number, type: 'absolute' | 'relative'): string {
  if (type === 'absolute') {
    const tier = determineAbsoluteTier(score);
    return getAbsoluteTierConfig(tier).color;
  } else {
    const tier = determineRelativeTier(score);
    return getRelativeTierConfig(tier).color;
  }
}

/**
 * 檢查影片是否有雙重評分數據
 */
export function hasDualScoringData(video: YouTubeVideo): boolean {
  return video.absoluteScore !== undefined && 
         video.relativeScore !== undefined && 
         video.performanceMetrics !== undefined;
}

/**
 * 獲取影片的表現標籤
 */
export function getPerformanceLabels(video: YouTubeVideo): string[] {
  const labels: string[] = [];
  
  if (video.absoluteTier === 'youtube-top') {
    labels.push('YouTube頂級');
  } else if (video.absoluteTier === 'youtube-high') {
    labels.push('高表現');
  }
  
  if (video.relativeTier === 'channel-star') {
    labels.push('頻道之星');
  } else if (video.relativeTier === 'above-average') {
    labels.push('超越平均');
  }
  
  if (video.relativeRatio && video.relativeRatio >= 2.0) {
    labels.push('爆款潛力');
  }
  
  if (video.isHighPerforming) {
    labels.push('高表現影片');
  }
  
  return labels;
}