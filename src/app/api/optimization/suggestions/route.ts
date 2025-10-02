import { NextRequest, NextResponse } from 'next/server';
import { TitleSuggestionRequest, OptimizationSuggestion } from '@/types/channel-optimization';

// 模擬數據庫
const suggestions: OptimizationSuggestion[] = [];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    let filteredSuggestions = suggestions;
    
    if (videoId) {
      filteredSuggestions = filteredSuggestions.filter(s => s.videoId === videoId);
    }
    
    if (type) {
      filteredSuggestions = filteredSuggestions.filter(s => s.type === type);
    }
    
    if (status) {
      filteredSuggestions = filteredSuggestions.filter(s => s.status === status);
    }

    return NextResponse.json({
      success: true,
      suggestions: filteredSuggestions,
    });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData: TitleSuggestionRequest = await request.json();
    
    console.log('🎯 Generating optimization suggestions for video:', requestData.videoId);
    console.log('📊 Request data:', {
      currentTitle: requestData.currentTitle,
      hasDescription: !!requestData.description,
      hasTranscript: !!requestData.transcript,
      targetKeywords: requestData.targetKeywords,
      externalTitlesCount: requestData.referenceContext.externalTitles.length,
      ownTopTitlesCount: requestData.referenceContext.ownTopTitles.length,
    });

    // 準備發送到 n8n webhook 的增強數據
    const enhancedWebhookPayload = {
      // 原有的數據結構
      currentTitle: requestData.currentTitle,
      description: requestData.description || '',
      transcript: requestData.transcript || '',
      specialInstructions: requestData.specialInstructions || '',
      
      // 新增的優化上下文
      optimization: {
        videoId: requestData.videoId,
        targetKeywords: requestData.targetKeywords || [],
        referenceContext: {
          // 來自 YouTube Analytics database 的成功標題
          externalSuccessfulTitles: requestData.referenceContext.externalTitles,
          
          // 用戶自己頻道的高表現標題
          ownTopPerformingTitles: requestData.referenceContext.ownTopTitles,
          
          // 混合參考標題 (結合外部和內部)
          combinedReferenceTitles: [
            ...requestData.referenceContext.externalTitles,
            ...requestData.referenceContext.ownTopTitles
          ],
        },
        requestType: 'channel_optimization', // 標識這是來自頻道優化功能
        analysisDepth: 'enhanced', // 要求更深入的分析
      }
    };

    console.log('🚀 Sending enhanced payload to n8n webhook:', {
      payloadSize: JSON.stringify(enhancedWebhookPayload).length,
      externalTitlesCount: enhancedWebhookPayload.optimization.referenceContext.externalSuccessfulTitles.length,
      ownTitlesCount: enhancedWebhookPayload.optimization.referenceContext.ownTopPerformingTitles.length,
      combinedTitlesCount: enhancedWebhookPayload.optimization.referenceContext.combinedReferenceTitles.length,
    });

    // 調用 n8n webhook
    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_CREATE_TITLE_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      throw new Error('N8N webhook URL not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes timeout

    try {
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000'
        },
        body: JSON.stringify(enhancedWebhookPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`N8N webhook error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📨 N8N webhook response:', result);

      // 解析 n8n 的回應並創建建議
      const titleSuggestions = parseTitleSuggestionsFromN8N(result);
      
      // 創建優化建議記錄
      const newSuggestions: OptimizationSuggestion[] = titleSuggestions.map((title, index) => ({
        id: generateId(),
        videoId: requestData.videoId,
        type: 'title' as const,
        currentValue: requestData.currentTitle,
        suggestedValue: title,
        reasoning: `AI-generated title suggestion based on ${requestData.referenceContext.externalTitles.length} successful external titles and ${requestData.referenceContext.ownTopTitles.length} own top-performing titles.`,
        referenceVideos: [], // 這裡可以添加參考影片的 IDs
        confidence: 85 + Math.floor(Math.random() * 10), // 85-94% 信心度
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // 保存到數據庫
      suggestions.push(...newSuggestions);

      return NextResponse.json({
        success: true,
        suggestions: newSuggestions,
        enhancedAnalysis: true,
        referenceContext: {
          externalTitlesUsed: requestData.referenceContext.externalTitles.length,
          ownTitlesUsed: requestData.referenceContext.ownTopTitles.length,
        },
      });

    } catch (webhookError) {
      clearTimeout(timeoutId);
      console.error('N8N webhook failed:', webhookError);
      
      // 如果 webhook 失敗，返回基於規則的建議
      const fallbackSuggestions = generateFallbackTitleSuggestions(requestData);
      
      suggestions.push(...fallbackSuggestions);

      return NextResponse.json({
        success: true,
        suggestions: fallbackSuggestions,
        enhancedAnalysis: false,
        fallbackUsed: true,
        error: 'Webhook failed, using fallback suggestions',
      });
    }

  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

function parseTitleSuggestionsFromN8N(result: any): string[] {
  // 解析不同格式的 n8n 回應
  let recommendedTitles: string[] = [];
  
  if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
    recommendedTitles = result;
  } else if (result.recommendedTitles && Array.isArray(result.recommendedTitles)) {
    recommendedTitles = result.recommendedTitles;
  } else if (Array.isArray(result) && result.length > 0 && result[0].message) {
    const content = result[0].message.content;
    if (content && content.recommendedTitles && Array.isArray(content.recommendedTitles)) {
      recommendedTitles = content.recommendedTitles;
    }
  }
  
  return recommendedTitles.filter(title => title && typeof title === 'string');
}

function generateFallbackTitleSuggestions(requestData: TitleSuggestionRequest): OptimizationSuggestion[] {
  // 基於規則的備用建議生成
  const currentTitle = requestData.currentTitle;
  const keywords = requestData.targetKeywords || [];
  
  const variations = [
    `${currentTitle} - Complete Guide`,
    `How to ${currentTitle.toLowerCase()}`,
    `${currentTitle} Tutorial`,
    `${currentTitle} Tips & Tricks`,
    `${currentTitle} Explained`,
  ];

  return variations.map((title, index) => ({
    id: generateId(),
    videoId: requestData.videoId,
    type: 'title' as const,
    currentValue: currentTitle,
    suggestedValue: title,
    reasoning: 'Fallback suggestion based on title optimization patterns',
    referenceVideos: [],
    confidence: 60 + index * 5, // 降低信心度
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}