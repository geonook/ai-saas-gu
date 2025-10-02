'use client';

import { YouTubeChannel } from '@/types/channel-optimization';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Youtube, Users, Video, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChannelCardProps {
  channel: YouTubeChannel;
  isSelected: boolean;
  onClick: () => void;
}

export function ChannelCard({ channel, isSelected, onClick }: ChannelCardProps) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-muted">
            {channel.avatar ? (
              <img 
                src={channel.avatar}
                alt={channel.channelName}
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
              className="absolute inset-0 bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold"
              style={{ display: channel.avatar ? 'none' : 'flex' }}
            >
              {channel.channelName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {channel.channelName}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              <Badge 
                variant={channel.isOwned ? 'default' : 'secondary'}
                className="text-xs"
              >
                {channel.isOwned ? (
                  <>
                    <Star className="h-3 w-3 mr-1" />
                    Your Channel
                  </>
                ) : (
                  <>
                    <Youtube className="h-3 w-3 mr-1" />
                    Reference
                  </>
                )}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {channel.subscriberCount !== null && channel.subscriberCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {formatNumber(channel.subscriberCount)}
                </div>
              )}
              {channel.videoCount !== null && channel.videoCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Video className="h-3 w-3" />
                  {formatNumber(channel.videoCount)}
                </div>
              )}
            </div>
            {channel.lastScrapedAt && (
              <div className="text-xs text-muted-foreground mt-1">
                Synced: {formatDate(channel.lastScrapedAt)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    return 'Just now';
  }
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  if (diffInHours < 24 * 7) {
    return `${Math.floor(diffInHours / 24)}d ago`;
  }
  
  return date.toLocaleDateString();
}