'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { YouTubeChannel, YouTubeVideo, OptimizationSuggestion } from '@/types/channel-optimization';
import { TrendingUp, Copy, Check, Lightbulb, Target, Zap, ExternalLink } from 'lucide-react';

interface OptimizationSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: YouTubeChannel;
  videos: YouTubeVideo[];
  suggestions: OptimizationSuggestion[];
}

export function OptimizationSuggestionsModal({ 
  open, 
  onOpenChange, 
  channel, 
  videos, 
  suggestions 
}: OptimizationSuggestionsModalProps) {
  const [copiedSuggestion, setCopiedSuggestion] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  // 當模態框打開時，選擇第一個有建議的影片
  useEffect(() => {
    if (open && suggestions.length > 0 && !selectedVideoId) {
      setSelectedVideoId(suggestions[0].videoId);
    }
  }, [open, suggestions]);

  const handleCopySuggestion = async (suggestion: OptimizationSuggestion) => {
    try {
      await navigator.clipboard.writeText(suggestion.suggestedValue);
      setCopiedSuggestion(suggestion.id);
      setTimeout(() => setCopiedSuggestion(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const selectedVideo = selectedVideoId ? videos.find(v => v.id === selectedVideoId) : null;
  const videoSuggestions = suggestions.filter(s => s.videoId === selectedVideoId);
  const videosWithSuggestions = videos.filter(v => 
    suggestions.some(s => s.videoId === v.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Optimization Suggestions - {channel.channelName}
          </DialogTitle>
          <DialogDescription>
            AI-powered suggestions based on successful content patterns from your channel and reference data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
          {/* Video Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Videos with Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="max-h-96 overflow-y-auto space-y-2">
                {videosWithSuggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No suggestions generated yet
                    </p>
                  </div>
                ) : (
                  videosWithSuggestions.map((video) => {
                    const videoSuggestionsCount = suggestions.filter(s => s.videoId === video.id).length;
                    const isSelected = selectedVideoId === video.id;
                    
                    return (
                      <div
                        key={video.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedVideoId(video.id)}
                      >
                        <div className="flex gap-3">
                          <img 
                            src={video.thumbnailUrl || 'https://via.placeholder.com/60x40'}
                            alt={video.title}
                            className="w-15 h-10 object-cover rounded flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium line-clamp-2 mb-1">
                              {video.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {videoSuggestionsCount} suggestion{videoSuggestionsCount > 1 ? 's' : ''}
                              </Badge>
                              {video.isHighPerforming && (
                                <Badge className="text-xs bg-green-600">
                                  Top
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Suggestions Content */}
          <div className="lg:col-span-2">
            {selectedVideo ? (
              <div className="space-y-4">
                {/* Video Header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img 
                        src={selectedVideo.thumbnailUrl || 'https://via.placeholder.com/120x68'}
                        alt={selectedVideo.title}
                        className="w-30 h-17 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                          {selectedVideo.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {selectedVideo.viewCount && (
                            <span>{selectedVideo.viewCount.toLocaleString()} views</span>
                          )}
                          {selectedVideo.likeCount && (
                            <span>{selectedVideo.likeCount.toLocaleString()} likes</span>
                          )}
                          {selectedVideo.performanceScore && (
                            <span>Score: {selectedVideo.performanceScore}</span>
                          )}
                        </div>
                        <div className="mt-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`https://youtube.com/watch?v=${selectedVideo.videoId}`, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Video
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions by Type */}
                <Tabs defaultValue="title" className="space-y-4">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="title">Title</TabsTrigger>
                    <TabsTrigger value="thumbnail">Thumbnail</TabsTrigger>
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="tags">Tags</TabsTrigger>
                  </TabsList>

                  <TabsContent value="title" className="space-y-3">
                    {videoSuggestions.filter(s => s.type === 'title').map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onCopy={() => handleCopySuggestion(suggestion)}
                        isCopied={copiedSuggestion === suggestion.id}
                      />
                    ))}
                    {videoSuggestions.filter(s => s.type === 'title').length === 0 && (
                      <EmptyState type="title" />
                    )}
                  </TabsContent>

                  <TabsContent value="thumbnail" className="space-y-3">
                    {videoSuggestions.filter(s => s.type === 'thumbnail').map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onCopy={() => handleCopySuggestion(suggestion)}
                        isCopied={copiedSuggestion === suggestion.id}
                      />
                    ))}
                    {videoSuggestions.filter(s => s.type === 'thumbnail').length === 0 && (
                      <EmptyState type="thumbnail" />
                    )}
                  </TabsContent>

                  <TabsContent value="description" className="space-y-3">
                    {videoSuggestions.filter(s => s.type === 'description').map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onCopy={() => handleCopySuggestion(suggestion)}
                        isCopied={copiedSuggestion === suggestion.id}
                      />
                    ))}
                    {videoSuggestions.filter(s => s.type === 'description').length === 0 && (
                      <EmptyState type="description" />
                    )}
                  </TabsContent>

                  <TabsContent value="tags" className="space-y-3">
                    {videoSuggestions.filter(s => s.type === 'tags').map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onCopy={() => handleCopySuggestion(suggestion)}
                        isCopied={copiedSuggestion === suggestion.id}
                      />
                    ))}
                    {videoSuggestions.filter(s => s.type === 'tags').length === 0 && (
                      <EmptyState type="tags" />
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Select a Video</h3>
                    <p className="text-muted-foreground">
                      Choose a video from the left to view its optimization suggestions
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion;
  onCopy: () => void;
  isCopied: boolean;
}

function SuggestionCard({ suggestion, onCopy, isCopied }: SuggestionCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant={suggestion.confidence > 80 ? 'default' : 'secondary'}
                className="text-xs"
              >
                {suggestion.confidence}% confidence
              </Badge>
              <Badge variant="outline" className="text-xs">
                {suggestion.status}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current:</p>
                <p className="text-sm">{suggestion.currentValue}</p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Suggested:</p>
                <p className="text-sm font-medium text-green-700">
                  {suggestion.suggestedValue}
                </p>
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Why this works:</p>
                <p className="text-xs text-muted-foreground">
                  {suggestion.reasoning}
                </p>
              </div>
            </div>
          </div>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={onCopy}
            className="gap-2"
          >
            {isCopied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No {type} suggestions available yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Generate suggestions to see AI-powered recommendations
          </p>
        </div>
      </CardContent>
    </Card>
  );
}