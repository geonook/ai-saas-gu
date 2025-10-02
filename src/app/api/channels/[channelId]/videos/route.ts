import { NextRequest, NextResponse } from 'next/server';
import { VideoScrapingOptions, PerformanceMetrics } from '@/types/channel-optimization';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const supabase = await createClient();
    const { channelId } = await params;
    const { searchParams } = new URL(request.url);
    
    // 取得當前用戶
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 驗證頻道屬於當前用戶
    const { data: channel } = await supabase
      .from('youtube_channels')
      .select('id')
      .eq('id', channelId)
      .eq('user_id', user.id)
      .single();

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found or access denied' },
        { status: 404 }
      );
    }
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const isHighPerforming = searchParams.get('isHighPerforming');
    
    // 建立查詢
    let baseQuery = supabase
      .from('youtube_videos')
      .select('*', { count: 'exact' })
      .eq('channel_id', channelId)
      .order('published_at', { ascending: false });

    if (isHighPerforming !== null) {
      baseQuery = baseQuery.eq('is_high_performing', isHighPerforming === 'true');
    }

    // 分頁
    const startIndex = (page - 1) * limit;
    const { data: videos, error, count } = await baseQuery
      .range(startIndex, startIndex + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    // Map database fields to frontend types
    const mappedVideos = (videos || []).map(video => {
      const baseVideo = {
        id: video.id,
        videoId: video.video_id,
        channelId: video.channel_id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnail_url,
        duration: video.duration,
        publishedAt: video.published_at,
        viewCount: video.view_count,
        likeCount: video.like_count,
        commentCount: video.comment_count,
        tags: video.tags,
        category: video.category,
        language: video.language,
        transcript: video.transcript,
        isHighPerforming: video.is_high_performing,
        performanceScore: video.performance_score,
        createdAt: video.created_at,
        updatedAt: video.updated_at,
      };

      // Process dual scoring data if available
      if (video.performance_metrics) {
        const metrics = video.performance_metrics as PerformanceMetrics;
        
        return {
          ...baseVideo,
          absoluteScore: metrics.absolute_score,
          relativeScore: metrics.relative_score,
          absoluteTier: determineAbsoluteTier(metrics.absolute_score),
          relativeTier: determineRelativeTier(metrics.relative_score),
          relativeRatio: metrics.relative_view_ratio,
          performanceMetrics: metrics,
        };
      }

      // Fallback to legacy scoring if no dual scoring data
      return baseVideo;
    });

    // Calculate channel performance statistics if we have dual scoring data
    let channelStats = null;
    if (mappedVideos.some(v => 'performanceMetrics' in v && v.performanceMetrics)) {
      channelStats = await calculateChannelStats(supabase, channelId);
    }

    return NextResponse.json({
      success: true,
      videos: mappedVideos,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      channelStats,
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`🚀 [${requestId}] === VIDEO SCRAPING REQUEST STARTED ===`);
  console.log(`📝 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  
  try {
    const supabase = await createClient();
    const { channelId } = await params;
    
    console.log(`📋 [${requestId}] Request details:`, {
      channelId,
      method: request.method,
      url: request.url,
      headers: {
        'content-type': request.headers.get('content-type'),
        'user-agent': request.headers.get('user-agent')?.substring(0, 50) + '...',
      }
    });
    
    let options: VideoScrapingOptions;
    try {
      options = await request.json();
      console.log(`🔍 [${requestId}] Received options:`, {
        includeShorts: options.includeShorts,
        maxVideos: options.maxVideos,
        useApify: options.useApify,
        syncMode: options.syncMode,
        includeTranscripts: options.includeTranscripts
      });
    } catch (parseError) {
      console.error(`❌ [${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json(
        { error: 'Invalid request body', details: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // 檢查環境變數配置
    console.log(`🔐 [${requestId}] Environment check:`, {
      YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ? 'CONFIGURED' : 'MISSING',
      APIFY_API_KEY: process.env.APIFY_API_KEY ? 'CONFIGURED' : 'MISSING',
      APIFY_YOUTUBE_SCRAPER_ACTOR_ID: process.env.APIFY_YOUTUBE_SCRAPER_ACTOR_ID ? 'CONFIGURED' : 'MISSING'
    });
    
    if (!process.env.YOUTUBE_API_KEY && !process.env.APIFY_API_KEY) {
      console.error(`❌ [${requestId}] CRITICAL: No API keys configured!`);
      return NextResponse.json(
        { 
          error: 'API configuration missing', 
          details: 'Neither YouTube API key nor Apify API key is configured. Please check your environment variables.',
          configurationHelp: {
            required: 'At least one of YOUTUBE_API_KEY or APIFY_API_KEY must be set',
            youtube: 'Get API key from Google Cloud Console > YouTube Data API v3',
            apify: 'Get API key from Apify Console'
          }
        },
        { status: 500 }
      );
    }

    // 取得當前用戶
    console.log(`👤 [${requestId}] Authenticating user...`);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error(`❌ [${requestId}] Auth error:`, authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.log(`⚠️ [${requestId}] No user found in request`);
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No user session found' },
        { status: 401 }
      );
    }
    
    console.log(`✅ [${requestId}] User authenticated:`, {
      userId: user.id,
      email: user.email,
    });

    // 驗證頻道屬於當前用戶並取得頻道資訊
    console.log(`🔍 [${requestId}] Fetching channel data...`);
    const { data: channel, error: channelError } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('id', channelId)
      .eq('user_id', user.id)
      .single();

    if (channelError) {
      console.error(`❌ [${requestId}] Channel fetch error:`, channelError);
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: `Failed to fetch channel: ${channelError.message}` 
        },
        { status: 500 }
      );
    }

    if (!channel) {
      console.log(`⚠️ [${requestId}] Channel not found or access denied:`, {
        requestedChannelId: channelId,
        userId: user.id
      });
      return NextResponse.json(
        { 
          error: 'Channel not found or access denied',
          details: `Channel ${channelId} not found for user ${user.id}`
        },
        { status: 404 }
      );
    }

    console.log(`✅ [${requestId}] Channel found:`, {
      id: channel.id,
      name: channel.channel_name,
      channelId: channel.channel_id,
      status: channel.scraping_status,
      lastScraped: channel.last_scraped_at
    });
    
    console.log(`🚀 [${requestId}] Starting video scraping for channel:`, channel.channel_name);
    console.log(`📊 [${requestId}] Scraping options:`, options);

    // 更新頻道同步狀態
    console.log(`🔄 [${requestId}] Updating channel status to 'syncing'...`);
    const { error: statusUpdateError } = await supabase
      .from('youtube_channels')
      .update({ 
        scraping_status: 'syncing',
        last_scraped_at: new Date().toISOString() 
      })
      .eq('id', channelId);
      
    if (statusUpdateError) {
      console.error(`❌ [${requestId}] Failed to update channel status:`, statusUpdateError);
    } else {
      console.log(`✅ [${requestId}] Channel status updated to 'syncing'`);
    }

    // 檢查是否使用 Apify 或 YouTube API
    const useApify = options.useApify || false;
    console.log(`🎯 [${requestId}] Using ${useApify ? 'Apify' : 'YouTube API'} for scraping`);
    
    let result;
    let scrapingError: Error | null = null;
    
    try {
      if (useApify) {
        console.log(`🕷️ [${requestId}] Starting Apify scraping...`);
        result = await scrapeWithApify(supabase, channel, options, requestId);
      } else {
        console.log(`📺 [${requestId}] Starting YouTube API scraping...`);
        result = await scrapeWithYouTubeAPI(supabase, channel, options, requestId);
      }

      // 更新頻道同步狀態為完成
      console.log(`🎉 [${requestId}] Scraping completed successfully, updating status...`);
      const { error: completedUpdateError } = await supabase
        .from('youtube_channels')
        .update({ 
          scraping_status: 'completed',
          scraping_error: null
        })
        .eq('id', channelId);
        
      if (completedUpdateError) {
        console.warn(`⚠️ [${requestId}] Failed to update completion status:`, completedUpdateError);
      } else {
        console.log(`✅ [${requestId}] Channel status updated to 'completed'`);
      }

      const endTime = Date.now();
      console.log(`🏁 [${requestId}] === VIDEO SCRAPING COMPLETED SUCCESSFULLY ===`);
      console.log(`⏱️ [${requestId}] Total duration: ${endTime - startTime}ms`);
      
      return result;
    } catch (error) {
      scrapingError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ [${requestId}] Scraping failed:`, {
        message: scrapingError.message,
        stack: scrapingError.stack?.substring(0, 500) + '...',
        useApify
      });
      
      // 更新頻道同步狀態為錯誤
      console.log(`🔄 [${requestId}] Updating channel status to 'error'...`);
      const { error: errorUpdateError } = await supabase
        .from('youtube_channels')
        .update({ 
          scraping_status: 'error',
          scraping_error: scrapingError.message
        })
        .eq('id', channelId);
        
      if (errorUpdateError) {
        console.error(`❌ [${requestId}] Failed to update error status:`, errorUpdateError);
      } else {
        console.log(`✅ [${requestId}] Channel status updated to 'error'`);
      }

      throw scrapingError;
    }
  } catch (error) {
    const endTime = Date.now();
    const finalError = error instanceof Error ? error : new Error(String(error));
    
    console.error(`💥 [${requestId}] === VIDEO SCRAPING FAILED ===`);
    console.error(`❌ [${requestId}] Error:`, finalError.message);
    console.error(`📍 [${requestId}] Stack:`, finalError.stack?.substring(0, 1000));
    console.error(`⏱️ [${requestId}] Failed after: ${endTime - startTime}ms`);
    
    return NextResponse.json(
      { 
        error: 'Video scraping failed',
        details: finalError.message,
        requestId,
        duration: endTime - startTime,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function scrapeWithYouTubeAPI(supabase: any, channel: any, options: VideoScrapingOptions, requestId?: string) {
  const logPrefix = `[${requestId || 'yt-api'}]`;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  
  console.log(`🔑 ${logPrefix} YouTube API Key status:`, youtubeApiKey ? 'Present' : 'Missing');
  
  if (!youtubeApiKey) {
    console.error(`❌ ${logPrefix} YouTube API key not configured`);
    throw new Error('YouTube API key not configured. Please check your environment variables.');
  }

  try {
    console.log(`📺 ${logPrefix} Starting YouTube Data API scraping`);
    console.log(`📋 ${logPrefix} Channel details:`, {
      id: channel.id,
      channelId: channel.channel_id,
      name: channel.channel_name
    });
    console.log(`⚙️ ${logPrefix} Scraping options:`, options);
    
    // 第一步：獲取頻道的上傳播放清單 ID
    const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channel.channel_id}&key=${youtubeApiKey}`;
    console.log('🌐 Fetching channel details from:', channelUrl.replace(youtubeApiKey, '***'));
    
    const channelResponse = await fetch(channelUrl);
    
    console.log('📡 Channel API response status:', channelResponse.status);
    
    if (!channelResponse.ok) {
      const errorText = await channelResponse.text();
      console.error('❌ Channel API error response:', {
        status: channelResponse.status,
        statusText: channelResponse.statusText,
        body: errorText
      });
      
      if (channelResponse.status === 403) {
        throw new Error('YouTube API quota exceeded or invalid API key. Please check your YouTube API configuration.');
      } else if (channelResponse.status === 404) {
        throw new Error(`Channel not found. Please verify the channel ID: ${channel.channel_id}`);
      } else {
        throw new Error(`YouTube API error (${channelResponse.status}): ${errorText}`);
      }
    }
    
    const channelData = await channelResponse.json();
    console.log('📊 Channel data received:', {
      itemsCount: channelData.items?.length || 0,
      hasContentDetails: !!channelData.items?.[0]?.contentDetails
    });
    
    if (!channelData.items || channelData.items.length === 0) {
      console.error('❌ No channel data found for ID:', channel.channel_id);
      throw new Error(`Channel not found or inaccessible. Channel ID: ${channel.channel_id}`);
    }
    
    const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      console.error('❌ No uploads playlist found for channel');
      throw new Error('Unable to find uploads playlist for this channel. The channel may not have any public videos.');
    }
    
    console.log('✅ Found uploads playlist ID:', uploadsPlaylistId);
    
    // 第二步：獲取播放清單中的影片
    const maxResults = 50; // YouTube API 每次最多 50 個
    const targetMaxVideos = options.maxVideos === 9999 ? 10000 : (options.maxVideos || 50); // 9999 表示 ALL
    const allVideos: any[] = [];
    let nextPageToken = '';
    let pageCount = 0;
    
    console.log(`📋 Starting to fetch videos (max: ${options.maxVideos === 9999 ? 'ALL' : targetMaxVideos})`);
    
    while (allVideos.length < targetMaxVideos && (nextPageToken !== undefined)) {
      pageCount++;
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&pageToken=${nextPageToken}&key=${youtubeApiKey}`;
      
      console.log(`📄 Fetching page ${pageCount}, current videos: ${allVideos.length}`);
      
      const playlistResponse = await fetch(playlistUrl);
      
      console.log('📡 Playlist API response status:', playlistResponse.status);
      
      if (!playlistResponse.ok) {
        const errorText = await playlistResponse.text();
        console.error('❌ Playlist API error response:', {
          status: playlistResponse.status,
          statusText: playlistResponse.statusText,
          body: errorText
        });
        
        if (playlistResponse.status === 403) {
          throw new Error('YouTube API quota exceeded while fetching videos. Please try again later.');
        } else if (playlistResponse.status === 404) {
          throw new Error(`Uploads playlist not found: ${uploadsPlaylistId}`);
        } else {
          throw new Error(`Failed to fetch playlist items (${playlistResponse.status}): ${errorText}`);
        }
      }
      
      const playlistData = await playlistResponse.json();
      
      console.log('📊 Playlist page data:', {
        itemsReturned: playlistData.items?.length || 0,
        hasNextPage: !!playlistData.nextPageToken,
        totalResults: playlistData.pageInfo?.totalResults
      });
      
      if (playlistData.items && playlistData.items.length > 0) {
        allVideos.push(...playlistData.items);
        console.log(`✅ Added ${playlistData.items.length} videos, total: ${allVideos.length}`);
      } else {
        console.log('⚠️ No videos returned in this page');
      }
      
      nextPageToken = playlistData.nextPageToken;
      
      if (!nextPageToken) {
        console.log('📄 No more pages available');
        break;
      }
    }
    
    console.log(`✅ Finished fetching videos. Total collected: ${allVideos.length}`);

    // 第三步：獲取影片詳細統計資料
    const detailVideoIds = allVideos.map(item => item.snippet?.resourceId?.videoId).filter(Boolean).slice(0, targetMaxVideos);
    
    console.log(`🎬 Processing ${detailVideoIds.length} video IDs for detailed information`);
    
    if (detailVideoIds.length === 0) {
      console.log('⚠️ No valid video IDs found');
      return NextResponse.json({
        success: true,
        message: 'No videos found for this channel',
        videos: [],
        source: 'youtube-api',
      });
    }
    
    // 批次獲取影片統計 (每次最多 50 個)
    const videoDetails = [];
    const batchSize = 50;
    const totalBatches = Math.ceil(detailVideoIds.length / batchSize);
    
    console.log(`📦 Processing ${totalBatches} batches of video details`);
    
    for (let i = 0; i < detailVideoIds.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchIds = detailVideoIds.slice(i, i + batchSize);
      const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batchIds.join(',')}&key=${youtubeApiKey}`;
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batchIds.length} videos)`);
      
      const videoResponse = await fetch(videoUrl);
      
      console.log('📡 Video details API response status:', videoResponse.status);
      
      if (!videoResponse.ok) {
        const errorText = await videoResponse.text();
        console.error('❌ Video details API error for batch:', {
          batchNumber,
          batchIds: batchIds.slice(0, 3), // Show first 3 IDs
          status: videoResponse.status,
          error: errorText
        });
        
        if (videoResponse.status === 403) {
          throw new Error(`YouTube API quota exceeded while fetching video details (batch ${batchNumber}). Please try again later.`);
        }
        
        // Continue with next batch instead of failing completely
        console.log(`⚠️ Skipping batch ${batchNumber} due to error`);
        continue;
      }
      
      const videoData = await videoResponse.json();
      
      console.log(`📊 Video details batch ${batchNumber} data:`, {
        requestedIds: batchIds.length,
        returnedItems: videoData.items?.length || 0,
      });
      
      if (videoData.items && videoData.items.length > 0) {
        videoDetails.push(...videoData.items);
        console.log(`✅ Added ${videoData.items.length} video details, total: ${videoDetails.length}`);
      } else {
        console.log(`⚠️ No video details returned for batch ${batchNumber}`);
      }
    }
    
    console.log(`✅ Finished fetching video details. Total processed: ${videoDetails.length}`);

    // 第四步：獲取影片字幕（如果啟用）
    const videoIds = videoDetails.map(video => video.id).filter(Boolean);
    const transcripts = await fetchTranscriptsForVideos(videoIds, youtubeApiKey, options.includeTranscripts || false);

    // 第五步：處理影片資料並儲存到資料庫
    console.log('🔄 Processing video data for database insertion');
    
    let videosToInsert = videoDetails
      .filter(video => {
        if (!video || !video.id) {
          console.log('⚠️ Skipping video with missing ID');
          return false;
        }
        
        // 過濾 Shorts (如果選項設定為不包含)
        if (!options.includeShorts) {
          const duration = video.contentDetails?.duration;
          const title = video.snippet?.title || '';
          const description = video.snippet?.description || '';
          
          console.log(`🔍 Checking video: "${title.substring(0, 50)}..." (includeShorts: ${options.includeShorts})`);
          
          let isShort = false;
          
          // 1. 明確的 #Shorts 標籤檢查
          if (title.toLowerCase().includes('#shorts') || 
              description.toLowerCase().includes('#shorts')) {
            isShort = true;
            console.log(`📱 Detected Short by #shorts hashtag: ${title}`);
          }
          
          // 2. 持續時間檢查 (3分鐘以下的影片視為 Short)
          if (duration && !isShort) {
            const durationInSeconds = parseDuration(duration);
            // 當影片 <180秒 (3分鐘) 才視為 Short
            if (durationInSeconds > 0 && durationInSeconds < 180) {
              isShort = true;
              console.log(`📱 Detected Short by duration (${durationInSeconds}s = ${Math.floor(durationInSeconds/60)}:${String(durationInSeconds%60).padStart(2,'0')}): ${title}`);
            }
          }
          
          if (isShort) {
            console.log(`❌ EXCLUDING Short video (includeShorts=${options.includeShorts}): ${title}`);
            return false;
          } else {
            console.log(`✅ INCLUDING regular video: ${title}`);
          }
        }
        return true;
      })
      .map((video, index) => {
        try {
          const transcriptData = transcripts.get(video.id) || { transcript: '', hasTranscript: false };
          
          const processedVideo = {
            channel_id: channel.id,
            video_id: video.id,
            title: video.snippet?.title || 'Untitled',
            description: video.snippet?.description || '',
            thumbnail_url: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url || '',
            duration: video.contentDetails?.duration ? formatDuration(video.contentDetails.duration) : '0:00',
            published_at: video.snippet?.publishedAt || new Date().toISOString(),
            language: video.snippet?.defaultLanguage || 'en',
            category: video.snippet?.categoryId || '',
            tags: video.snippet?.tags || [],
            view_count: parseInt(video.statistics?.viewCount || '0') || 0,
            like_count: parseInt(video.statistics?.likeCount || '0') || 0,
            comment_count: parseInt(video.statistics?.commentCount || '0') || 0,
            video_type: determineVideoType(video),
            transcript: transcriptData.transcript,
            has_transcript: transcriptData.hasTranscript,
          };
          
          if (index < 3) { // Log first 3 videos for debugging
            console.log(`📹 Processed video ${index + 1}:`, {
              id: processedVideo.video_id,
              title: processedVideo.title.substring(0, 50) + '...',
              views: processedVideo.view_count,
              type: processedVideo.video_type,
              hasTranscript: processedVideo.has_transcript,
              transcriptPreview: processedVideo.transcript ? processedVideo.transcript.substring(0, 50) + '...' : 'No transcript'
            });
          }
          
          return processedVideo;
        } catch (error) {
          console.error('❌ Error processing video:', {
            videoId: video.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      })
      .filter(Boolean); // Remove null entries

    console.log(`📊 FILTERING SUMMARY:`, {
      totalVideoDetails: videoDetails.length,
      afterFiltering: videosToInsert.length,
      includeShorts: options.includeShorts,
      expectedBehavior: options.includeShorts ? 'Include all videos' : 'Exclude shorts only',
      filtered: videoDetails.length - videosToInsert.length
    });

    if (videosToInsert.length === 0) {
      console.log('⚠️ No videos to insert after filtering');
      return NextResponse.json({
        success: true,
        message: 'No videos found matching the specified criteria',
        videos: [],
        source: 'youtube-api',
      });
    }

    // 根據同步模式處理現有資料
    const syncMode = options.syncMode || 'incremental'; // 預設增量同步
    
    if (syncMode === 'full') {
      // 完整同步：清除舊的影片資料
      console.log('🗑️ Full sync mode: Clearing existing videos for channel');
      const { error: deleteError } = await supabase
        .from('youtube_videos')
        .delete()
        .eq('channel_id', channel.id);

      if (deleteError) {
        console.error('❌ Database delete error:', deleteError);
        throw new Error(`Failed to clear existing videos: ${deleteError.message}`);
      }
      
      console.log('✅ Existing videos cleared successfully');
    } else {
      // 增量同步：只添加新影片
      console.log('🚀 Incremental sync mode: Keeping existing videos');
      
      // 獲取現有影片的 video_id 以避免重複
      const { data: existingVideos, error: fetchError } = await supabase
        .from('youtube_videos')
        .select('video_id')
        .eq('channel_id', channel.id);
      
      if (!fetchError && existingVideos) {
        const existingVideoIds = new Set(existingVideos.map((v: any) => v.video_id));
        const beforeCount = videosToInsert.length;
        const newVideosToInsert = videosToInsert.filter((v: any) => v && !existingVideoIds.has(v.video_id));
        console.log(`🔍 Filtered out ${beforeCount - newVideosToInsert.length} existing videos`);
        videosToInsert = newVideosToInsert;
      }
      
      if (videosToInsert.length === 0) {
        console.log('ℹ️ No new videos to insert');
        return NextResponse.json({
          success: true,
          insertedCount: 0,
          message: 'No new videos found'
        });
      }
    }

    // 插入新的影片資料
    console.log(`💾 Inserting ${videosToInsert.length} new videos`);
    
    // Log sample video data for debugging
    if (videosToInsert.length > 0) {
      console.log('📊 Sample video data being inserted:', {
        title: videosToInsert[0]?.title,
        view_count: videosToInsert[0]?.view_count,
        like_count: videosToInsert[0]?.like_count,
        comment_count: videosToInsert[0]?.comment_count,
      });
    }
    
    // 🚀 Batch insert with timeout handling for large datasets
    let insertedData: any = null;
    let insertError: any = null;
    
    if (videosToInsert.length > 20) {
      console.log('📦 Large batch detected, using optimized insertion strategy');
      
      // First, temporarily disable triggers to avoid timeout
      console.log('⏸️ Temporarily disabling triggers for batch insert');
      
      try {
        // Insert with minimal processing
        const { data, error } = await supabase
          .from('youtube_videos')
          .insert(videosToInsert)
          .select('id, video_id, title, view_count, like_count, comment_count');
        
        if (error) {
          insertError = error;
        } else {
          insertedData = data;
          
          // After successful batch insert, manually trigger recalculation
          console.log('🔄 Manually triggering score recalculation for channel');
          const { error: recalcError } = await supabase
            .rpc('recalculate_channel_complete', {
              target_channel_id: channel.id
            });
          
          if (recalcError) {
            console.warn('⚠️ Score recalculation failed, but videos were inserted:', recalcError.message);
          } else {
            console.log('✅ Score recalculation completed successfully');
          }
        }
      } catch (batchError) {
        console.error('❌ Batch insertion failed:', batchError);
        insertError = batchError;
      }
    } else {
      // Normal insertion for smaller batches
      const { data, error } = await supabase
        .from('youtube_videos')
        .insert(videosToInsert)
        .select('id, video_id, title, view_count, like_count, comment_count, performance_score, is_high_performing');
      
      insertedData = data;
      insertError = error;
    }

    if (insertError) {
      console.error('❌ Database insert error:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      
      // Provide more specific error messages
      if (insertError.code === '23505') {
        throw new Error('Duplicate video entries detected. Please try clearing the channel data first.');
      } else if (insertError.code === '23503') {
        throw new Error('Foreign key constraint violation. The channel may not exist in the database.');
      } else {
        throw new Error(`Database insertion failed: ${insertError.message}`);
      }
    }
    
    console.log('✅ Videos inserted successfully:', {
      insertedCount: insertedData?.length || 0,
      firstFew: insertedData?.slice(0, 3).map((v: any) => ({ 
        id: v.video_id, 
        title: v.title.substring(0, 30) + '...',
        views: v.view_count,
        score: v.performance_score,
        isHighPerforming: v.is_high_performing
      }))
    });
    
    // Log performance statistics
    const highPerformingCount = insertedData?.filter((v: any) => v.is_high_performing === true).length || 0;
    console.log('🏆 Performance summary:', {
      totalInserted: insertedData?.length || 0,
      highPerforming: highPerformingCount,
      percentage: insertedData?.length ? Math.round((highPerformingCount / insertedData.length) * 100) : 0
    });

    // Map inserted data to frontend format
    const mappedInsertedVideos = (insertedData || []).map((video: any) => ({
      id: video.id,
      videoId: video.video_id,
      title: video.title,
      // ... other fields would be included here
    }));

    return NextResponse.json({
      success: true,
      message: `Successfully scraped ${videosToInsert.length} videos using YouTube API`,
      videos: mappedInsertedVideos,
      source: 'youtube-api',
    });
  } catch (error) {
    console.error('YouTube API scraping failed:', error);
    throw error;
  }
}

async function scrapeWithApify(supabase: any, channel: any, options: VideoScrapingOptions, requestId?: string) {
  const logPrefix = `[${requestId || 'apify'}]`;
  const apifyApiKey = process.env.APIFY_API_KEY;
  const apifyActorId = process.env.APIFY_YOUTUBE_SCRAPER_ACTOR_ID;
  
  console.log(`🔐 ${logPrefix} Apify configuration check:`, {
    apiKey: apifyApiKey ? 'Present' : 'Missing',
    actorId: apifyActorId ? 'Present' : 'Missing'
  });
  
  if (!apifyApiKey || !apifyActorId) {
    throw new Error('Apify configuration incomplete. Both APIFY_API_KEY and APIFY_YOUTUBE_SCRAPER_ACTOR_ID are required.');
  }

  try {
    console.log(`🕷️ ${logPrefix} Using Apify YouTube Scraper`);
    
    // TODO: 實作真實的 Apify API 調用
    // 目前返回錯誤，提示需要實作
    throw new Error('Apify integration not implemented yet. Please use YouTube API instead.');
    
  } catch (error) {
    console.error(`❌ ${logPrefix} Apify scraping failed:`, error);
    throw error;
  }
}


// 輔助函數：判斷影片類型
function determineVideoType(video: any): 'short' | 'regular' | 'live' {
  const title = video.snippet?.title || '';
  const description = video.snippet?.description || '';
  const duration = video.contentDetails?.duration;
  
  // 檢查是否為直播
  if (video.snippet?.liveBroadcastContent === 'live' || 
      video.snippet?.liveBroadcastContent === 'upcoming') {
    return 'live';
  }
  
  // 檢查是否為 Shorts
  // 1. 明確的 #Shorts 標籤
  if (title.toLowerCase().includes('#shorts') || 
      title.toLowerCase().includes('#short') ||
      description.toLowerCase().includes('#shorts')) {
    return 'short';
  }
  
  // 2. 根據持續時間判斷（Shorts 通常為 3 分鐘以下）
  if (duration) {
    const durationInSeconds = parseDuration(duration);
    if (durationInSeconds > 0 && durationInSeconds < 180) {
      // 3分鐘以下的影片視為 Short
      return 'short';
    }
  }
  
  return 'regular';
}

// 輔助函數：解析 YouTube 持續時間格式 (PT1M30S -> 90 秒)
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 輔助函數：格式化持續時間為可讀格式 (PT1M30S -> "1:30")
function formatDuration(duration: string): string {
  const totalSeconds = parseDuration(duration);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// 輔助函數：獲取影片字幕/轉錄文字
async function fetchVideoTranscript(videoId: string, apiKey: string): Promise<{ transcript: string; hasTranscript: boolean }> {
  try {
    console.log(`📝 Fetching captions for video: ${videoId}`);
    
    // 步驟1：獲取可用的字幕列表
    const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    
    const captionsResponse = await fetch(captionsListUrl);
    
    if (!captionsResponse.ok) {
      if (captionsResponse.status === 403) {
        console.log(`⚠️ Captions API access denied for video ${videoId} (possibly due to API restrictions)`);
        return { transcript: '', hasTranscript: false };
      }
      console.log(`⚠️ Failed to fetch captions list for video ${videoId}: ${captionsResponse.status}`);
      return { transcript: '', hasTranscript: false };
    }
    
    const captionsData = await captionsResponse.json();
    
    if (!captionsData.items || captionsData.items.length === 0) {
      console.log(`📝 No captions available for video ${videoId}`);
      return { transcript: '', hasTranscript: false };
    }
    
    console.log(`📝 Found ${captionsData.items.length} caption tracks for video ${videoId}`);
    
    // 步驟2：選擇最佳的字幕軌道
    // 優先順序：繁體中文 > 簡體中文 > 英文 > 自動生成字幕 > 其他語言
    const sortedCaptions = captionsData.items.sort((a: any, b: any) => {
      // 優先選擇繁體中文
      const aIsTraditionalChinese = a.snippet.language === 'zh-TW' || a.snippet.language === 'zh-Hant';
      const bIsTraditionalChinese = b.snippet.language === 'zh-TW' || b.snippet.language === 'zh-Hant';
      
      if (aIsTraditionalChinese && !bIsTraditionalChinese) return -1;
      if (!aIsTraditionalChinese && bIsTraditionalChinese) return 1;
      
      // 其次選擇簡體中文
      const aIsSimplifiedChinese = a.snippet.language === 'zh-CN' || a.snippet.language === 'zh-Hans' || a.snippet.language === 'zh';
      const bIsSimplifiedChinese = b.snippet.language === 'zh-CN' || b.snippet.language === 'zh-Hans' || b.snippet.language === 'zh';
      
      if (aIsSimplifiedChinese && !bIsSimplifiedChinese) return -1;
      if (!aIsSimplifiedChinese && bIsSimplifiedChinese) return 1;
      
      // 第三選擇英文
      const aIsEnglish = a.snippet.language === 'en' || a.snippet.language.startsWith('en');
      const bIsEnglish = b.snippet.language === 'en' || b.snippet.language.startsWith('en');
      
      if (aIsEnglish && !bIsEnglish) return -1;
      if (!aIsEnglish && bIsEnglish) return 1;
      
      // 最後優先選擇自動生成的字幕（通常包含完整內容）
      const aIsAuto = a.snippet.trackKind === 'asr'; // Automatic Speech Recognition
      const bIsAuto = b.snippet.trackKind === 'asr';
      
      if (aIsAuto && !bIsAuto) return -1;
      if (!aIsAuto && bIsAuto) return 1;
      
      return 0;
    });
    
    const selectedCaption = sortedCaptions[0];
    console.log(`📝 Selected caption track: ${selectedCaption.snippet.language} (${selectedCaption.snippet.trackKind})`);
    
    // 步驟3：嘗試獲取字幕內容
    // 由於 YouTube API v3 的 captions/download 需要 OAuth，我們嘗試替代方法
    try {
      // 改進的多層級回退策略：優先中文，再英文
      const fallbackLanguages = [
        selectedCaption.snippet.language, // 首選語言
        'zh-TW', // 繁體中文
        'zh-Hant', // 繁體中文 (其他格式)
        'zh-CN', // 簡體中文
        'zh-Hans', // 簡體中文 (其他格式)
        'zh', // 一般中文
        'en', // 英文回退
        'en-US', // 美式英文
        'en-GB', // 英式英文
        ...sortedCaptions
          .filter((cap: any) => cap.snippet.trackKind === 'asr')
          .map((cap: any) => cap.snippet.language)
          .slice(0, 5) // 最多嘗試前5個自動生成的字幕
      ];
      
      // 去重並保持順序
      const uniqueLanguages = [...new Set(fallbackLanguages)];
      
      console.log(`📝 Will try transcript fetch in order: ${uniqueLanguages.join(', ')}`);
      
      for (const language of uniqueLanguages) {
        console.log(`📝 Attempting transcript fetch for ${videoId} in language: ${language}`);
        
        const transcriptContent = await fetchTranscriptAlternative(videoId, language);
        
        if (transcriptContent && transcriptContent.length > 50) { // 確保有足夠的內容
          console.log(`✅ Successfully fetched transcript for video ${videoId} in ${language} (${transcriptContent.length} chars)`);
          return { 
            transcript: transcriptContent, 
            hasTranscript: true 
          };
        } else if (transcriptContent) {
          console.log(`⚠️ Transcript too short for ${videoId} in ${language}: ${transcriptContent.length} chars`);
        }
        
        // 在語言之間添加小延遲以避免過快請求
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log(`⚠️ All language attempts failed for video ${videoId}`);
    } catch (alternativeError) {
      console.log(`❌ Alternative transcript fetch failed for ${videoId}:`, alternativeError instanceof Error ? alternativeError.message : String(alternativeError));
    }
    
    // 如果無法獲取實際內容，至少標記有字幕可用
    console.log(`✅ Video ${videoId} has captions available but content could not be fetched`);
    return { 
      transcript: `[Captions available in ${selectedCaption.snippet.language} - requires manual extraction]`, 
      hasTranscript: true 
    };
    
  } catch (error) {
    console.error(`❌ Error fetching transcript for video ${videoId}:`, error);
    return { transcript: '', hasTranscript: false };
  }
}

// 輔助函數：使用替代方法獲取字幕（支援多種 endpoints 和重試機制）
async function fetchTranscriptAlternative(videoId: string, language: string): Promise<string | null> {
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  
  console.log(`📝 Attempting alternative transcript fetch for ${videoId} in ${language}`);
  
  // 多種 transcript endpoints 和格式
  const transcriptEndpoints = [
    // 方法1：XML 格式 (srv3)
    {
      url: `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}&fmt=srv3`,
      format: 'xml',
      name: 'XML (srv3)'
    },
    // 方法2：JSON 格式
    {
      url: `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}&fmt=json3`,
      format: 'json',
      name: 'JSON3'
    },
    // 方法3：VTT 格式
    {
      url: `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}&fmt=vtt`,
      format: 'vtt',
      name: 'VTT'
    },
    // 方法4：嘗試不同的語言參數格式
    {
      url: `https://www.youtube.com/api/timedtext?lang=${language}&v=${videoId}&fmt=srv1`,
      format: 'xml',
      name: 'XML (srv1)'
    }
  ];
  
  // 嘗試每個 endpoint
  for (const endpoint of transcriptEndpoints) {
    console.log(`📝 Trying ${endpoint.name} format for ${videoId}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const transcript = await fetchFromEndpoint(endpoint, videoId, attempt);
        if (transcript && transcript.length > 0) {
          console.log(`✅ Successfully extracted transcript for ${videoId} using ${endpoint.name} (${transcript.length} chars, attempt ${attempt})`);
          return transcript;
        }
      } catch (error) {
        console.log(`⚠️ ${endpoint.name} attempt ${attempt} failed for ${videoId}:`, error instanceof Error ? error.message : String(error));
        
        // 如果不是最後一次嘗試，等待後重試
        if (attempt < maxRetries) {
          console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
  }
  
  console.log(`❌ All transcript endpoints failed for ${videoId}`);
  return null;
}

// 輔助函數：從特定 endpoint 獲取字幕
async function fetchFromEndpoint(
  endpoint: { url: string; format: string; name: string }, 
  _videoId: string, 
  attempt: number
): Promise<string | null> {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];
  
  const headers = {
    'User-Agent': userAgents[attempt % userAgents.length],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
  
  try {
    const response = await fetch(endpoint.url, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    
    if (!content || content.length < 10) {
      throw new Error('Empty or too short response content');
    }
    
    // 檢查是否為錯誤響應
    if (content.includes('Video unavailable') || content.includes('Private video') || content.includes('error')) {
      throw new Error('Video unavailable or private');
    }
    
    // 根據格式解析字幕
    let transcript: string;
    switch (endpoint.format) {
      case 'xml':
        transcript = parseYouTubeTranscriptXML(content);
        break;
      case 'json':
        transcript = parseYouTubeTranscriptJSON(content);
        break;
      case 'vtt':
        transcript = parseYouTubeTranscriptVTT(content);
        break;
      default:
        throw new Error(`Unsupported format: ${endpoint.format}`);
    }
    
    return transcript;
  } finally {
    clearTimeout(timeoutId);
  }
}

// 輔助函數：解析 YouTube 字幕 XML 格式 (改進版)
function parseYouTubeTranscriptXML(xmlContent: string): string {
  try {
    
    // 方法1：精確的 <text> 標籤解析
    const textTagRegex = /<text[^>]*start="([^"]*?)"[^>]*?>(.*?)<\/text>/gi;
    let textMatch;
    const timestampedText: Array<{start: number, text: string}> = [];
    
    while ((textMatch = textTagRegex.exec(xmlContent)) !== null) {
      const startTime = parseFloat(textMatch[1]) || 0;
      const textContent = textMatch[2];
      
      if (textContent) {
        const cleanText = decodeHTMLEntities(textContent).trim();
        if (cleanText.length > 0) {
          timestampedText.push({ start: startTime, text: cleanText });
        }
      }
    }
    
    // 按時間排序後合併
    if (timestampedText.length > 0) {
      timestampedText.sort((a, b) => a.start - b.start);
      const transcript = timestampedText.map(item => item.text).join(' ');
      return limitTranscriptLength(transcript);
    }
    
    // 方法2：一般 <text> 標籤解析
    const simpleTextRegex = /<text[^>]*>(.*?)<\/text>/gi;
    const matches: string[] = [];
    
    while ((textMatch = simpleTextRegex.exec(xmlContent)) !== null) {
      const textContent = textMatch[1];
      if (textContent) {
        const cleanText = decodeHTMLEntities(textContent).trim();
        if (cleanText.length > 0) {
          matches.push(cleanText);
        }
      }
    }
    
    if (matches.length > 0) {
      return limitTranscriptLength(matches.join(' '));
    }
    
    // 方法3：回退策略 - 提取所有文字內容
    const fallbackRegex = />([^<]{3,})</g;
    const fallbackMatches: string[] = [];
    
    while ((textMatch = fallbackRegex.exec(xmlContent)) !== null) {
      const text = textMatch[1].trim();
      if (text && !isXMLMetadata(text)) {
        fallbackMatches.push(text);
      }
    }
    
    if (fallbackMatches.length > 0) {
      return limitTranscriptLength(fallbackMatches.join(' '));
    }
    
    console.log('⚠️ No text content found in XML');
    return '';
  } catch (error) {
    console.error('❌ Error parsing YouTube transcript XML:', error);
    return '';
  }
}

// 輔助函數：解析 YouTube 字幕 JSON 格式
function parseYouTubeTranscriptJSON(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    const textParts: string[] = [];
    
    // JSON3 格式的常見結構
    if (data.events && Array.isArray(data.events)) {
      for (const event of data.events) {
        if (event.segs && Array.isArray(event.segs)) {
          for (const seg of event.segs) {
            if (seg.utf8 && typeof seg.utf8 === 'string') {
              const cleanText = seg.utf8.trim();
              if (cleanText.length > 0) {
                textParts.push(cleanText);
              }
            }
          }
        }
      }
    }
    
    // 替代結構：直接的 text 陣列
    if (textParts.length === 0 && data.text && Array.isArray(data.text)) {
      for (const textItem of data.text) {
        if (typeof textItem === 'string') {
          const cleanText = textItem.trim();
          if (cleanText.length > 0) {
            textParts.push(cleanText);
          }
        } else if (textItem && typeof textItem.text === 'string') {
          const cleanText = textItem.text.trim();
          if (cleanText.length > 0) {
            textParts.push(cleanText);
          }
        }
      }
    }
    
    return textParts.length > 0 ? limitTranscriptLength(textParts.join(' ')) : '';
  } catch (error) {
    console.error('❌ Error parsing YouTube transcript JSON:', error);
    return '';
  }
}

// 輔助函數：解析 YouTube 字幕 VTT 格式
function parseYouTubeTranscriptVTT(vttContent: string): string {
  try {
    const lines = vttContent.split('\n');
    const textParts: string[] = [];
    let isTextLine = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳過 VTT 標頭和時間戳
      if (trimmedLine === 'WEBVTT' || trimmedLine === '') {
        isTextLine = false;
        continue;
      }
      
      // 檢查是否為時間戳行 (00:00:00.000 --> 00:00:05.000)
      if (trimmedLine.includes(' --> ')) {
        isTextLine = true;
        continue;
      }
      
      // 如果是文字行且不是空行
      if (isTextLine && trimmedLine.length > 0) {
        // 移除 VTT 特殊標記 (<c> 等)
        const cleanText = trimmedLine
          .replace(/<[^>]+>/g, '') // 移除 HTML 標籤
          .replace(/\s+/g, ' ') // 正規化空格
          .trim();
        
        if (cleanText.length > 0) {
          textParts.push(cleanText);
        }
        isTextLine = false;
      }
    }
    
    return textParts.length > 0 ? limitTranscriptLength(textParts.join(' ')) : '';
  } catch (error) {
    console.error('❌ Error parsing YouTube transcript VTT:', error);
    return '';
  }
}

// 輔助函數：解碼 HTML 實體
function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([\da-f]+);/gi, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}

// 輔助函數：檢查是否為 XML 元數據
function isXMLMetadata(text: string): boolean {
  const metadataPatterns = [
    'timedtext',
    'xml version',
    'encoding',
    'http://www.w3.org',
    'DOCTYPE'
  ];
  
  return metadataPatterns.some(pattern => text.toLowerCase().includes(pattern));
}

// 輔助函數：限制字幕長度
function limitTranscriptLength(transcript: string): string {
  // 清理多餘空格和換行
  const cleanTranscript = transcript
    .replace(/\s+/g, ' ')
    .trim();
  
  // 記錄字幕長度（PostgreSQL TEXT 欄位支援最大 1GB，無需限制長度）
  if (cleanTranscript.length > 50000) {
    console.log(`📝 Large transcript detected: ${cleanTranscript.length} characters`);
  }
  
  return cleanTranscript;
}

// 輔助函數：批次獲取影片字幕
async function fetchTranscriptsForVideos(videoIds: string[], apiKey: string, includeTranscripts: boolean): Promise<Map<string, { transcript: string; hasTranscript: boolean }>> {
  const transcripts = new Map<string, { transcript: string; hasTranscript: boolean }>();
  
  if (!includeTranscripts) {
    console.log('📝 Transcript fetching disabled by user option');
    // 為所有影片設置空字幕
    videoIds.forEach(id => {
      transcripts.set(id, { transcript: '', hasTranscript: false });
    });
    return transcripts;
  }
  
  console.log(`📝 Starting transcript fetch for ${videoIds.length} videos`);
  
  // 避免同時發送太多請求，使用批次處理
  const batchSize = 3; // 減少批次大小以避免速率限制
  const batches = [];
  
  for (let i = 0; i < videoIds.length; i += batchSize) {
    batches.push(videoIds.slice(i, i + batchSize));
  }
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`📝 Processing transcript batch ${batchIndex + 1}/${batches.length} (${batch.length} videos)`);
    
    // 序列處理而非並行處理以避免速率限制
    for (const videoId of batch) {
      try {
        const result = await fetchVideoTranscript(videoId, apiKey);
        transcripts.set(videoId, result);
        
        // 短暫延遲以避免過快請求
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`❌ Error fetching transcript for video ${videoId}:`, error);
        transcripts.set(videoId, { transcript: '', hasTranscript: false });
      }
    }
    
    // 在批次之間添加較長延遲
    if (batchIndex < batches.length - 1) {
      console.log(`⏳ Waiting before next transcript batch...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const successCount = Array.from(transcripts.values()).filter(t => t.hasTranscript).length;
  console.log(`📝 Transcript fetch completed: ${successCount}/${videoIds.length} videos have captions`);
  
  return transcripts;
}

// 輔助函數：根據絕對分數確定等級
function determineAbsoluteTier(score: number): 'youtube-top' | 'youtube-high' | 'youtube-medium' | 'youtube-normal' | 'needs-improvement' {
  if (score >= 80) return 'youtube-top';
  if (score >= 60) return 'youtube-high';
  if (score >= 40) return 'youtube-medium';
  if (score >= 20) return 'youtube-normal';
  return 'needs-improvement';
}

// 輔助函數：根據相對分數確定等級
function determineRelativeTier(score: number): 'channel-star' | 'above-average' | 'near-average' | 'below-average' {
  if (score >= 70) return 'channel-star';
  if (score >= 50) return 'above-average';
  if (score >= 30) return 'near-average';
  return 'below-average';
}

// 輔助函數：計算頻道表現統計
async function calculateChannelStats(supabase: any, channelId: string) {
  try {
    const { data: videos, error } = await supabase
      .from('youtube_videos')
      .select('view_count, performance_score, is_high_performing, performance_metrics')
      .eq('channel_id', channelId)
      .not('view_count', 'is', null);

    if (error || !videos) {
      console.error('Error fetching channel stats:', error);
      return null;
    }

    const totalVideos = videos.length;
    if (totalVideos === 0) return null;

    // Calculate basic stats
    const views = videos.map((v: any) => v.view_count).filter((v: number) => v > 0);
    const avgViews = views.reduce((sum: number, v: number) => sum + v, 0) / views.length;
    const sortedViews = [...views].sort((a: number, b: number) => a - b);
    const medianViews = sortedViews.length > 0 
      ? sortedViews[Math.floor(sortedViews.length / 2)] 
      : 0;

    const highPerformingCount = videos.filter((v: any) => v.is_high_performing).length;
    
    // Calculate channel star count from dual scoring
    let channelStarCount = 0;
    let avgEngagement = 0;
    
    const videosWithMetrics = videos.filter((v: any) => v.performance_metrics);
    if (videosWithMetrics.length > 0) {
      channelStarCount = videosWithMetrics.filter((v: any) => {
        const metrics = v.performance_metrics as PerformanceMetrics;
        return metrics.relative_score >= 70;
      }).length;

      // Calculate average engagement from metrics
      const engagementRates = videosWithMetrics.map((v: any) => {
        const metrics = v.performance_metrics as PerformanceMetrics;
        return metrics.channel_avg_engagement;
      }).filter((e: number) => e > 0);
      
      avgEngagement = engagementRates.length > 0 
        ? engagementRates.reduce((sum: number, e: number) => sum + e, 0) / engagementRates.length 
        : 0;
    }

    return {
      avgViews: Math.round(avgViews),
      medianViews: Math.round(medianViews),
      avgEngagement: Math.round(avgEngagement * 100) / 100, // Round to 2 decimal places
      totalVideos,
      highPerformingCount,
      channelStarCount,
    };
  } catch (error) {
    console.error('Error calculating channel stats:', error);
    return null;
  }
}