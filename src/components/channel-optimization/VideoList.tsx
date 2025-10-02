'use client';

import { useState } from 'react';
import { YouTubeVideo } from '@/types/channel-optimization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Eye, ThumbsUp, MessageSquare, TrendingUp, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { filterVideosByShorts } from '@/lib/video-utils';
import { DualScoreDisplay, PerformanceBadge, RelativeBadge, ComparisonIndicator, ScoreInfoButton } from './scoring';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VideoListProps {
  videos: YouTubeVideo[];
  channelId: string;
  onOptimizeVideo: (videoId: string) => void;
  excludeShorts?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

export function VideoList({ 
  videos, 
  channelId, 
  onOptimizeVideo, 
  excludeShorts = false, 
  onLoadMore, 
  hasMore = false, 
  loadingMore = false 
}: VideoListProps) {
  // State for managing how many videos to show
  const [showAllHighPerforming, setShowAllHighPerforming] = useState(false);
  const [showAllVideos, setShowAllVideos] = useState(false);
  
  // State for sorting and filtering
  const [sortBy, setSortBy] = useState<'newest' | 'absolute-score' | 'relative-score' | 'views' | 'engagement'>('newest');
  const [filterBy, setFilterBy] = useState<'all' | 'youtube-top' | 'channel-star' | 'high-performing'>('all');
  
  // Apply filtering and sorting
  let processedVideos = filterVideosByShorts(videos, excludeShorts);
  
  // Apply tier filtering
  if (filterBy !== 'all') {
    processedVideos = processedVideos.filter(video => {
      switch (filterBy) {
        case 'youtube-top':
          return video.absoluteTier === 'youtube-top' || (video.absoluteScore && video.absoluteScore >= 80);
        case 'channel-star':
          return video.relativeTier === 'channel-star' || (video.relativeScore && video.relativeScore >= 70);
        case 'high-performing':
          return video.isHighPerforming === true;
        default:
          return true;
      }
    });
  }
  
  // Apply sorting
  processedVideos = [...processedVideos].sort((a, b) => {
    switch (sortBy) {
      case 'absolute-score':
        return (b.absoluteScore || 0) - (a.absoluteScore || 0);
      case 'relative-score':
        return (b.relativeScore || 0) - (a.relativeScore || 0);
      case 'views':
        return (b.viewCount || 0) - (a.viewCount || 0);
      case 'engagement':
        const aEngagement = ((a.likeCount || 0) + (a.commentCount || 0)) / Math.max(a.viewCount || 1, 1);
        const bEngagement = ((b.likeCount || 0) + (b.commentCount || 0)) / Math.max(b.viewCount || 1, 1);
        return bEngagement - aEngagement;
      case 'newest':
      default:
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    }
  });
  
  // Constants for initial display limits
  const HIGH_PERFORMING_INITIAL_LIMIT = 5;
  const ALL_VIDEOS_INITIAL_LIMIT = 10;
  
  if (processedVideos.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {videos.length > 0 ? 'No Videos Match Filters' : 'No Videos Found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {videos.length > 0 && excludeShorts 
                ? 'All videos in this channel are under 3 minutes (shorts). Try including shorts or sync more videos.'
                : 'Sync videos from this channel to start optimizing'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 分類影片：高表現 vs 一般
  const highPerformingVideos = processedVideos.filter(v => 
    v.isHighPerforming || 
    v.absoluteTier === 'youtube-top' || 
    v.relativeTier === 'channel-star'
  );
  const regularVideos = processedVideos.filter(v => 
    !v.isHighPerforming && 
    v.absoluteTier !== 'youtube-top' && 
    v.relativeTier !== 'channel-star'
  );

  return (
    <div className="space-y-6">
      {/* Sorting and Filtering Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sort & Filter Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Sort by:</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="absolute-score">Universal Score ↓</SelectItem>
                  <SelectItem value="relative-score">Channel Score ↓</SelectItem>
                  <SelectItem value="views">Most Views</SelectItem>
                  <SelectItem value="engagement">Highest Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Performance:</label>
              <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Videos ({processedVideos.length})</SelectItem>
                  <SelectItem value="youtube-top">YouTube Top Tier ({processedVideos.filter(v => v.absoluteTier === 'youtube-top' || (v.absoluteScore && v.absoluteScore >= 80)).length})</SelectItem>
                  <SelectItem value="channel-star">Channel Stars ({processedVideos.filter(v => v.relativeTier === 'channel-star' || (v.relativeScore && v.relativeScore >= 70)).length})</SelectItem>
                  <SelectItem value="high-performing">Legacy High Performing ({processedVideos.filter(v => v.isHighPerforming).length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High Performing Videos */}
      {highPerformingVideos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              High Performing Videos ({highPerformingVideos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-4 transition-all duration-300 ease-in-out">
                {highPerformingVideos
                  .slice(0, showAllHighPerforming ? highPerformingVideos.length : HIGH_PERFORMING_INITIAL_LIMIT)
                  .map((video, index) => (
                    <div 
                      key={video.id}
                      className="animate-in fade-in slide-in-from-top-4 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <VideoCard 
                        video={video} 
                        onOptimize={() => onOptimizeVideo(video.id)}
                        isHighPerforming={true}
                      />
                    </div>
                  ))}
              </div>
              {highPerformingVideos.length > HIGH_PERFORMING_INITIAL_LIMIT && (
                <div className="text-center py-2 border-t mt-4 pt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAllHighPerforming(!showAllHighPerforming)}
                    className="gap-2 transition-all duration-200 ease-in-out hover:scale-105"
                  >
                    {showAllHighPerforming ? (
                      <>
                        <ChevronUp className="h-4 w-4 transition-transform duration-200" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        Show {highPerformingVideos.length - HIGH_PERFORMING_INITIAL_LIMIT} more high-performing videos
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regular Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            All Videos ({processedVideos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="space-y-4 transition-all duration-300 ease-in-out">
              {processedVideos
                .slice(0, showAllVideos ? processedVideos.length : ALL_VIDEOS_INITIAL_LIMIT)
                .map((video, index) => (
                  <div 
                    key={video.id}
                    className="animate-in fade-in slide-in-from-top-4 duration-300"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <VideoCard 
                      video={video} 
                      onOptimize={() => onOptimizeVideo(video.id)}
                      isHighPerforming={video.isHighPerforming}
                    />
                  </div>
                ))}
            </div>
            {processedVideos.length > ALL_VIDEOS_INITIAL_LIMIT && (
              <div className="text-center py-2 border-t mt-4 pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAllVideos(!showAllVideos)}
                  className="gap-2 transition-all duration-200 ease-in-out hover:scale-105"
                >
                  {showAllVideos ? (
                    <>
                      <ChevronUp className="h-4 w-4 transition-transform duration-200" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                      Show {processedVideos.length - ALL_VIDEOS_INITIAL_LIMIT} more videos
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Load More Videos from API */}
      {hasMore && onLoadMore && (
        <Card className="mt-6">
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">More Videos Available</h3>
                <p className="text-muted-foreground mb-4">
                  Load more videos from this channel to see additional content and optimization opportunities
                </p>
              </div>
              <Button 
                onClick={onLoadMore}
                disabled={loadingMore}
                className="gap-2 min-w-40"
                size="lg"
              >
                {loadingMore ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading More Videos...
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Load More Videos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface VideoCardProps {
  video: YouTubeVideo;
  onOptimize: () => void;
  isHighPerforming?: boolean;
}

function VideoCard({ video, onOptimize, isHighPerforming }: VideoCardProps) {
  const handleOpenVideo = () => {
    window.open(`https://youtube.com/watch?v=${video.videoId}`, '_blank');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 mx-auto sm:mx-0">
        <img 
          src={video.thumbnailUrl || 'https://via.placeholder.com/160x90'}
          alt={video.title}
          className="w-full max-w-40 sm:w-40 h-24 object-cover rounded"
        />
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
            {video.duration}
          </div>
        )}
        {/* Performance indicators */}
        <div className="absolute top-1 left-1 flex flex-col gap-1">
          {/* New dual scoring badges */}
          {video.absoluteTier === 'youtube-top' && (
            <PerformanceBadge 
              score={video.absoluteScore || 0}
              tier="youtube-top"
              variant="icon-only"
            />
          )}
          {video.relativeTier === 'channel-star' && (
            <RelativeBadge 
              score={video.relativeScore || 0}
              tier="channel-star"
              variant="icon-only"
            />
          )}
          {/* Legacy high performing indicator */}
          {isHighPerforming && !video.absoluteTier && !video.relativeTier && (
            <Badge className="bg-green-600 text-white text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Top
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm line-clamp-2 mb-2">
          {video.title}
        </h4>
        
        {video.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {video.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground mb-3">
          {video.viewCount && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {formatNumber(video.viewCount)}
            </div>
          )}
          {video.likeCount && (
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {formatNumber(video.likeCount)}
            </div>
          )}
          {video.commentCount && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {formatNumber(video.commentCount)}
            </div>
          )}
          {/* Legacy score display for backward compatibility */}
          {video.performanceScore && !video.absoluteScore && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Score: {video.performanceScore}
            </div>
          )}
        </div>

        {/* Dual Score Display */}
        {(video.absoluteScore !== undefined || video.relativeScore !== undefined) && (
          <div className="mb-3">
            <DualScoreDisplay 
              video={video} 
              variant="compact"
              className="mb-2"
            />
            {video.relativeRatio && video.relativeRatio !== 1 && (
              <ComparisonIndicator 
                relativeRatio={video.relativeRatio}
                variant="compact"
              />
            )}
          </div>
        )}

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex gap-1 mb-3 flex-wrap">
            {video.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {video.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{video.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" onClick={onOptimize} className="flex-1 sm:flex-none">
            <TrendingUp className="h-3 w-3 mr-1" />
            Optimize
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenVideo} className="flex-1 sm:flex-none">
            <ExternalLink className="h-3 w-3 mr-1" />
            View
          </Button>
        </div>
      </div>

      {/* Published Date */}
      <div className="flex-shrink-0 text-xs text-muted-foreground text-center sm:text-left mt-2 sm:mt-0">
        {formatDate(video.publishedAt)}
      </div>
    </div>
  );
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  }
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }
  if (diffInDays < 30) {
    return `${Math.floor(diffInDays / 7)} weeks ago`;
  }
  if (diffInDays < 365) {
    return `${Math.floor(diffInDays / 30)} months ago`;
  }
  
  return `${Math.floor(diffInDays / 365)} years ago`;
}