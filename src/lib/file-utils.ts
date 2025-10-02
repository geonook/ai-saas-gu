/**
 * 檔案處理工具函數
 * 提供檔案驗證、格式檢查等功能
 */

export interface FileValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * 驗證檔案類型
 */
export function validateFileType(file: File, allowedExtensions: string[]): FileValidationResult {
  const fileName = file.name.toLowerCase();
  const isValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()));
  
  if (!isValidExtension) {
    return {
      isValid: false,
      errorMessage: `不支援的檔案格式。支援的格式：${allowedExtensions.join(', ')}`
    };
  }
  
  return { isValid: true };
}

/**
 * 驗證檔案大小
 */
export function validateFileSize(file: File, maxSizeInMB: number): FileValidationResult {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      errorMessage: `檔案大小超過限制 (最大 ${maxSizeInMB}MB)`
    };
  }
  
  if (file.size === 0) {
    return {
      isValid: false,
      errorMessage: '檔案為空'
    };
  }
  
  return { isValid: true };
}

/**
 * 格式化檔案大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * 獲取檔案擴展名
 */
export function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex > 0 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';
}

/**
 * 檢查檔案是否為文字檔
 */
export function isTextFile(file: File): boolean {
  const textExtensions = ['txt', 'srt', 'vtt', 'ass', 'ssa', 'sub'];
  const extension = getFileExtension(file.name);
  return textExtensions.includes(extension);
}

/**
 * 安全地讀取文字檔案
 */
export function readTextFile(file: File, encoding: string = 'UTF-8'): Promise<string> {
  return new Promise((resolve, reject) => {
    // 基本驗證
    if (!isTextFile(file)) {
      reject(new Error('不支援的檔案類型'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('檔案讀取結果格式錯誤'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('檔案讀取失敗'));
    };
    
    reader.readAsText(file, encoding);
  });
}

/**
 * 建立檔案輸入元素的配置
 */
export interface FileInputConfig {
  accept: string;
  multiple?: boolean;
  maxSize?: number; // MB
  allowedExtensions: string[];
}

/**
 * SRT 檔案的配置
 */
export const SRT_FILE_CONFIG: FileInputConfig = {
  accept: '.srt',
  multiple: false,
  maxSize: 10, // 10MB
  allowedExtensions: ['.srt']
};

/**
 * 驗證上傳的檔案
 */
export function validateUploadedFile(file: File, config: FileInputConfig): FileValidationResult {
  // 檢查檔案類型
  const typeValidation = validateFileType(file, config.allowedExtensions);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  // 檢查檔案大小
  if (config.maxSize) {
    const sizeValidation = validateFileSize(file, config.maxSize);
    if (!sizeValidation.isValid) {
      return sizeValidation;
    }
  }
  
  return { isValid: true };
}

/**
 * 建立檔案拖放處理器
 */
export function createDropHandler(
  onFileDrop: (files: FileList) => void,
  config: FileInputConfig
) {
  return {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        if (!config.multiple && files.length > 1) {
          console.warn('Only single file upload is allowed');
          return;
        }
        onFileDrop(files);
      }
    }
  };
}