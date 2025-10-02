'use client';

import { useState } from 'react';
import { ImagePreview, DeleteRecord, ModalStage, CreateTitleForm, TextPreview, RecordIdentifier, GenerateThumbnailData, KeywordFilter } from '@/types/youtube-analytics';

export const useModalStates = () => {
  // Modal visibility states
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateTitle, setShowCreateTitle] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [showGenerateThumbnail, setShowGenerateThumbnail] = useState(false);
  
  // Modal data states
  const [previewImage, setPreviewImage] = useState<ImagePreview>({ url: '', filename: '' });
  const [deleteRecord, setDeleteRecord] = useState<DeleteRecord>({ id: '', info: { fallbackName: '' } });
  const [previewText, setPreviewText] = useState<TextPreview>({ text: '', fieldName: '' });
  const [generateThumbnailData, setGenerateThumbnailData] = useState<GenerateThumbnailData>({ 
    originalImageUrl: '', 
    thumbnailDescription: '',
    recordId: ''
  });
  const [modalStage, setModalStage] = useState<ModalStage>('input');
  
  // Create title modal states
  const [form, setForm] = useState<CreateTitleForm>({
    currentTitle: '',
    description: '',
    transcript: '',
    specialInstructions: '',
    srtFile: null,
    srtProcessing: false,
    srtStats: ''
  });
  const [recommendedTitles, setRecommendedTitles] = useState<string[]>([]);
  const [createTitleLoading, setCreateTitleLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  
  // Keyword filter state
  const [keywordFilter, setKeywordFilter] = useState<KeywordFilter>({
    selectedKeywords: [],
    filteredTitles: [],
    availableKeywords: []
  });

  // Modal actions
  const openImagePreview = (url: string, filename: string) => {
    setPreviewImage({ url, filename });
    setShowImagePreview(true);
  };

  const closeImagePreview = () => {
    setShowImagePreview(false);
    setPreviewImage({ url: '', filename: '' });
  };

  const openDeleteConfirm = (id: string, info: RecordIdentifier) => {
    setDeleteRecord({ id, info });
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeleteRecord({ id: '', info: { fallbackName: '' } });
  };

  const openTextPreview = (text: string, fieldName: string) => {
    setPreviewText({ text, fieldName });
    setShowTextPreview(true);
  };

  const closeTextPreview = () => {
    setShowTextPreview(false);
    setPreviewText({ text: '', fieldName: '' });
  };

  const openGenerateThumbnail = (originalImageUrl?: string, thumbnailDescription?: string, recordId?: string) => {
    setGenerateThumbnailData({ 
      originalImageUrl: originalImageUrl || '', 
      thumbnailDescription: thumbnailDescription || '',
      recordId: recordId || ''
    });
    setShowGenerateThumbnail(true);
  };

  const closeGenerateThumbnail = () => {
    setShowGenerateThumbnail(false);
    setGenerateThumbnailData({ 
      originalImageUrl: '', 
      thumbnailDescription: '',
      recordId: ''
    });
  };

  const openCreateTitle = () => {
    setShowCreateTitle(true);
    setModalStage('input');
    setRecommendedTitles([]);
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  const closeCreateTitle = () => {
    setShowCreateTitle(false);
    setModalStage('input');
    setForm({ 
      currentTitle: '', 
      description: '', 
      transcript: '',
      specialInstructions: '',
      srtFile: null,
      srtProcessing: false,
      srtStats: ''
    });
    setRecommendedTitles([]);
    setCreateTitleLoading(false);
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  const resetCreateTitleForm = () => {
    setForm({ 
      currentTitle: '', 
      description: '', 
      transcript: '',
      specialInstructions: '',
      srtFile: null,
      srtProcessing: false,
      srtStats: ''
    });
    setModalStage('input');
    setRecommendedTitles([]);
    setCopiedIndex(null);
    setCopiedAll(false);
  };

  const copyTitle = async (title: string, index: number) => {
    try {
      await navigator.clipboard.writeText(title);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy title:', error);
    }
  };

  const copyAllTitles = async () => {
    try {
      const allTitles = recommendedTitles.join('\n');
      await navigator.clipboard.writeText(allTitles);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy all titles:', error);
    }
  };

  // Preserve form data when going back to edit
  const preserveDataBackToEdit = () => {
    // Only reset the stage and results-related states
    // Keep all form data intact including SRT file
    setModalStage('input');
    setRecommendedTitles([]);
    setCopiedIndex(null);
    setCopiedAll(false);
    // Note: We intentionally DO NOT reset the form state here
    // This preserves: currentTitle, description, transcript, specialInstructions, srtFile, srtStats
  };

  return {
    // States
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
    setShowImagePreview,
    setShowDeleteConfirm,
    setShowCreateTitle,
    setShowTextPreview,
    setShowGenerateThumbnail,
    setModalStage,
    setForm,
    setRecommendedTitles,
    setCreateTitleLoading,
    setKeywordFilter,
    openImagePreview,
    closeImagePreview,
    openDeleteConfirm,
    closeDeleteConfirm,
    openTextPreview,
    closeTextPreview,
    openGenerateThumbnail,
    closeGenerateThumbnail,
    openCreateTitle,
    closeCreateTitle,
    resetCreateTitleForm,
    preserveDataBackToEdit,
    copyTitle,
    copyAllTitles,
  };
};