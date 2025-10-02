'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ToastProvider } from '@/components/ui/toast';
import { Youtube, TrendingUp } from 'lucide-react';

// Import refactored components
import {
  SearchBar,
  YouTubeDataGrid,
  ImagePreviewModal,
  DeleteConfirmModal,
  CreateTitleModal,
  TextPreviewModal,
  GenerateThumbnailModal
} from '@/components/youtube-analytics';

// Import custom hook
import { useYouTubeAnalytics } from '@/hooks/useYouTubeAnalytics';

// Create a separate component for the main content
const YouTubeAnalyticsContent = () => {
  const {
    // States
    query,
    setQuery,
    error,
    searchHistory,
    loading,
    dataLoading,
    tables,
    fields,
    records,
    selectedTableId,
    
    // Modal states
    showImagePreview,
    showDeleteConfirm,
    showCreateTitle,
    showTextPreview,
    showGenerateThumbnail,
    previewImage,
    deleteRecord,
    previewText,
    generateThumbnailData,
    modalStage,
    form,
    recommendedTitles,
    createTitleLoading,
    copiedIndex,
    copiedAll,
    keywordFilter,
    
    // Actions
    handleSearch,
    handleCreateTitle,
    handleDeleteRecord,
    handleGenerateSummary,
    openImagePreview,
    openDeleteConfirm,
    openCreateTitle,
    openTextPreview,
    openGenerateThumbnail,
    closeImagePreview,
    closeDeleteConfirm,
    closeCreateTitle,
    closeTextPreview,
    closeGenerateThumbnail,
    setForm,
    copyTitle,
    copyAllTitles,
    resetCreateTitleForm,
    preserveDataBackToEdit,
  } = useYouTubeAnalytics();

  return (
      <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Youtube className="h-8 w-8 text-red-600" />
                </div>
                YouTube Analytics
              </h1>
              <p className="text-muted-foreground mt-2">
                Search and analyze YouTube video data with advanced insights
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">
                {records.length} videos loaded
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearch}
            isLoading={loading}
          />

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Recent scrape requests:</span>
                {searchHistory.map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(historyQuery)}
                    className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                  >
                    {historyQuery}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  YouTube Analytics Data
                  {loading && <LoadingSpinner size="sm" />}
                </div>
                <Button 
                  onClick={openCreateTitle}
                  disabled={createTitleLoading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  {createTitleLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Youtube className="h-4 w-4" />
                  )}
                  建立影片 Title
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <YouTubeDataGrid
                records={records}
                fields={fields}
                tables={tables}
                selectedTableId={selectedTableId}
                loading={dataLoading}
                onImagePreview={openImagePreview}
                onDeleteRecord={openDeleteConfirm}
                onGenerateSummary={handleGenerateSummary}
                onTextPreview={openTextPreview}
                onGenerateThumbnail={openGenerateThumbnail}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modals */}
      <ImagePreviewModal
        imageUrl={previewImage.url}
        filename={previewImage.filename}
        isOpen={showImagePreview}
        onClose={closeImagePreview}
      />
      
      <DeleteConfirmModal
        recordId={deleteRecord.id}
        recordInfo={deleteRecord.info}
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteRecord}
        onCancel={closeDeleteConfirm}
      />
      
      <CreateTitleModal
        isOpen={showCreateTitle}
        stage={modalStage}
        form={form}
        recommendedTitles={recommendedTitles}
        isLoading={createTitleLoading}
        copiedIndex={copiedIndex}
        copiedAll={copiedAll}
        keywordFilter={keywordFilter}
        onClose={closeCreateTitle}
        onFormChange={setForm}
        onGenerate={handleCreateTitle}
        onBackToEdit={preserveDataBackToEdit}
        onCopyTitle={copyTitle}
        onCopyAllTitles={copyAllTitles}
      />
      
      <TextPreviewModal
        text={previewText.text}
        fieldName={previewText.fieldName}
        isOpen={showTextPreview}
        onClose={closeTextPreview}
      />

      <GenerateThumbnailModal
        isOpen={showGenerateThumbnail}
        onClose={closeGenerateThumbnail}
        originalImageUrl={generateThumbnailData.originalImageUrl}
        thumbnailDescription={generateThumbnailData.thumbnailDescription}
      />
    </div>
  );
};

export default function YouTubeAnalyticsPage() {
  return (
    <ToastProvider>
      <YouTubeAnalyticsContent />
    </ToastProvider>
  );
}