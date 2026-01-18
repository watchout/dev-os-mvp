/**
 * マーケティングダッシュボード API
 * 
 * 投稿履歴とABテスト結果を返す
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface PostHistory {
  id: string;
  post_id: string;
  variant: 'A' | 'B';
  content: string;
  tweet_id: string;
  posted_at: string;
  slot: 'morning' | 'noon' | 'night';
  theme: string;
  metrics?: {
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
  };
}

interface UserInfo {
  username: string;
  name: string;
  profileImageUrl: string;
  followers: number;
  following: number;
  tweets: number;
  updatedAt: string;
}

export async function GET() {
  try {
    // ユーザー情報を読み込み
    const userInfoPath = path.join(process.cwd(), 'content/user_info.json');
    let userInfo: UserInfo | null = null;
    if (fs.existsSync(userInfoPath)) {
      userInfo = JSON.parse(fs.readFileSync(userInfoPath, 'utf-8'));
    }

    // 投稿履歴を読み込み
    const historyPath = path.join(process.cwd(), 'content/post_history.json');
    let history: PostHistory[] = [];
    
    if (fs.existsSync(historyPath)) {
      const content = fs.readFileSync(historyPath, 'utf-8');
      history = JSON.parse(content);
    }
    
    // 統計を計算
    const totalPosts = history.length;
    const variantA = history.filter(h => h.variant === 'A');
    const variantB = history.filter(h => h.variant === 'B');
    
    // メトリクス集計
    const totalImpressions = history.reduce((sum, h) => sum + (h.metrics?.impressions || 0), 0);
    const totalLikes = history.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0);
    const totalRetweets = history.reduce((sum, h) => sum + (h.metrics?.retweets || 0), 0);
    
    const avgLikesA = variantA.length > 0 
      ? variantA.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0) / variantA.length 
      : 0;
    const avgLikesB = variantB.length > 0 
      ? variantB.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0) / variantB.length 
      : 0;
    
    // エンゲージメント率
    const engagementRate = totalImpressions > 0 
      ? ((totalLikes + totalRetweets) / totalImpressions * 100).toFixed(2) 
      : null;
    
    // Week計算
    const startDate = new Date('2026-01-17');
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentWeek = Math.floor(daysDiff / 7) + 1;
    const currentDay = (daysDiff % 7) + 1;
    
    return NextResponse.json({
      user: userInfo,
      stats: {
        totalPosts,
        totalImpressions,
        totalLikes,
        totalRetweets,
        engagementRate,
        currentWeek,
        currentDay,
      },
      abTest: {
        A: {
          posts: variantA.length,
          avgLikes: avgLikesA.toFixed(1),
          hasMetrics: variantA.some(h => h.metrics),
        },
        B: {
          posts: variantB.length,
          avgLikes: avgLikesB.toFixed(1),
          hasMetrics: variantB.some(h => h.metrics),
        },
      },
      history: history.slice(0, 10).map(h => ({
        id: h.id,
        variant: h.variant,
        content: h.content.substring(0, 100) + (h.content.length > 100 ? '...' : ''),
        fullContent: h.content,
        slot: h.slot,
        theme: h.theme,
        postedAt: h.posted_at,
        tweetId: h.tweet_id,
        metrics: h.metrics || null,
      })),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
