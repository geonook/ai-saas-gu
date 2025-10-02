'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Play, Copy, Check, Upload, FileText, FilePlus2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { CreateTitleForm, ModalStage } from '@/types/youtube-analytics';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { parseSRTFile, formatSRTStats } from '@/lib/srt-parser';
import { validateUploadedFile, SRT_FILE_CONFIG, createDropHandler, formatFileSize } from '@/lib/file-utils';
import { cn } from '@/lib/utils';
import { ConfirmGenerateDialog } from './ConfirmGenerateDialog';

interface CreateTitleModalProps {
  isOpen: boolean;
  stage: ModalStage;
  form: CreateTitleForm;
  recommendedTitles: string[];
  isLoading: boolean;
  copiedIndex: number | null;
  copiedAll: boolean;
  keywordFilter: import('@/types/youtube-analytics').KeywordFilter;
  onClose: () => void;
  onFormChange: (form: CreateTitleForm) => void;
  onGenerate: (selectedKeywords: string[]) => void;
  onBackToEdit: () => void;
  onCopyTitle: (title: string, index: number) => void;
  onCopyAllTitles: () => void;
}

export const CreateTitleModal = ({ 
  isOpen, 
  stage, 
  form, 
  recommendedTitles, 
  isLoading, 
  copiedIndex, 
  copiedAll, 
  keywordFilter,
  onClose, 
  onFormChange, 
  onGenerate, 
  onBackToEdit, 
  onCopyTitle, 
  onCopyAllTitles 
}: CreateTitleModalProps) => {
  const { successToast, errorToast, infoToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<'manual' | 'file'>('manual');
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);

  
  useEffect(() => {
    // 如果檔案上傳成功但模式不對，強制切換模式
    if (form.srtFile && form.transcript && inputMode !== 'file') {
      console.log('⚠️ [狀態修復] 偵測到狀態不一致，強制切換到檔案模式');
      setInputMode('file');
    }
  }, [form.srtFile, form.transcript, inputMode]);

  useEffect(() => {
    // 當從結果頁面返回編輯時，根據是否有 SRT 檔案來設定正確的輸入模式
    if (stage === 'input' && form.srtFile) {
      console.log('🔄 [返回編輯] 偵測到 SRT 檔案，設定為檔案模式');
      setInputMode('file');
    }
  }, [stage, form.srtFile]);

  const handleFormChange = (field: string, value: string | File | null | boolean) => {
    // 只記錄關鍵的 transcript 更新
    if (field === 'transcript' && typeof value === 'string' && inputMode === 'manual') {
      console.log('✏️ [手動輸入] transcript 更新，長度:', value.length);
    }
    
    onFormChange({
      ...form,
      [field]: value
    });
  };

  // SRT 檔案處理函數 - 修復版本
  const handleSRTFileUpload = async (file: File) => {
    console.log('🚀 [SRT 上傳] 開始處理:', file.name);
    
    // 顯示處理中提示
    infoToast.srtProcessing();
    
    // 修復：立即同步設定輸入模式
    setInputMode('file');
    
    try {
      // 驗證檔案
      const validation = validateUploadedFile(file, SRT_FILE_CONFIG);
      if (!validation.isValid) {
        errorToast.srtUploadError(validation.errorMessage || '檔案驗證失敗');
        // 重置狀態
        const resetFormState = {
          ...form,
          srtProcessing: false,
          srtFile: null
        };
        onFormChange(resetFormState);
        return;
      }

      // 設定處理狀態 - 批量更新
      const processingFormState = {
        ...form,
        srtProcessing: true,
        srtFile: file
      };
      onFormChange(processingFormState);

      // 解析 SRT 檔案
      const result = await parseSRTFile(file);
      
      if (result.success) {
        // 驗證用日誌：記錄 SRT 解析結果
        console.log('📄 [SRT 解析驗證] SRT 檔案解析成功:', {
          fileName: file.name,
          fileSize: file.size,
          entriesCount: result.entries.length,
          plainTextLength: result.plainText.length,
          plainTextPreview: result.plainText.substring(0, 150) + (result.plainText.length > 150 ? '...' : ''),
          timestamp: new Date().toISOString()
        });
        
        // 修復：批量更新所有相關狀態
        const successFormState = {
          ...form,
          transcript: result.plainText,
          srtStats: formatSRTStats(result),
          srtProcessing: false,
          srtFile: file
        };
        
        console.log('💾 [狀態更新] 批量更新表單狀態:', {
          hasFile: !!successFormState.srtFile,
          hasTranscript: !!successFormState.transcript,
          transcriptLength: successFormState.transcript?.length || 0,
          fileName: successFormState.srtFile?.name,
          srtStats: successFormState.srtStats,
          timestamp: new Date().toISOString()
        });
        
        onFormChange(successFormState);
        
        // 顯示成功訊息
        successToast.srtUploadSuccess(formatSRTStats(result));
      } else {
        // 顯示錯誤訊息
        errorToast.srtUploadError(result.errorMessage || 'SRT 檔案解析失敗');
        const failureFormState = {
          ...form,
          srtFile: null,
          srtProcessing: false
        };
        onFormChange(failureFormState);
      }
    } catch (error) {
      console.error('SRT file processing error:', error);
      errorToast.srtUploadError('檔案處理過程中發生錯誤');
      const errorFormState = {
        ...form,
        srtFile: null,
        srtProcessing: false
      };
      onFormChange(errorFormState);
    }
  };

  // 檔案選擇處理
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleSRTFileUpload(file);
    }
    // 清空輸入，允許重複選擇同一檔案
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 顯示刪除確認對話框
  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };

  // 取消刪除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // 確認刪除 SRT 檔案 - 完整清除所有相關狀態
  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    handleRemoveSRTFile();
  };

  // 移除 SRT 檔案 - 完整清除所有相關狀態
  const handleRemoveSRTFile = () => {
    console.log('🗑️ [檔案移除] 開始清除 SRT 檔案和相關狀態');
    
    // 批量清除所有 SRT 相關狀態
    const clearedFormState = {
      ...form,
      srtFile: null,
      srtStats: '',
      transcript: '', // 完全清除 transcript
      srtProcessing: false
    };
    
    console.log('🧹 [狀態清除] 清除前狀態:', {
      hasSrtFile: !!form.srtFile,
      hasTranscript: !!form.transcript,
      transcriptLength: form.transcript?.length || 0,
      currentInputMode: inputMode
    });
    
    // 重置輸入模式回到手動輸入
    setInputMode('manual');
    
    // 批量更新表單狀態
    onFormChange(clearedFormState);
    
    console.log('✅ [狀態清除] 清除後狀態:', {
      hasSrtFile: false,
      hasTranscript: false,
      transcriptLength: 0,
      newInputMode: 'manual'
    });
    
    // 顯示移除成功通知
    successToast.general('檔案已移除', 'SRT 檔案和逐字稿內容已清除');
  };

  // 拖放處理器
  const dropHandler = createDropHandler(
    (files: FileList) => {
      const file = files[0];
      if (file) {
        handleSRTFileUpload(file);
      }
    },
    SRT_FILE_CONFIG
  );

  // 增強的拖放處理器，包含視覺回饋
  const enhancedDropHandler = {
    ...dropHandler,
    onDragOver: (e: React.DragEvent) => {
      dropHandler.onDragOver(e);
      setIsDragOver(true);
    },
    onDragEnter: (e: React.DragEvent) => {
      dropHandler.onDragEnter(e);
      setIsDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      dropHandler.onDragLeave(e);
      // 只有當滑鼠真正離開整個區域時才設為 false
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    },
    onDrop: (e: React.DragEvent) => {
      dropHandler.onDrop(e);
      setIsDragOver(false);
    }
  };

  // 切換輸入模式
  const handleInputModeChange = (mode: 'manual' | 'file') => {
    setInputMode(mode);
    if (mode === 'manual' && form.srtFile) {
      // 切換到手動輸入時，詢問是否保留現有內容
      // 這裡不清空，讓用戶自己決定
    }
  };

  // 點擊上傳按鈕
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Enhanced copy handlers with toast feedback
  const handleCopyTitle = async (title: string, index: number) => {
    try {
      await navigator.clipboard.writeText(title);
      onCopyTitle(title, index);
      successToast.general('複製成功', '標題已複製到剪貼板');
    } catch (err) {
      console.error('Failed to copy title:', err);
      errorToast.general('複製失敗', '無法複製標題，請手動選取複製');
    }
  };

  const handleCopyAllTitles = async () => {
    try {
      const allTitles = recommendedTitles.join('\n\n');
      await navigator.clipboard.writeText(allTitles);
      onCopyAllTitles();
      successToast.general('複製成功', `已複製 ${recommendedTitles.length} 個標題到剪貼板`);
    } catch (err) {
      console.error('Failed to copy all titles:', err);
      errorToast.general('複製失敗', '無法複製所有標題，請手動選取複製');
    }
  };

  // Handle generate button click - show confirmation dialog
  const handleGenerateClick = () => {
    // Validate required fields before showing confirmation
    if (!form.currentTitle.trim() || !form.description.trim()) {
      errorToast.general('請完成必填欄位', '請輸入目前標題和描述欄位');
      return;
    }
    
    setShowConfirmGenerate(true);
  };

  // Handle confirmation dialog cancel
  const handleConfirmCancel = () => {
    setShowConfirmGenerate(false);
  };

  // Handle confirmation dialog confirm
  const handleConfirmGenerate = (selectedKeywords: string[]) => {
    setShowConfirmGenerate(false);
    onGenerate(selectedKeywords);
  };

  // Prepare data for confirmation dialog
  const prepareConfirmData = () => {
    const hasTranscript = !!(form.transcript && form.transcript.trim().length > 0);
    const transcriptWordCount = hasTranscript ? form.transcript.trim().length : undefined;
    
    return {
      currentTitle: form.currentTitle,
      description: form.description,
      specialInstructions: form.specialInstructions,
      hasTranscript,
      transcriptWordCount,
      srtFileName: form.srtFile?.name,
      srtFileSize: form.srtFile ? formatFileSize(form.srtFile.size) : undefined,
      srtStats: form.srtStats || undefined
    };
  };

  // Prepare keywords data for confirmation dialog
  const prepareKeywordsData = () => {
    if (!keywordFilter.availableKeywords || keywordFilter.availableKeywords.length === 0) {
      return [];
    }

    return keywordFilter.availableKeywords.map(group => ({
      id: group.keyword,
      keyword: group.keyword,
      titlesCount: group.count
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl flex flex-col p-0" 
        showCloseButton={false}
        positioning="center"
      >
        {stage === 'input' ? (
          // Input Stage
          <>
            <DialogHeader className="p-6 pb-4 border-b">
              <DialogTitle className="text-lg font-semibold">建立影片標題</DialogTitle>
              <DialogDescription className="mt-1">
                請提供影片資訊以生成優化的標題建議
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto p-4 sm:p-6 pt-4 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  目前標題 <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={form.currentTitle}
                  onChange={(e) => handleFormChange('currentTitle', e.target.value)}
                  placeholder="請輸入目前的影片標題..."
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background text-foreground placeholder:text-muted-foreground"
                  rows={2}
                  aria-describedby="current-title-desc"
                />
                <p id="current-title-desc" className="sr-only">
                  請輸入影片的目前標題，這是必填欄位
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  描述欄位 <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="請輸入影片描述..."
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background text-foreground placeholder:text-muted-foreground"
                  rows={4}
                  aria-describedby="description-desc"
                />
                <p id="description-desc" className="sr-only">
                  請輸入影片的詳細描述，這是必填欄位
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  特殊指示 <span className="text-muted-foreground">(選填)</span>
                </label>
                <textarea
                  value={form.specialInstructions}
                  onChange={(e) => handleFormChange('specialInstructions', e.target.value)}
                  placeholder="請輸入特殊要求或指示，例如：避免使用特定詞彙、偏好的風格等..."
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background text-foreground placeholder:text-muted-foreground"
                  rows={2}
                  aria-describedby="special-instructions-desc"
                />
                <p id="special-instructions-desc" className="sr-only">
                  您可以選擇性地提供特殊指示來客製化標題生成
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-foreground">
                    逐字稿 <span className="text-muted-foreground">(選填)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleInputModeChange('manual')}
                      className={cn(
                        "px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
                        inputMode === 'manual'
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-input hover:bg-muted"
                      )}
                    >
                      手動輸入
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputModeChange('file')}
                      className={cn(
                        "px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md border transition-colors flex items-center gap-1 sm:gap-1.5",
                        inputMode === 'file'
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-input hover:bg-muted"
                      )}
                    >
                      <FilePlus2 className="h-3 w-3" />
                      <span className="hidden sm:inline">SRT 檔案</span>
                      <span className="sm:hidden">SRT</span>
                    </button>
                  </div>
                </div>

                {inputMode === 'manual' ? (
                  <textarea
                    value={form.transcript}
                    onChange={(e) => handleFormChange('transcript', e.target.value)}
                    placeholder="請輸入影片逐字稿（選填）..."
                    className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background text-foreground placeholder:text-muted-foreground"
                    rows={5}
                    aria-describedby="transcript-desc"
                  />
                ) : (
                  <div className="space-y-3">
                    {/* 檔案上傳區域 */}
                    <div
                      {...enhancedDropHandler}
                      className={cn(
                        "relative border-2 border-dashed rounded-lg p-4 sm:p-6 transition-all duration-200 cursor-pointer",
                        isDragOver
                          ? "border-primary bg-primary/5 scale-[1.02]"
                          : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30",
                        form.srtProcessing && "pointer-events-none opacity-50"
                      )}
                      onClick={handleUploadClick}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={SRT_FILE_CONFIG.accept}
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={form.srtProcessing}
                        aria-describedby="file-upload-desc"
                      />
                      
                      <div className="flex flex-col items-center justify-center text-center">
                        {form.srtProcessing ? (
                          <div className="space-y-4">
                            <LoadingSpinner size="md" className="mb-2" />
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-foreground">正在處理 SRT 檔案</p>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <span>檔案驗證中...</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span>解析字幕內容...</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                  <span>準備完成</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : isDragOver ? (
                          <>
                            <Upload className="h-8 w-8 text-primary mb-3" />
                            <p className="text-sm font-medium text-primary">放開以上傳檔案</p>
                            <p className="text-xs text-muted-foreground mt-1">支援 .srt 格式</p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                              <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm font-medium text-foreground">上傳 SRT 字幕檔案</p>
                            <p className="text-xs text-muted-foreground mt-1 px-2 text-center">
                              拖放檔案到此處，或點擊選擇檔案
                            </p>
                            <p className="text-xs text-muted-foreground px-2 text-center">
                              支援 .srt 格式，最大 10MB
                            </p>
                          </>
                        )}
                      </div>
                    </div>


                    {/* 修復：優化預覽文字區域條件檢查 */}
                    {(() => {
                      const shouldShowPreview = !!(form.transcript && form.transcript.trim().length > 0 && inputMode === 'file' && form.srtFile);
                      console.log('🖼️ [預覽區域] 條件檢查:', {
                        hasTranscript: !!form.transcript,
                        transcriptLength: form.transcript?.length || 0,
                        isFileMode: inputMode === 'file',
                        hasSrtFile: !!form.srtFile,
                        shouldShow: shouldShowPreview,
                        timestamp: new Date().toISOString()
                      });
                      return shouldShowPreview;
                    })() && (
                      <div 
                        className="border border-green-200 rounded-lg bg-green-50/50"
                        role="region"
                        aria-label="SRT 逐字稿預覽區域"
                      >
                        <div className="px-4 py-3 bg-green-100 border-b border-green-200 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                  <p className="text-sm font-medium text-green-800">逐字稿已準備就緒</p>
                                </div>
                                {form.srtFile && (
                                  <div className="flex items-center gap-2 text-xs text-green-600">
                                    <span className="font-medium truncate" title={form.srtFile.name}>
                                      📄 {form.srtFile.name}
                                    </span>
                                    <span>•</span>
                                    <span className="font-medium">{formatFileSize(form.srtFile.size)}</span>
                                    {form.srtStats && (
                                      <>
                                        <span>•</span>
                                        <span className="font-medium">{form.srtStats}</span>
                                      </>
                                    )}
                                    <span>•</span>
                                    <span className="font-medium">{form.transcript.length} 字元</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleShowDeleteConfirm}
                              className="flex-shrink-0 h-8 w-8 p-0 text-green-600 hover:text-red-600 hover:bg-red-50"
                              title="移除檔案"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className={`transition-all duration-300 ${isContentExpanded ? 'max-h-64' : 'max-h-24'} overflow-y-auto`}>
                            <p className="text-sm text-green-800 leading-relaxed whitespace-pre-wrap">
                              {isContentExpanded ? form.transcript : `${form.transcript.substring(0, 150)}...`}
                            </p>
                          </div>
                          {form.transcript.length > 150 && (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsContentExpanded(!isContentExpanded)}
                                className="text-green-700 hover:text-green-800 hover:bg-green-100 px-0"
                              >
                                {isContentExpanded ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    收起內容
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    顯示完整內容
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <p id="transcript-desc" className="sr-only">
                  您可以選擇性地提供影片逐字稿以獲得更精確的標題建議
                </p>
                <p id="file-upload-desc" className="sr-only">
                  上傳 SRT 字幕檔案，支援拖放操作，檔案大小限制 10MB
                </p>
              </div>
            </div>
            
            <DialogFooter className="flex items-center justify-between p-4 sm:p-6 pt-4 border-t bg-muted/30">
              <div className="flex items-center gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                >
                  取消
                </Button>
              </div>
              <Button
                onClick={handleGenerateClick}
                disabled={isLoading || !form.currentTitle.trim() || !form.description.trim()}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                生成標題
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Results Stage
          <>
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-lg font-semibold">推薦標題</DialogTitle>
                  <DialogDescription className="mt-1">
                    已為您生成 {recommendedTitles.length} 個優化標題建議
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    onClick={handleCopyAllTitles}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {copiedAll ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    複製全部
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto p-4 sm:p-6 pt-4 space-y-4">
              {recommendedTitles.map((title, index) => (
                <div 
                  key={index}
                  className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-card"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0 border border-primary/20">
                        {index + 1}
                      </span>
                      <p className="text-foreground leading-relaxed flex-1">{title}</p>
                    </div>
                    <Button
                      onClick={() => handleCopyTitle(title, index)}
                      variant="ghost"
                      size="sm"
                      className="flex items-center justify-center w-8 h-8 p-0 flex-shrink-0"
                      title="複製標題"
                      aria-label={`複製第 ${index + 1} 個標題`}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <DialogFooter className="flex items-center justify-between p-4 sm:p-6 pt-4 border-t bg-muted/30">
              <Button
                onClick={onBackToEdit}
                variant="outline"
              >
                返回編輯
              </Button>
              <Button onClick={onClose}>
                關閉
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
      
      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              確認移除檔案
            </DialogTitle>
            <DialogDescription className="text-left">
              您確定要移除這個 SRT 檔案嗎？此操作將會：
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>移除 SRT 檔案</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>清除所有逐字稿內容</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>重置為手動輸入模式</span>
              </div>
            </div>
            
            {form.srtFile && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{form.srtFile.name}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{formatFileSize(form.srtFile.size)}</span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              確認移除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirm Generate Dialog */}
      <ConfirmGenerateDialog
        isOpen={showConfirmGenerate}
        onClose={handleConfirmCancel}
        onCancel={handleConfirmCancel}
        onConfirm={handleConfirmGenerate}
        isLoading={isLoading}
        data={prepareConfirmData()}
        keywords={prepareKeywordsData()}
        isLoadingKeywords={false}
      />
    </Dialog>
  );
};