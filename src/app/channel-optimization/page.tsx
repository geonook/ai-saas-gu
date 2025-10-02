'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Youtube, Users, Video, TrendingUp, Settings, Filter } from 'lucide-react';
import { useChannelOptimization } from '@/hooks/useChannelOptimization';
import { AddChannelModal } from '@/components/channel-optimization/modals/AddChannelModal';
import { VideoScrapingModal } from '@/components/channel-optimization/modals/VideoScrapingModal';
import { OptimizationSuggestionsModal } from '@/components/channel-optimization/modals/OptimizationSuggestionsModal';
import { ChannelCard } from '@/components/channel-optimization/ChannelCard';
import { VideoList } from '@/components/channel-optimization/VideoList';
import { filterVideosByShorts } from '@/lib/video-utils';

// Helper function to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

export default function ChannelOptimizationPage() {
  const {
    channels,
    selectedChannel,
    videos,
    suggestions,
    loading,
    loadingMore,
    pagination,
    error,
    setSelectedChannel,
    fetchChannels,
    fetchChannelVideos,
    loadMoreVideos,
    generateOptimizationSuggestions,
  } = useChannelOptimization();

  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showScrapingModal, setShowScrapingModal] = useState(false);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [excludeShorts, setExcludeShorts] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelVideos(selectedChannel.id);
    }
  }, [selectedChannel]);

  const handleChannelSelect = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    setSelectedChannel(channel || null);
  };

  const handleStartScraping = () => {
    if (selectedChannel) {
      setShowScrapingModal(true);
    }
  };

  const handleGenerateSuggestions = () => {
    if (selectedChannel) {
      setShowSuggestionsModal(true);
    }
  };

  const handleLoadMoreVideos = () => {
    if (selectedChannel && pagination.hasMore) {
      loadMoreVideos(selectedChannel.id);
    }
  };

  // Calculate filtered videos for display
  const filteredVideos = selectedChannel ? filterVideosByShorts(videos, excludeShorts) : [];
  const filteredHighPerformingCount = filteredVideos.filter(v => v.isHighPerforming === true).length;
  
  // Calculate dual scoring metrics
  const youtubeTopCount = filteredVideos.filter(v => 
    v.absoluteTier === 'youtube-top' || (v.absoluteScore && v.absoluteScore >= 80)
  ).length;
  const channelStarCount = filteredVideos.filter(v => 
    v.relativeTier === 'channel-star' || (v.relativeScore && v.relativeScore >= 70)
  ).length;
  const averageAbsoluteScore = filteredVideos.length > 0 
    ? filteredVideos.reduce((sum, v) => sum + (v.absoluteScore || 0), 0) / filteredVideos.length
    : 0;
  const averageRelativeScore = filteredVideos.length > 0 
    ? filteredVideos.reduce((sum, v) => sum + (v.relativeScore || 0), 0) / filteredVideos.length
    : 0;
  
  // Debug logging
  React.useEffect(() => {
    if (videos.length > 0) {
      const highPerformingVideos = videos.filter(v => v.isHighPerforming === true);
      console.log('📊 Video performance debug:', {
        totalVideos: videos.length,
        highPerformingVideos: highPerformingVideos.length,
        filteredVideos: filteredVideos.length,
        filteredHighPerforming: filteredHighPerformingCount,
        sampleVideo: videos[0] ? {
          title: videos[0].title,
          isHighPerforming: videos[0].isHighPerforming,
          performanceScore: videos[0].performanceScore,
          viewCount: videos[0].viewCount
        } : null
      });
    }
  }, [videos, filteredVideos, filteredHighPerformingCount]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">YouTube Channel Optimization</h1>
          <p className="text-muted-foreground mt-2">
            Import channels, analyze videos, and get AI-powered optimization suggestions
          </p>
        </div>
        <Button 
          onClick={() => setShowAddChannelModal(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Channel
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channels List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="h-5 w-5" />
                Channels ({channels.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8">
                  <Youtube className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No channels added yet</p>
                  <Button 
                    onClick={() => setShowAddChannelModal(true)}
                    variant="outline" 
                    size="sm"
                  >
                    Add your first channel
                  </Button>
                </div>
              ) : (
                channels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    isSelected={selectedChannel?.id === channel.id}
                    onClick={() => handleChannelSelect(channel.id)}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Channel Details & Videos */}
        <div className="lg:col-span-2">
          {selectedChannel ? (
            <div className="space-y-6">
              {/* Channel Stats */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                        {selectedChannel.avatar ? (
                          <img 
                            src={selectedChannel.avatar}
                            alt={selectedChannel.channelName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLDivElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="absolute inset-0 bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold"
                          style={{ display: selectedChannel.avatar ? 'none' : 'flex' }}
                        >
                          {selectedChannel.channelName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <CardTitle>{selectedChannel.channelName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={selectedChannel.isOwned ? 'default' : 'secondary'}>
                            {selectedChannel.isOwned ? 'Your Channel' : 'Reference Channel'}
                          </Badge>
                          {selectedChannel.lastScrapedAt && (
                            <Badge variant="outline">
                              Last synced: {new Date(selectedChannel.lastScrapedAt).toLocaleDateString()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleStartScraping}
                        variant="outline" 
                        size="sm"
                        className="gap-2"
                      >
                        <Video className="h-4 w-4" />
                        Sync Videos
                      </Button>
                      <Button 
                        onClick={handleGenerateSuggestions}
                        size="sm"
                        className="gap-2"
                        disabled={videos.length === 0}
                      >
                        <TrendingUp className="h-4 w-4" />
                        Optimize
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {selectedChannel.subscriberCount !== null && selectedChannel.subscriberCount !== undefined 
                          ? formatNumber(selectedChannel.subscriberCount) 
                          : '—'
                        }
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        Subscribers
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {filteredVideos.length}
                        {excludeShorts && videos.length !== filteredVideos.length && (
                          <span className="text-sm text-muted-foreground ml-1">
                            / {videos.length}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Video className="h-3 w-3" />
                        Videos {excludeShorts ? 'Filtered' : 'Synced'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {youtubeTopCount}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <svg className="h-3 w-3 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7ZM9 8H11V17H9V8ZM13 8H15V17H13V8Z"/>
                        </svg>
                        YouTube Top
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {channelStarCount}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <svg className="h-3 w-3 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                        </svg>
                        Channel Stars
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {averageAbsoluteScore > 0 ? (
                          <div className="space-y-1">
                            <div className="text-amber-600">{averageAbsoluteScore.toFixed(0)}</div>
                            <div className="text-blue-600">{averageRelativeScore.toFixed(0)}</div>
                          </div>
                        ) : (
                          <>
                            {filteredHighPerformingCount}
                            {excludeShorts && videos.filter(v => v.isHighPerforming === true).length !== filteredHighPerformingCount && (
                              <span className="text-sm text-muted-foreground ml-1">
                                / {videos.filter(v => v.isHighPerforming === true).length}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {averageAbsoluteScore > 0 ? 'Avg Scores' : 'Legacy High Perf'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Video Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Video Filters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="exclude-shorts"
                      checked={excludeShorts}
                      onCheckedChange={setExcludeShorts}
                    />
                    <Label htmlFor="exclude-shorts">
                      Exclude videos under 3 minutes (shorts)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    When enabled, videos shorter than 3 minutes will be hidden from the list
                  </p>
                </CardContent>
              </Card>

              {/* Videos List */}
              <VideoList 
                videos={videos}
                channelId={selectedChannel.id}
                excludeShorts={excludeShorts}
                onOptimizeVideo={(videoId) => {
                  // 為特定影片生成建議
                  generateOptimizationSuggestions(videoId);
                  setShowSuggestionsModal(true);
                }}
                onLoadMore={handleLoadMoreVideos}
                hasMore={pagination.hasMore}
                loadingMore={loadingMore}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Youtube className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select a Channel</h3>
                  <p className="text-muted-foreground mb-4">
                    Choose a channel from the left to view its videos and optimization suggestions
                  </p>
                  {channels.length === 0 && (
                    <Button onClick={() => setShowAddChannelModal(true)}>
                      Add Your First Channel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddChannelModal 
        open={showAddChannelModal}
        onOpenChange={setShowAddChannelModal}
      />

      {selectedChannel && (
        <>
          <VideoScrapingModal
            open={showScrapingModal}
            onOpenChange={setShowScrapingModal}
            channel={selectedChannel}
          />

          <OptimizationSuggestionsModal
            open={showSuggestionsModal}
            onOpenChange={setShowSuggestionsModal}
            channel={selectedChannel}
            videos={videos}
            suggestions={suggestions}
          />
        </>
      )}
    </div>
  );
}