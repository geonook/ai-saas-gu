'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, FileText, Subtitles, Clock, Hash, Tags, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface KeywordData {
  id: string;
  keyword: string;
  titlesCount: number;
}

interface ConfirmGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedKeywords: string[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
  data: {
    currentTitle: string;
    description: string;
    specialInstructions?: string;
    hasTranscript: boolean;
    transcriptWordCount?: number;
    srtFileName?: string;
    srtFileSize?: string;
    srtStats?: string;
  };
  keywords?: KeywordData[];
  isLoadingKeywords?: boolean;
}

export const ConfirmGenerateDialog = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  isLoading = false,
  data,
  keywords = [],
  isLoadingKeywords = false
}: ConfirmGenerateDialogProps) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  
  // Keyword selection state
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [showKeywordWarning, setShowKeywordWarning] = useState(false);
  
  // Keyword selection handlers
  const handleKeywordToggle = (keywordId: string) => {
    setSelectedKeywords(prev => {
      const newSelection = prev.includes(keywordId)
        ? prev.filter(id => id !== keywordId)
        : [...prev, keywordId];
      
      // Clear warning when keywords are selected
      if (newSelection.length > 0) {
        setShowKeywordWarning(false);
      }
      
      return newSelection;
    });
  };
  
  const handleSelectAll = () => {
    const allKeywordIds = keywords.map(k => k.id);
    setSelectedKeywords(allKeywordIds);
    setShowKeywordWarning(false);
  };
  
  const handleClearAll = () => {
    setSelectedKeywords([]);
  };
  
  // Calculate total titles count for selected keywords
  const selectedTitlesCount = selectedKeywords.reduce((total, keywordId) => {
    const keyword = keywords.find(k => k.id === keywordId);
    return total + (keyword?.titlesCount || 0);
  }, 0);
  
  // Truncate text to specified length and add ellipsis
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setSelectedKeywords([]);
      setShowKeywordWarning(false);
      onClose();
    }
  }, [isLoading, onClose]);

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      setSelectedKeywords([]);
      setShowKeywordWarning(false);
      onCancel();
    }
  }, [isLoading, onCancel]);
  
  const handleConfirm = useCallback(() => {
    if (keywords.length > 0 && selectedKeywords.length === 0) {
      setShowKeywordWarning(true);
      return;
    }
    onConfirm(selectedKeywords);
  }, [keywords.length, selectedKeywords, onConfirm]);

  // 鍵盤快捷鍵處理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || isLoading) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        handleCancel();
        break;
      case 'Enter':
        // 防止意外觸發 - 只有當焦點在確認按鈕上時才觸發
        if (event.target === confirmButtonRef.current) {
          event.preventDefault();
          handleConfirm();
        }
        break;
    }
  }, [isOpen, isLoading, handleCancel, handleConfirm]);

  // 焦點管理和鍵盤事件監聽
  useEffect(() => {
    if (isOpen) {
      // 對話框打開時，將焦點移到取消按鈕（更安全的選擇）
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);

      // 添加鍵盤事件監聽器
      document.addEventListener('keydown', handleKeyDown);
      
      // 防止背景滾動
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);
  
  // 當對話框關閉時重置狀態
  useEffect(() => {
    if (!isOpen) {
      setSelectedKeywords([]);
      setShowKeywordWarning(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-md sm:max-w-lg lg:max-w-xl flex flex-col p-0 z-[60] max-h-[90vh]" 
        showCloseButton={false}
        positioning="center"
      >
        <DialogTitle className="sr-only">確認生成標題</DialogTitle>
        <DialogDescription className="sr-only">
          請確認以下資訊是否正確
        </DialogDescription>
        
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">確認生成標題</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                請確認以下資訊是否正確
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-5" role="main" aria-label="確認資訊內容">
          {/* Current Title Section */}
          <div className="space-y-2" role="region" aria-labelledby="current-title-heading">
            <div className="flex items-center gap-2">
              <h3 id="current-title-heading" className="text-sm font-medium text-foreground">目前標題</h3>
              <Badge variant="outline" className="text-xs" aria-label="必填欄位">
                必填
              </Badge>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border" role="textbox" aria-readonly="true" aria-label="目前標題內容">
              <p className="text-sm text-foreground leading-relaxed" title={data.currentTitle}>
                {truncateText(data.currentTitle, 50)}
              </p>
              {data.currentTitle.length > 50 && (
                <p className="text-xs text-muted-foreground mt-1" aria-label={`標題長度：${data.currentTitle.length} 字符`}>
                  共 {data.currentTitle.length} 字符
                </p>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2" role="region" aria-labelledby="description-heading">
            <div className="flex items-center gap-2">
              <h3 id="description-heading" className="text-sm font-medium text-foreground">描述欄位</h3>
              <Badge variant="outline" className="text-xs" aria-label="必填欄位">
                必填
              </Badge>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border" role="textbox" aria-readonly="true" aria-label="描述內容">
              <p className="text-sm text-foreground leading-relaxed" title={data.description}>
                {truncateText(data.description, 100)}
              </p>
              {data.description.length > 100 && (
                <p className="text-xs text-muted-foreground mt-1" aria-label={`描述長度：${data.description.length} 字符`}>
                  共 {data.description.length} 字符
                </p>
              )}
            </div>
          </div>

          {/* Special Instructions Section */}
          {data.specialInstructions && data.specialInstructions.trim().length > 0 && (
            <div className="space-y-2" role="region" aria-labelledby="special-instructions-heading">
              <div className="flex items-center gap-2">
                <h3 id="special-instructions-heading" className="text-sm font-medium text-foreground">特殊指示</h3>
                <Badge variant="secondary" className="text-xs" aria-label="選填欄位">
                  選填
                </Badge>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border" role="textbox" aria-readonly="true" aria-label="特殊指示內容">
                <p className="text-sm text-foreground leading-relaxed" title={data.specialInstructions}>
                  {truncateText(data.specialInstructions, 100)}
                </p>
                {data.specialInstructions.length > 100 && (
                  <p className="text-xs text-muted-foreground mt-1" aria-label={`特殊指示長度：${data.specialInstructions.length} 字符`}>
                    共 {data.specialInstructions.length} 字符
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Transcript Status Section */}
          <div className="space-y-2" role="region" aria-labelledby="transcript-heading">
            <div className="flex items-center gap-2">
              <h3 id="transcript-heading" className="text-sm font-medium text-foreground">逐字稿狀態</h3>
              <Badge variant="secondary" className="text-xs" aria-label="選填欄位">
                選填
              </Badge>
            </div>
            
            <div className={cn(
              "p-3 rounded-lg border",
              data.hasTranscript 
                ? "bg-green-50 border-green-200" 
                : "bg-orange-50 border-orange-200"
            )} role="status" aria-label={data.hasTranscript ? "已提供逐字稿" : "未提供逐字稿"}>
              <div className="flex items-center gap-3">
                {data.hasTranscript ? (
                  <>
                    <div className="p-1 bg-green-100 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">已提供逐字稿</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-green-600">
                        {data.transcriptWordCount && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>{data.transcriptWordCount.toLocaleString()} 字</span>
                          </div>
                        )}
                        {data.srtFileName && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span className="truncate max-w-24" title={data.srtFileName}>
                              {data.srtFileName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-1 bg-orange-100 rounded">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-orange-800">未提供逐字稿</p>
                      <p className="text-xs text-orange-600 mt-1">
                        將基於標題和描述生成建議
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* SRT File Info (if available) */}
          {data.hasTranscript && data.srtFileName && (
            <div className="space-y-2" role="region" aria-labelledby="srt-info-heading">
              <h3 id="srt-info-heading" className="text-sm font-medium text-foreground">SRT 檔案資訊</h3>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-blue-100 rounded">
                    <Subtitles className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-800" title={data.srtFileName}>
                      {truncateText(data.srtFileName, 30)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-blue-600">
                      {data.srtFileSize && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>{data.srtFileSize}</span>
                        </div>
                      )}
                      {data.srtStats && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{data.srtStats}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Keyword Selection Section */}
          {keywords.length > 0 && (
            <div className="space-y-3" role="region" aria-labelledby="keyword-selection-heading">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 id="keyword-selection-heading" className="text-sm font-medium text-foreground">選擇作為標題生成參考的Keyword(主題)</h3>
                  <Badge variant="outline" className="text-xs">必填</Badge>
                </div>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={isLoading || selectedKeywords.length === keywords.length}
                    className="h-7 px-2 text-xs min-w-[36px]"
                  >
                    全選
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={isLoading || selectedKeywords.length === 0}
                    className="h-7 px-2 text-xs min-w-[36px]"
                  >
                    清除
                  </Button>
                </div>
              </div>
              
              {isLoadingKeywords ? (
                <div className="p-4 bg-muted/50 rounded-lg border flex items-center justify-center gap-2" role="status" aria-label="載入關鍵字中">
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">載入相關主題中...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Improved layout for better keyword phrase display */}
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-muted scrollbar-thumb-muted-foreground/20 p-1" role="group" aria-label="關鍵字選擇列表">
                    {keywords.map((keyword) => {
                      const isSelected = selectedKeywords.includes(keyword.id);
                      const isLongKeyword = keyword.keyword.length > 25;
                      
                      return (
                        <Label
                          key={keyword.id}
                          htmlFor={`keyword-${keyword.id}`}
                          className={cn(
                            "group flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:bg-accent/50 hover:shadow-sm",
                            isSelected 
                              ? "border-primary bg-primary/5 hover:bg-primary/10 shadow-sm" 
                              : "border-input hover:border-accent-foreground/30",
                            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                          )}
                        >
                          <Checkbox
                            id={`keyword-${keyword.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleKeywordToggle(keyword.id)}
                            disabled={isLoading}
                            aria-describedby={`keyword-${keyword.id}-count`}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Keyword phrase with better wrapping */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <span 
                                  className={cn(
                                    "text-sm font-medium leading-relaxed",
                                    isLongKeyword ? "block" : "truncate"
                                  )}
                                  title={isLongKeyword ? undefined : keyword.keyword}
                                  aria-label={`關鍵字: ${keyword.keyword}`}
                                >
                                  {keyword.keyword}
                                </span>
                                {/* Additional info for long keywords */}
                                {isLongKeyword && (
                                  <span className="text-xs text-muted-foreground mt-0.5 block">
                                    {keyword.keyword.length} 字符
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-muted-foreground">標題:</span>
                                <Badge 
                                  variant={isSelected ? "default" : "outline"}
                                  className={cn(
                                    "text-xs font-medium transition-colors",
                                    isSelected 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  )}
                                  id={`keyword-${keyword.id}-count`}
                                  aria-label={`${keyword.titlesCount} 個相關標題`}
                                >
                                  {keyword.titlesCount}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Label>
                      );
                    })}
                  </div>
                  
                  {/* Enhanced Selection Summary with Filtering Info */}
                  <div className={cn(
                    "p-3 rounded-lg border space-y-2",
                    showKeywordWarning
                      ? "border-orange-200 bg-orange-50"
                      : "border-blue-200 bg-blue-50"
                  )} role="status" aria-live="polite">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1 rounded",
                        showKeywordWarning
                          ? "bg-orange-100"
                          : "bg-blue-100"
                      )}>
                        {showKeywordWarning ? (
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Tags className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        {showKeywordWarning ? (
                          <p className="text-sm font-medium text-orange-800">
                            請至少選擇一個作為標題生成參考的Keyword(主題)
                          </p>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-blue-800">
                                已選擇 {selectedKeywords.length} 個主題
                              </p>
                              {selectedTitlesCount > 0 && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                  {selectedTitlesCount} 個標題
                                </Badge>
                              )}
                            </div>
                            {selectedKeywords.length > 0 && (
                              <div className="mt-2 p-2 bg-blue-100/50 rounded border border-blue-200">
                                <p className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  篩選效果預覽
                                </p>
                                <p className="text-xs text-blue-600 leading-relaxed">
                                  系統將優先參考這 {selectedTitlesCount} 個相關標題的內容特徵，
                                  生成更符合所選主題的標題建議。
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Generation Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg" role="note" aria-label="生成說明">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-100 rounded mt-0.5" aria-hidden="true">
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  準備生成標題建議
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-blue-600 leading-relaxed">
                    系統將根據您提供的資訊生成多個優化的標題選項，
                    {data.hasTranscript ? '包含逐字稿分析' : '基於標題和描述內容'}
                    {keywords.length > 0 && selectedKeywords.length > 0 && '及選定的相關主題'}
                    以提高影片的搜尋排名和點擊率。
                  </p>
                  {keywords.length > 0 && selectedKeywords.length > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-blue-100/50 rounded border border-blue-200">
                      <div className="p-0.5 bg-blue-200 rounded mt-0.5">
                        <CheckCircle className="h-3 w-3 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-700 mb-1">
                          主題篩選已啟用
                        </p>
                        <p className="text-xs text-blue-600 leading-relaxed">
                          將優先分析您選定的 {selectedKeywords.length} 個主題下共 {selectedTitlesCount} 個相關標題的特徵，
                          生成更貼近這些主題風格的標題建議。
                        </p>
                      </div>
                    </div>
                  )}
                  {keywords.length > 0 && selectedKeywords.length === 0 && (
                    <div className="flex items-start gap-2 p-2 bg-gray-100/50 rounded border border-gray-200">
                      <div className="p-0.5 bg-gray-200 rounded mt-0.5">
                        <AlertCircle className="h-3 w-3 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">
                          使用通用模式
                        </p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          未選擇特定主題，將使用通用算法生成標題建議。
                          建議選擇相關主題以獲得更精準的結果。
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between p-4 sm:p-6 pt-4 border-t bg-muted/30" role="group" aria-label="對話框操作按鈕">
          <Button
            ref={cancelButtonRef}
            onClick={handleCancel}
            variant="outline"
            disabled={isLoading}
            aria-label="取消生成標題"
            className="focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            取消
          </Button>
          <Button
            ref={confirmButtonRef}
            onClick={handleConfirm}
            disabled={isLoading}
            aria-label={isLoading ? "正在生成標題中" : "確認生成標題"}
            className="flex items-center gap-2 min-w-[100px] focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                確認生成
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};