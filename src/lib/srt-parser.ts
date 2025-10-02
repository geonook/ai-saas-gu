/**
 * SRT 字幕檔案解析工具
 * 支援標準 SRT 格式的解析，提取純文字內容
 */

export interface SRTEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface SRTParseResult {
  success: boolean;
  entries: SRTEntry[];
  plainText: string;
  errorMessage?: string;
}

/**
 * 解析 SRT 時間格式 (例如: "00:01:23,456")
 */
function parseTimeCode(timeCode: string): boolean {
  const timePattern = /^\d{2}:\d{2}:\d{2},\d{3}$/;
  return timePattern.test(timeCode.trim());
}

/**
 * 清理文字內容，移除 HTML 標籤和多餘空白
 */
function cleanText(text: string): string {
  return text
    // 移除 HTML 標籤 (例如: <i>, <b>, <u>, <font>)
    .replace(/<[^>]*>/g, '')
    // 移除多餘的空白字符
    .replace(/\s+/g, ' ')
    // 移除行首行尾空白
    .trim();
}

/**
 * 驗證 SRT 檔案格式
 */
function validateSRTContent(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: 'SRT 檔案內容為空' };
  }

  // 檢查是否包含基本的 SRT 結構
  const hasTimePattern = /\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(content);
  if (!hasTimePattern) {
    return { isValid: false, error: '檔案格式不正確，未找到有效的時間碼格式' };
  }

  return { isValid: true };
}

/**
 * 解析 SRT 檔案內容
 */
export function parseSRT(content: string): SRTParseResult {
  try {
    // 驗證檔案格式
    const validation = validateSRTContent(content);
    if (!validation.isValid) {
      return {
        success: false,
        entries: [],
        plainText: '',
        errorMessage: validation.error
      };
    }

    // 正規化換行符號並分割成區塊
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalizedContent.split(/\n\s*\n/).filter(block => block.trim());

    const entries: SRTEntry[] = [];
    const textParts: string[] = [];

    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length < 3) {
        // 跳過格式不完整的區塊
        continue;
      }

      // 第一行：序號
      const indexMatch = lines[0].match(/^\d+$/);
      if (!indexMatch) {
        continue;
      }
      const index = parseInt(lines[0], 10);

      // 第二行：時間碼
      const timeMatch = lines[1].match(/^(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})$/);
      if (!timeMatch) {
        continue;
      }
      const [, startTime, endTime] = timeMatch;

      // 驗證時間碼格式
      if (!parseTimeCode(startTime) || !parseTimeCode(endTime)) {
        continue;
      }

      // 第三行及之後：字幕文字
      const textLines = lines.slice(2);
      const rawText = textLines.join(' ');
      const cleanedText = cleanText(rawText);

      if (cleanedText) {
        entries.push({
          index,
          startTime,
          endTime,
          text: cleanedText
        });
        textParts.push(cleanedText);
      }
    }

    if (entries.length === 0) {
      return {
        success: false,
        entries: [],
        plainText: '',
        errorMessage: '無法解析任何有效的字幕內容'
      };
    }

    // 合併所有文字，用空格分隔
    const plainText = textParts.join(' ');

    return {
      success: true,
      entries,
      plainText,
    };

  } catch (error) {
    console.error('SRT parsing error:', error);
    return {
      success: false,
      entries: [],
      plainText: '',
      errorMessage: `解析錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
    };
  }
}

/**
 * 從檔案讀取並解析 SRT 內容
 */
export function parseSRTFile(file: File): Promise<SRTParseResult> {
  return new Promise((resolve) => {
    // 驗證檔案類型
    if (!file.name.toLowerCase().endsWith('.srt')) {
      resolve({
        success: false,
        entries: [],
        plainText: '',
        errorMessage: '請選擇 .srt 格式的檔案'
      });
      return;
    }

    // 驗證檔案大小 (限制 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      resolve({
        success: false,
        entries: [],
        plainText: '',
        errorMessage: '檔案大小超過限制 (最大 10MB)'
      });
      return;
    }

    // 驗證檔案不為空
    if (file.size === 0) {
      resolve({
        success: false,
        entries: [],
        plainText: '',
        errorMessage: 'SRT 檔案為空'
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content) {
          resolve({
            success: false,
            entries: [],
            plainText: '',
            errorMessage: '無法讀取檔案內容'
          });
          return;
        }

        const result = parseSRT(content);
        resolve(result);
      } catch (error) {
        console.error('File reading error:', error);
        resolve({
          success: false,
          entries: [],
          plainText: '',
          errorMessage: `檔案讀取錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        entries: [],
        plainText: '',
        errorMessage: '檔案讀取失敗'
      });
    };

    // 使用 UTF-8 編碼讀取檔案
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 格式化解析統計資訊
 */
export function formatSRTStats(result: SRTParseResult): string {
  if (!result.success) {
    return '解析失敗';
  }

  const entryCount = result.entries.length;
  const wordCount = result.plainText.split(/\s+/).filter(word => word.length > 0).length;
  const charCount = result.plainText.length;

  return `已解析 ${entryCount} 段字幕，共 ${wordCount} 個詞，${charCount} 個字符`;
}