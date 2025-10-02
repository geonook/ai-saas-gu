import { NextRequest, NextResponse } from 'next/server';
import { YouTubeChannel, ChannelOptimizationForm } from '@/types/channel-optimization';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const isOwned = searchParams.get('isOwned');
    
    // 取得當前用戶
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 建立查詢
    let query = supabase
      .from('youtube_channels')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // 添加過濾條件
    if (isOwned !== null) {
      query = query.eq('is_owned', isOwned === 'true');
    }

    const { data: channels, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: 500 }
      );
    }

    // Map database fields to frontend types
    const mappedChannels = (channels || []).map(channel => ({
      id: channel.id,
      channelId: channel.channel_id,
      channelName: channel.channel_name,
      channelUrl: channel.channel_url,
      description: channel.description,
      subscriberCount: channel.subscriber_count,
      videoCount: channel.video_count,
      avatar: channel.avatar_url,
      banner: channel.banner_url,
      isOwned: channel.is_owned,
      createdAt: channel.created_at,
      updatedAt: channel.updated_at,
      lastScrapedAt: channel.last_scraped_at,
    }));

    return NextResponse.json({
      success: true,
      channels: mappedChannels,
    });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body: ChannelOptimizationForm = await request.json();
    const { channelUrl, isOwned, customName } = body;

    // 取得當前用戶
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }

    // 提取 YouTube 頻道 ID
    const channelId = extractChannelId(channelUrl);
    if (!channelId) {
      return NextResponse.json(
        { error: 'Invalid YouTube channel URL' },
        { status: 400 }
      );
    }

    // 檢查頻道是否已存在
    const { data: existingChannel } = await supabase
      .from('youtube_channels')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single();

    if (existingChannel) {
      return NextResponse.json(
        { error: 'Channel already exists' },
        { status: 409 }
      );
    }

    // 獲取頻道基本信息 (使用 YouTube API)
    const channelInfo = await fetchChannelInfoFromYouTube(channelId);
    if (!channelInfo) {
      return NextResponse.json(
        { error: 'Failed to fetch channel information from YouTube' },
        { status: 400 }
      );
    }
    
    // 儲存到 Supabase (使用真實的頻道 ID)
    const { data: newChannel, error: insertError } = await supabase
      .from('youtube_channels')
      .insert({
        user_id: user.id,
        channel_id: channelInfo.actualChannelId || channelId,
        channel_name: customName || channelInfo.name,
        channel_url: channelUrl,
        description: channelInfo.description,
        subscriber_count: channelInfo.subscriberCount,
        video_count: channelInfo.videoCount,
        avatar_url: channelInfo.avatar,
        banner_url: channelInfo.banner,
        is_owned: isOwned,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save channel' },
        { status: 500 }
      );
    }

    // Map database fields to frontend types
    const mappedChannel = {
      id: newChannel.id,
      channelId: newChannel.channel_id,
      channelName: newChannel.channel_name,
      channelUrl: newChannel.channel_url,
      description: newChannel.description,
      subscriberCount: newChannel.subscriber_count,
      videoCount: newChannel.video_count,
      avatar: newChannel.avatar_url,
      banner: newChannel.banner_url,
      isOwned: newChannel.is_owned,
      createdAt: newChannel.created_at,
      updatedAt: newChannel.updated_at,
      lastScrapedAt: newChannel.last_scraped_at,
    };

    return NextResponse.json({
      success: true,
      channel: mappedChannel,
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}

// 輔助函數：從 URL 提取頻道 ID
function extractChannelId(url: string): string | null {
  // Handle different YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, // youtube.com/channel/UC...
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/, // youtube.com/c/channelname
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/, // youtube.com/user/username  
    /youtube\.com\/@([a-zA-Z0-9_-]+)/, // youtube.com/@handle
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

// 輔助函數：從 YouTube API 獲取頻道資訊
async function fetchChannelInfoFromYouTube(channelId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('YouTube API key not configured');
    return null;
  }

  try {
    // 首先嘗試用 channel ID 查詢
    let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
    
    let response = await fetch(url);
    let data = await response.json();

    // 如果沒有找到，可能是 handle 或 custom name，需要先搜尋
    if (!data.items || data.items.length === 0) {
      // 嘗試用 forHandle 查詢 (@handle)
      url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${channelId}&key=${apiKey}`;
      response = await fetch(url);
      data = await response.json();
      
      // 如果還是沒找到，嘗試用 forUsername 查詢
      if (!data.items || data.items.length === 0) {
        url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forUsername=${channelId}&key=${apiKey}`;
        response = await fetch(url);
        data = await response.json();
      }
    }

    if (!response.ok || !data.items || data.items.length === 0) {
      console.error('YouTube API error:', data);
      return null;
    }

    const channel = data.items[0];
    const snippet = channel.snippet;
    const statistics = channel.statistics;

    return {
      name: snippet.title,
      description: snippet.description || '',
      subscriberCount: parseInt(statistics.subscriberCount) || 0,
      videoCount: parseInt(statistics.videoCount) || 0,
      avatar: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      banner: snippet.bannerExternalUrl || '',
      actualChannelId: channel.id, // 真實的 YouTube 頻道 ID
    };
  } catch (error) {
    console.error('Error fetching channel info from YouTube API:', error);
    return null;
  }
}