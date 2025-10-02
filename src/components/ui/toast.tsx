'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    context.addToast(toast);
  }, [context]);

  // Predefined toast functions for common scenarios
  const successToast = {
    summaryTranscriptSuccess: () => showToast({
      type: 'success',
      title: '字幕重點已彙整完成',
      description: '系統已成功處理您的字幕內容並生成重點摘要',
      duration: 4000
    }),
    recordDeleted: () => showToast({
      type: 'success',
      title: '記錄刪除成功',
      description: '資料已從資料庫中移除',
      duration: 3000
    }),
    srtUploadSuccess: (stats: string) => showToast({
      type: 'success',
      title: 'SRT 檔案上傳成功',
      description: stats,
      duration: 4000
    }),
    general: (title: string, description?: string) => showToast({
      type: 'success',
      title,
      description,
      duration: 4000
    })
  };

  const errorToast = {
    summaryTranscriptError: (error?: string) => showToast({
      type: 'error',
      title: '字幕重點彙整失敗',
      description: error || '處理過程中發生錯誤，請稍後再試',
      duration: 6000
    }),
    deleteRecordError: () => showToast({
      type: 'error',
      title: '刪除記錄失敗',
      description: '刪除操作失敗，記錄已恢復。請稍後再試',
      duration: 6000
    }),
    srtUploadError: (error: string) => showToast({
      type: 'error',
      title: 'SRT 檔案處理失敗',
      description: error,
      duration: 6000
    }),
    general: (title: string, description?: string) => showToast({
      type: 'error',
      title,
      description,
      duration: 6000
    })
  };

  const infoToast = {
    processing: () => showToast({
      type: 'info',
      title: '正在處理字幕內容',
      description: '請稍候，系統正在彙整重點內容...',
      duration: 3000
    }),
    srtProcessing: () => showToast({
      type: 'info',
      title: '正在處理 SRT 檔案',
      description: '請稍候，系統正在解析字幕內容...',
      duration: 3000
    }),
    general: (title: string, description?: string) => showToast({
      type: 'info',
      title,
      description,
      duration: 4000
    })
  };

  const warningToast = {
    general: (title: string, description?: string) => showToast({
      type: 'warning',
      title,
      description,
      duration: 5000
    })
  };

  return {
    showToast,
    successToast,
    errorToast,
    infoToast,
    warningToast,
    removeToast: context.removeToast
  };
};

// Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    const duration = toast.duration || 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast Container Component
const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext);
  if (!context) return null;
  
  const { toasts, removeToast } = context;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast: Toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

// Individual Toast Item Component
const ToastItem: React.FC<{
  toast: Toast;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          border: 'border-l-green-500',
          bg: 'bg-green-50',
          icon: CheckCircle2,
          iconColor: 'text-green-600'
        };
      case 'error':
        return {
          border: 'border-l-red-500',
          bg: 'bg-red-50',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        };
      case 'warning':
        return {
          border: 'border-l-yellow-500',
          bg: 'bg-yellow-50',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600'
        };
      case 'info':
      default:
        return {
          border: 'border-l-blue-500',
          bg: 'bg-blue-50',
          icon: Info,
          iconColor: 'text-blue-600'
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`
        ${styles.bg} ${styles.border}
        border-l-4 border-r border-t border-b border-gray-200
        rounded-r-lg shadow-lg
        p-4 pr-10
        transform transition-all duration-200 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        hover:shadow-xl
        relative
      `}
    >
      {/* Close Button */}
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        title="關閉通知"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex items-start space-x-3">
        <Icon className={`h-5 w-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {toast.title}
          </h4>
          {toast.description && (
            <p className="text-xs text-gray-600 leading-relaxed">
              {toast.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToastProvider;