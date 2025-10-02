// YouTube Analytics 相關類型定義

export interface AttachmentType {
  url?: string;
  filename?: string;
  type?: string;
  thumbnails?: {
    large?: { url: string };
    small?: { url: string };
  };
}

export interface ButtonType {
  label?: string;
  url?: string;
}

export interface CreateTitleForm {
  currentTitle: string;
  description: string;
  transcript: string;
  specialInstructions: string;
  srtFile?: File | null;
  srtProcessing?: boolean;
  srtStats?: string;
}

export interface ImagePreview {
  url: string;
  filename: string;
}

export interface RecordIdentifier {
  title?: string;
  channel?: string;
  publishDate?: string;
  viewCount?: string;
  keywords?: string;
  fallbackName?: string;
}

export interface DeleteRecord {
  id: string;
  info: RecordIdentifier;
}

export interface TextPreview {
  text: string;
  fieldName: string;
}

export interface GenerateThumbnailData {
  originalImageUrl?: string;
  prompt?: string;
  thumbnailDescription?: string;
  recordId?: string;
}

// Keyword 相關類型定義
export interface KeywordGroup {
  keyword: string;
  titles: TitleWithKeyword[];
  count: number;
}

export interface TitleWithKeyword {
  title: string;
  recordId: string;
  keywords: string[];
  originalKeywordField?: string;
}

export interface KeywordFilter {
  selectedKeywords: string[];
  filteredTitles: TitleWithKeyword[];
  availableKeywords: KeywordGroup[];
}

export type ModalStage = 'input' | 'results';

export interface ModalStates {
  showImagePreview: boolean;
  showDeleteConfirm: boolean;
  showCreateTitle: boolean;
  showGenerateThumbnail: boolean;
  previewImage: ImagePreview;
  deleteRecord: DeleteRecord;
  generateThumbnailData: GenerateThumbnailData;
}

export interface YouTubeAnalyticsState {
  query: string;
  loading: boolean;
  dataLoading: boolean;
  createTitleLoading: boolean;
  modalStage: ModalStage;
  form: CreateTitleForm;
  recommendedTitles: string[];
  copiedIndex: number | null;
  copiedAll: boolean;
  keywordFilter: KeywordFilter;
}