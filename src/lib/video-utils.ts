// Video utility functions for channel optimization

/**
 * Parse duration string into seconds
 * Supports formats: "1:30", "2:15:30", "0:45"
 */
export function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;
  
  const parts = duration.split(':').map(part => parseInt(part, 10));
  
  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 1) {
    // Just seconds
    return parts[0];
  }
  
  return 0;
}

/**
 * Check if a video is considered a "short" (under 3 minutes)
 */
export function isVideoShort(duration?: string, title?: string, description?: string): boolean {
  // Check hashtag indicators first
  if (title?.toLowerCase().includes('#shorts') || 
      description?.toLowerCase().includes('#shorts')) {
    return true;
  }
  
  // Check duration (under 3 minutes = 180 seconds)
  if (duration) {
    const durationInSeconds = parseDurationToSeconds(duration);
    return durationInSeconds > 0 && durationInSeconds < 180;
  }
  
  return false;
}

/**
 * Filter videos to exclude shorts if requested
 */
export function filterVideosByShorts(videos: any[], excludeShorts: boolean) {
  if (!excludeShorts) {
    return videos;
  }
  
  return videos.filter(video => {
    const isShort = isVideoShort(video.duration, video.title, video.description);
    return !isShort;
  });
}

/**
 * Format duration in seconds to readable format
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}