'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useChannelOptimization } from '@/hooks/useChannelOptimization';
import { Youtube, AlertCircle, CheckCircle } from 'lucide-react';

interface AddChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddChannelModal({ open, onOpenChange }: AddChannelModalProps) {
  const [formData, setFormData] = useState({
    channelUrl: '',
    isOwned: false,
    customName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { addChannel, fetchChannels } = useChannelOptimization();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await addChannel(formData);
      await fetchChannels(); // 重新載入頻道列表
      setSuccess(true);
      
      // 重置表單
      setFormData({
        channelUrl: '',
        isOwned: false,
        customName: '',
      });
      
      // 延遲關閉以顯示成功訊息
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setError(null);
      setSuccess(false);
    }
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /youtube\.com\/channel\/[a-zA-Z0-9_-]+/,
      /youtube\.com\/c\/[a-zA-Z0-9_-]+/,
      /youtube\.com\/user\/[a-zA-Z0-9_-]+/,
      /youtube\.com\/@[a-zA-Z0-9_-]+/,
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const urlError = formData.channelUrl && !isValidYouTubeUrl(formData.channelUrl);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5" />
            Add YouTube Channel
          </DialogTitle>
          <DialogDescription>
            Add a YouTube channel to optimize its content. You can add your own channel or reference channels for inspiration.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel URL */}
          <div className="space-y-2">
            <Label htmlFor="channelUrl">Channel URL *</Label>
            <Input
              id="channelUrl"
              type="url"
              placeholder="https://youtube.com/@channelname or https://youtube.com/channel/UC..."
              value={formData.channelUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, channelUrl: e.target.value }))}
              className={urlError ? 'border-destructive' : ''}
              required
            />
            {urlError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Please enter a valid YouTube channel URL
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: @username, /channel/UC..., /c/customname, /user/username
            </p>
          </div>

          {/* Custom Name */}
          <div className="space-y-2">
            <Label htmlFor="customName">Custom Name (optional)</Label>
            <Input
              id="customName"
              placeholder="Override the channel name if needed"
              value={formData.customName}
              onChange={(e) => setFormData(prev => ({ ...prev, customName: e.target.value }))}
            />
          </div>

          {/* Is Owned Channel */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">This is my channel</Label>
              <p className="text-xs text-muted-foreground">
                Mark this if you own this channel. Your own videos will be used for optimization reference.
              </p>
            </div>
            <Switch
              checked={formData.isOwned}
              onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isOwned: checked }))}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              Channel added successfully!
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.channelUrl || !!urlError}
              className="gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Youtube className="h-4 w-4" />
                  Add Channel
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}