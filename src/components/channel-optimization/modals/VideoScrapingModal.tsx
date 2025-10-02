'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useChannelOptimization } from '@/hooks/useChannelOptimization';
import { YouTubeChannel, VideoScrapingOptions, SyncPreset } from '@/types/channel-optimization';
import { Video, Zap, AlertTriangle, CheckCircle, Clock, Settings, RefreshCw, Plus, FlaskConical, RotateCcw } from 'lucide-react';

interface VideoScrapingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: YouTubeChannel;
}

// Predefined sync presets to eliminate confusing combinations
const SYNC_PRESETS: SyncPreset[] = [
  {
    id: 'daily-update',
    name: 'Daily Update',
    description: 'Quickly sync new videos without affecting existing data',
    icon: '🚀',
    syncMode: 'incremental',
    maxVideos: 25,
    estimatedTime: '2-3 minutes',
    useCase: 'Regular maintenance to get new uploads',
    isRecommended: true
  },
  {
    id: 'initial-setup',
    name: 'Initial Setup',
    description: 'Complete channel sync for first-time setup',
    icon: '🏗️',
    syncMode: 'full',
    maxVideos: 9999,
    estimatedTime: 'Varies by channel size',
    useCase: 'First time adding this channel'
  },
  {
    id: 'full-refresh',
    name: 'Full Refresh',
    description: 'Re-sync all videos with latest data',
    icon: '🔄',
    syncMode: 'full',
    maxVideos: 9999,
    estimatedTime: 'Varies by channel size',
    useCase: 'Fix data issues or get latest metrics',
    warningMessage: 'This will replace all existing video data for this channel'
  },
  {
    id: 'quick-test',
    name: 'Quick Test',
    description: 'Test with a small batch of recent videos',
    icon: '🧪',
    syncMode: 'incremental',
    maxVideos: 3,
    estimatedTime: '30 seconds',
    useCase: 'Testing or troubleshooting'
  }
];

export function VideoScrapingModal({ open, onOpenChange, channel }: VideoScrapingModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('daily-update');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [options, setOptions] = useState<VideoScrapingOptions>({
    maxVideos: 25,
    includeShorts: true,
    includeTranscripts: true,
    useApify: false,
    syncMode: 'incremental',
    preset: 'daily-update'
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);

  const { scrapeChannelVideos } = useChannelOptimization();

  // Update options when preset changes
  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = SYNC_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setOptions(prev => ({
        ...prev,
        syncMode: preset.syncMode,
        maxVideos: preset.maxVideos,
        preset: preset.id as any
      }));
    }
  };

  const currentPreset = SYNC_PRESETS.find(p => p.id === selectedPreset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setProgress(0);
    setCurrentStep('Initializing scraping...');

    try {
      // 模擬進度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      // 更新步驟
      setTimeout(() => setCurrentStep('Fetching channel information...'), 1000);
      setTimeout(() => setCurrentStep('Retrieving video list...'), 3000);
      setTimeout(() => setCurrentStep('Processing video details...'), 5000);
      setTimeout(() => setCurrentStep('Analyzing performance metrics...'), 7000);

      await scrapeChannelVideos(channel.id, options);

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('Scraping completed successfully!');
      setSuccess(true);

      // 延遲關閉
      setTimeout(() => {
        onOpenChange(false);
        resetState();
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scrape videos';
      setError(errorMessage);
      setCurrentStep('Scraping failed');
      
      // Add debug information based on error type
      const debugMessages = [];
      if (errorMessage.includes('API key')) {
        debugMessages.push('YouTube API key issue detected');
        debugMessages.push('Check: Environment variable YOUTUBE_API_KEY is set');
        debugMessages.push('Check: API key has YouTube Data API v3 enabled');
      } else if (errorMessage.includes('quota')) {
        debugMessages.push('YouTube API quota exceeded');
        debugMessages.push('Try again in a few hours or increase quota limits');
      } else if (errorMessage.includes('Channel not found')) {
        debugMessages.push('Channel ID resolution failed');
        debugMessages.push(`Channel ID: ${channel.channelId || 'Unknown'}`);
      } else if (errorMessage.includes('database') || errorMessage.includes('Database')) {
        debugMessages.push('Database operation failed');
        debugMessages.push('Check: Supabase connection and RLS policies');
      }
      
      setDebugInfo(debugMessages);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setProgress(0);
    setCurrentStep('');
    setError(null);
    setSuccess(false);
    setDebugInfo([]);
    setShowDiagnostics(false);
    setDiagnosticsData(null);
  };

  const runDiagnostics = async () => {
    try {
      setLoading(true);
      setCurrentStep('Running system diagnostics...');
      
      const response = await fetch('/api/debug/youtube-api');
      const data = await response.json();
      
      if (response.ok) {
        setDiagnosticsData(data.diagnostics);
        setShowDiagnostics(true);
        setCurrentStep('Diagnostics completed');
      } else {
        setError('Failed to run diagnostics: ' + data.error);
      }
    } catch (err) {
      setError('Failed to run diagnostics: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      resetState();
    }
  };

  const estimatedTime = currentPreset?.estimatedTime || 'Unknown';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Sync Videos - {channel.channelName}
          </DialogTitle>
          <DialogDescription>
            Configure how to sync videos from this channel. This will fetch video metadata, statistics, and optionally transcripts.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6">
            <div className="space-y-4">
              <Progress value={progress} className="w-full" />
              <div className="text-center">
                <p className="text-sm font-medium">{currentStep}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress)}% complete
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preset Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Choose Sync Method</Label>
              <p className="text-sm text-muted-foreground">
                Select the sync method that matches your goal. Each preset combines the right sync mode and video count.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {SYNC_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                      selectedPreset === preset.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:bg-muted/30'
                    }`}
                    onClick={() => handlePresetChange(preset.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                        selectedPreset === preset.id 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{preset.icon}</span>
                          <span className="font-medium text-sm">{preset.name}</span>
                          {preset.isRecommended && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground mb-1">{preset.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>• {preset.useCase}</span>
                          <span>• {preset.estimatedTime}</span>
                          <span>• {preset.maxVideos === 9999 ? 'All videos' : `${preset.maxVideos} videos`}</span>
                        </div>
                        {preset.warningMessage && selectedPreset === preset.id && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {preset.warningMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div className="border-t pt-4">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              >
                <Settings className="h-4 w-4" />
                Advanced Options
                {showAdvancedOptions ? (
                  <span className="text-xs">(Hide)</span>
                ) : (
                  <span className="text-xs">(Show)</span>
                )}
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvancedOptions && (
              <div className="space-y-4 border border-muted rounded-lg p-4 bg-muted/20">
                <Label className="text-sm font-medium">Advanced Configuration</Label>
                
                {/* Data Source */}
                <div className="space-y-3">
                  <Label className="text-sm">Data Source</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        !options.useApify ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setOptions(prev => ({ ...prev, useApify: false }))}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          !options.useApify ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`} />
                        <span className="text-sm font-medium">YouTube API</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Official API, may have quota limits
                      </p>
                    </div>

                    <div 
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        options.useApify ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setOptions(prev => ({ ...prev, useApify: true }))}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          options.useApify ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`} />
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Apify Scraper
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        More reliable, no quota limits
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content Options */}
                <div className="space-y-3">
                  <Label className="text-sm">Content Options</Label>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div>
                      <div className="text-sm font-medium">Include YouTube Shorts</div>
                      <div className="text-xs text-muted-foreground">
                        Include short-form videos (under 3 minutes)
                      </div>
                    </div>
                    <Switch
                      checked={options.includeShorts}
                      onCheckedChange={(checked: boolean) => setOptions(prev => ({ ...prev, includeShorts: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                    <div>
                      <div className="text-sm font-medium">Include Transcripts</div>
                      <div className="text-xs text-muted-foreground">
                        Fetch video transcripts for better optimization
                      </div>
                    </div>
                    <Switch
                      checked={options.includeTranscripts}
                      onCheckedChange={(checked: boolean) => setOptions(prev => ({ ...prev, includeTranscripts: checked }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sync Summary */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-blue-900 mb-1">
                    Ready to sync {channel.channelName}
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>Method:</span>
                      <span className="font-medium">{currentPreset?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Videos:</span>
                      <span className="font-medium">
                        {currentPreset?.maxVideos === 9999 ? 'All available' : `Up to ${currentPreset?.maxVideos}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Estimated time:</span>
                      <span className="font-medium">{estimatedTime}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    You can continue using the app while syncing runs in the background.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="space-y-3">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
                
                {/* Debug Information */}
                {debugInfo.length > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="text-sm font-medium text-orange-800 mb-2">
                      Debugging Information:
                    </div>
                    <ul className="text-xs text-orange-700 space-y-1">
                      {debugInfo.map((info, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="w-1 h-1 bg-orange-400 rounded-full mt-1.5 flex-shrink-0"></span>
                          {info}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Diagnostics Results */}
            {showDiagnostics && diagnosticsData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-800 mb-3">System Diagnostics</div>
                <div className="space-y-2 text-xs">
                  {/* API Key Status */}
                  <div className="flex justify-between">
                    <span className="text-blue-700">YouTube API Key:</span>
                    <span className={diagnosticsData.apiKey.present ? 'text-green-600' : 'text-red-600'}>
                      {diagnosticsData.apiKey.present ? '✅ Present' : '❌ Missing'}
                    </span>
                  </div>
                  
                  {/* API Connectivity */}
                  {diagnosticsData.connectivity.tested && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">API Connectivity:</span>
                      <span className={diagnosticsData.connectivity.status === 200 ? 'text-green-600' : 'text-red-600'}>
                        {diagnosticsData.connectivity.status === 200 ? '✅ Working' : `❌ Failed (${diagnosticsData.connectivity.status})`}
                      </span>
                    </div>
                  )}
                  
                  {/* Database Status */}
                  <div className="flex justify-between">
                    <span className="text-blue-700">Database:</span>
                    <span className={diagnosticsData.database?.connected ? 'text-green-600' : 'text-red-600'}>
                      {diagnosticsData.database?.connected ? '✅ Connected' : '❌ Failed'}
                    </span>
                  </div>
                  
                  {/* Data Counts */}
                  {diagnosticsData.database?.connected && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Your Channels:</span>
                        <span className="text-blue-600">{diagnosticsData.database.userChannels}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Total Videos:</span>
                        <span className="text-blue-600">{diagnosticsData.database.totalVideos}</span>
                      </div>
                    </>
                  )}
                  
                  {/* Error Details */}
                  {diagnosticsData.connectivity.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                      <div className="font-medium">API Error:</div>
                      <div className="text-xs">{diagnosticsData.connectivity.error}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                Videos synced successfully!
              </div>
            )}

            <DialogFooter className="gap-2">
              <div className="flex justify-between w-full">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={runDiagnostics} 
                  disabled={loading}
                  className="gap-1"
                >
                  <Settings className="h-3 w-3" />
                  Debug
                </Button>
                
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="gap-2">
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {currentStep.includes('diagnostics') ? 'Diagnosing...' : 'Syncing...'}
                      </>
                    ) : (
                      <>
                        <Video className="h-4 w-4" />
                        Start Sync
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}