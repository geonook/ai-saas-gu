import { AirtableRecord, AirtableField } from '@/types/airtable';
import { KeywordGroup, TitleWithKeyword, KeywordFilter } from '@/types/youtube-analytics';

/**
 * 解析 keyword 字串，支援多種分隔符
 * @param keywordStr - 原始 keyword 字串
 * @returns 解析後的 keyword 陣列
 */
export function parseKeywords(keywordStr: string): string[] {
  if (!keywordStr || typeof keywordStr !== 'string') {
    return [];
  }

  // 支援的分隔符：逗號、分號、豎線、換行符（不包含空格，以保留完整的關鍵字詞組）
  const separators = /[,;|\n]+/;
  
  return keywordStr
    .split(separators)
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0)
    .map(keyword => {
      // 移除常見的標記符號
      return keyword.replace(/^[#@]+/, '').trim();
    })
    .filter(keyword => keyword.length > 0);
}

/**
 * 從 records 中提取 titles 和對應的 keywords
 * @param records - Airtable 記錄
 * @param fields - Airtable 欄位定義
 * @returns 包含 keyword 資訊的 titles 陣列
 */
export function extractTitlesWithKeywords(
  records: AirtableRecord[], 
  fields: AirtableField[]
): TitleWithKeyword[] {
  if (!records || records.length === 0 || !fields || fields.length === 0) {
    return [];
  }

  // 建立欄位名稱映射
  const fieldMap = fields.reduce((acc, field) => {
    acc[field.name.toLowerCase()] = field.name;
    return acc;
  }, {} as Record<string, string>);
  
  // 找到標題欄位
  const titleField = fieldMap['title'] || 
                    fieldMap['video title'] || 
                    fieldMap['name'] || 
                    fields.find(f => f.name.toLowerCase().includes('title'))?.name;
  
  // 找到 keyword 欄位
  const keywordField = fieldMap['keywords'] || 
                      fieldMap['keyword'] || 
                      fieldMap['tags'] || 
                      fieldMap['tag'] ||
                      fields.find(f => 
                        f.name.toLowerCase().includes('keyword') || 
                        f.name.toLowerCase().includes('tag')
                      )?.name;
  
  if (!titleField) {
    console.warn('⚠️ [Keyword Utils] 找不到標題欄位');
    return [];
  }
  
  // 提取所有 titles 和對應的 keywords
  return records
    .map(record => {
      const title = record.fields[titleField];
      const keywordValue = keywordField ? record.fields[keywordField] : '';
      
      if (typeof title !== 'string' || !title.trim()) {
        return null;
      }
      
      const keywords = parseKeywords(typeof keywordValue === 'string' ? keywordValue : '');
      
      return {
        title: title.trim(),
        recordId: record.id,
        keywords,
        originalKeywordField: keywordField
      } as TitleWithKeyword;
    })
    .filter((item): item is TitleWithKeyword => item !== null);
}

/**
 * 根據 titles 和 keywords 建立 keyword 分組
 * @param titlesWithKeywords - 包含 keyword 資訊的 titles
 * @returns 按 keyword 分組的資料
 */
export function createKeywordGroups(titlesWithKeywords: TitleWithKeyword[]): KeywordGroup[] {
  const keywordMap = new Map<string, TitleWithKeyword[]>();
  
  // 建立 keyword 到 titles 的映射
  titlesWithKeywords.forEach(titleItem => {
    if (titleItem.keywords.length === 0) {
      // 如果沒有 keywords，加入到 "未分類" 群組
      const noKeywordGroup = keywordMap.get('未分類') || [];
      noKeywordGroup.push(titleItem);
      keywordMap.set('未分類', noKeywordGroup);
    } else {
      // 將 title 加入到每個相關的 keyword 群組
      titleItem.keywords.forEach(keyword => {
        const group = keywordMap.get(keyword) || [];
        group.push(titleItem);
        keywordMap.set(keyword, group);
      });
    }
  });
  
  // 轉換為 KeywordGroup 陣列並排序
  return Array.from(keywordMap.entries())
    .map(([keyword, titles]) => ({
      keyword,
      titles,
      count: titles.length
    }))
    .sort((a, b) => {
      // "未分類" 排在最後，其他按 count 降序排列
      if (a.keyword === '未分類') return 1;
      if (b.keyword === '未分類') return -1;
      return b.count - a.count;
    });
}

/**
 * 根據選擇的 keywords 過濾 titles
 * @param titlesWithKeywords - 包含 keyword 資訊的 titles
 * @param selectedKeywords - 選擇的 keywords
 * @returns 過濾後的 titles
 */
export function filterTitlesByKeywords(
  titlesWithKeywords: TitleWithKeyword[], 
  selectedKeywords: string[]
): TitleWithKeyword[] {
  if (selectedKeywords.length === 0) {
    return titlesWithKeywords;
  }
  
  return titlesWithKeywords.filter(titleItem => {
    // 如果選擇了 "未分類"，只返回沒有 keywords 的 titles
    if (selectedKeywords.includes('未分類')) {
      if (titleItem.keywords.length === 0) {
        return true;
      }
    }
    
    // 檢查是否有任何一個 keyword 匹配
    return titleItem.keywords.some(keyword => 
      selectedKeywords.includes(keyword)
    );
  });
}

/**
 * 建立完整的 keyword 過濾器
 * @param records - Airtable 記錄
 * @param fields - Airtable 欄位定義
 * @param selectedKeywords - 目前選擇的 keywords（可選）
 * @returns KeywordFilter 物件
 */
export function createKeywordFilter(
  records: AirtableRecord[], 
  fields: AirtableField[],
  selectedKeywords: string[] = []
): KeywordFilter {
  const titlesWithKeywords = extractTitlesWithKeywords(records, fields);
  const availableKeywords = createKeywordGroups(titlesWithKeywords);
  const filteredTitles = filterTitlesByKeywords(titlesWithKeywords, selectedKeywords);
  
  console.log('📊 [Keyword Filter] 建立過濾器:', {
    totalTitles: titlesWithKeywords.length,
    availableKeywordGroups: availableKeywords.length,
    selectedKeywords: selectedKeywords.length,
    filteredTitles: filteredTitles.length,
    keywordGroupsPreview: availableKeywords.slice(0, 5).map(g => ({
      keyword: g.keyword,
      count: g.count
    }))
  });
  
  return {
    selectedKeywords,
    filteredTitles,
    availableKeywords
  };
}

/**
 * 從過濾後的 titles 中提取純標題陣列（用於傳送到 webhook）
 * @param filteredTitles - 過濾後的 titles
 * @returns 純標題字串陣列
 */
export function extractTitlesFromFiltered(filteredTitles: TitleWithKeyword[]): string[] {
  return filteredTitles.map(item => item.title);
}