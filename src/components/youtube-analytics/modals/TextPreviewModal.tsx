'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Copy, Search, X, ZoomIn, ZoomOut, Maximize2, Minimize2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface TextPreviewModalProps {
  text: string;
  fieldName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TextPreviewModal = ({ 
  text, 
  fieldName, 
  isOpen, 
  onClose 
}: TextPreviewModalProps) => {
  const { successToast, errorToast } = useToast();
  
  // Custom scrollbar styles for WebKit browsers
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #e2e8f0;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #94a3b8;
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #64748b;
    }
  `;
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [fontSize, setFontSize] = useState(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search functionality
  const searchMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0]
      });
    }
    return matches;
  }, [text, searchTerm]);

  // Navigate search results
  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    
    if (direction === 'next') {
      setCurrentMatch((prev) => (prev + 1) % searchMatches.length);
    } else {
      setCurrentMatch((prev) => (prev - 1 + searchMatches.length) % searchMatches.length);
    }
  };

  // Highlight search results
  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        const matchIndex = searchMatches.findIndex(match => 
          text.indexOf(part, index > 0 ? text.indexOf(parts[index - 1]) + parts[index - 1].length : 0) === match.index
        );
        const isCurrentMatch = matchIndex === currentMatch;
        return (
          <mark 
            key={index} 
            className={cn(
              "px-1 rounded-sm",
              isCurrentMatch ? "bg-yellow-400 text-yellow-900" : "bg-yellow-200 text-yellow-800"
            )}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  // Scroll to current search match
  useEffect(() => {
    if (searchMatches.length > 0 && contentRef.current) {
      const marks = contentRef.current.querySelectorAll('mark');
      const currentMark = marks[currentMatch];
      if (currentMark) {
        currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatch, searchMatches]);

  // Handle copy to clipboard with toast feedback
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text);
      successToast.general('複製成功', '文字內容已複製到剪貼板');
    } catch (err) {
      console.error('Failed to copy text:', err);
      errorToast.general('複製失敗', '無法複製文字內容，請手動選取複製');
    }
  };

  // Font size controls
  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 2, 24));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 2, 10));

  // Toggle fullscreen
  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setCurrentMatch(0);
  };

  // Scroll position tracking for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop;
        setShowScrollToTop(scrollTop > 100); // Show button after scrolling 100px
      }
    };

    // Add a small delay to ensure the scroll container is rendered
    const attachScrollListener = () => {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer && isOpen) {
        // Reset scroll position when modal opens
        scrollContainer.scrollTop = 0;
        setShowScrollToTop(false);
        
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };

    if (isOpen) {
      // Use requestAnimationFrame to ensure the DOM is ready
      const timeoutId = requestAnimationFrame(() => {
        const cleanup = attachScrollListener();
        return cleanup;
      });
      
      return () => {
        cancelAnimationFrame(timeoutId);
        const scrollContainer = scrollContainerRef.current;
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        }
      };
    } else {
      // Reset state when modal closes
      setShowScrollToTop(false);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Enter/F3 for next match, Shift+Enter/Shift+F3 for previous
      if (searchTerm && (e.key === 'Enter' || e.key === 'F3')) {
        e.preventDefault();
        navigateSearch(e.shiftKey ? 'prev' : 'next');
      }
      
      // Escape to clear search
      if (e.key === 'Escape' && searchTerm) {
        e.preventDefault();
        clearSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchTerm]);

  // Process text with line numbers if enabled
  const processedText = useMemo(() => {
    if (!showLineNumbers) return text;
    
    return text.split('\n').map((line, index) => 
      `${String(index + 1).padStart(4, ' ')} | ${line}`
    ).join('\n');
  }, [text, showLineNumbers]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      <DialogContent 
        className={cn(
          "flex flex-col p-0 transition-all duration-200",
          isFullscreen 
            ? "!fixed !inset-4 !max-w-none !w-auto !h-auto !max-h-none !transform-none !top-auto !left-auto" 
            : "!w-[95vw] !max-w-4xl !max-h-[90vh]"
        )}
        showCloseButton={false}
        size={isFullscreen ? 'full' : '4xl'}
        positioning="center"
      >
        {/* Header - Fixed height */}
        <DialogHeader className="flex-shrink-0 p-4 sm:p-6 pb-3 sm:pb-4 border-b space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate">{fieldName}</DialogTitle>
              <DialogDescription className="mt-1 text-xs sm:text-sm">
                文字內容預覽 • {text.length.toLocaleString()} 字元
                {searchMatches.length > 0 && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    • {searchMatches.length} 個搜尋結果
                  </span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                variant={showLineNumbers ? "default" : "outline"}
                size="sm"
                className="text-xs sm:text-sm"
                title="切換行號顯示"
              >
                #
              </Button>
              <Button
                onClick={decreaseFontSize}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                title="減小字體"
              >
                <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                onClick={increaseFontSize}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                title="放大字體"
              >
                <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
                title={isFullscreen ? "退出全螢幕" : "全螢幕顯示"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                ) : (
                  <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
              <Button
                onClick={handleCopyText}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                複製
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="搜尋內容... (Ctrl/Cmd + F)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentMatch(0);
                }}
                className="pl-10 pr-10 text-sm"
              />
              {searchTerm && (
                <Button
                  onClick={clearSearch}
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {searchMatches.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {currentMatch + 1} / {searchMatches.length}
                </span>
                <Button
                  onClick={() => navigateSearch('prev')}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="上一個結果"
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => navigateSearch('next')}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  title="下一個結果"
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content - Scrollable area */}
        <div className={cn(
          "flex-1 p-4 sm:p-6 pt-3 sm:pt-4 min-h-0 flex flex-col",
          isFullscreen ? "" : "max-h-[calc(70vh-200px)]"
        )}>
          <div 
            ref={scrollContainerRef}
            className={cn(
              "bg-muted rounded-lg p-3 sm:p-4 overflow-auto relative custom-scrollbar flex-1",
              isFullscreen ? "h-full" : "min-h-[300px]"
            )}
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #e2e8f0'
            }}
          >
            <div 
              ref={contentRef}
              className="whitespace-pre-wrap font-mono leading-relaxed text-foreground break-words min-h-full"
              style={{ fontSize: `${fontSize}px` }}
            >
              {searchTerm ? highlightText(processedText) : processedText}
            </div>
            
            {/* Scroll to top button */}
            <Button
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({ 
                    top: 0, 
                    behavior: 'smooth' 
                  });
                }
              }}
              variant="outline"
              size="sm"
              className={cn(
                "absolute bottom-4 right-4 h-8 w-8 p-0",
                "transition-all duration-300 ease-in-out",
                "shadow-sm hover:shadow-md hover:scale-105",
                "bg-background/80 backdrop-blur-sm border-border/50",
                showScrollToTop 
                  ? "opacity-70 hover:opacity-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 translate-y-2 pointer-events-none"
              )}
              title="回到頂部"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer - Fixed height */}
        <div className="flex-shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 pt-3 sm:pt-4 border-t bg-muted/30">
          <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1 space-y-1">
            <div>字數: {text.length.toLocaleString()} 字元</div>
            <div className="text-xs opacity-70">
              提示: Ctrl/Cmd + F 搜尋, Enter 下一個, Shift + Enter 上一個
            </div>
          </div>
          <Button onClick={onClose} variant="outline" size="sm" className="order-1 sm:order-2 self-end sm:self-auto">
            關閉
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};