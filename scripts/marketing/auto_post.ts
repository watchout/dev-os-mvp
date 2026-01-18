/**
 * 自動投稿スクリプト（ABテスト対応）
 * 
 * 機能:
 *   - ABテストプールから投稿を選択
 *   - ランダムでA/Bを選択
 *   - X APIで投稿
 *   - 投稿履歴を記録
 * 
 * 使い方:
 *   npx ts-node scripts/marketing/auto_post.ts post <slot>
 *   npx ts-node scripts/marketing/auto_post.ts post morning
 *   npx ts-node scripts/marketing/auto_post.ts post noon
 *   npx ts-node scripts/marketing/auto_post.ts post night
 *   npx ts-node scripts/marketing/auto_post.ts test  # ドライラン
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';

// 環境変数読み込み（dotenvを使用）
function loadEnvFile(): void {
  // .env.api を最優先で探す（プロジェクトルート → apps/platform の順）
  const searchPaths = [
    path.join(__dirname, '../../../..', '.env.api'),     // dev-os-mvp/.env.api
    path.join(__dirname, '../..', '.env.api'),           // apps/platform/.env.api
    path.join(__dirname, '../../../..', '.env.local'),   // dev-os-mvp/.env.local
    path.join(__dirname, '../..', '.env.local'),         // apps/platform/.env.local
    path.join(__dirname, '../../../..', '.env'),         // dev-os-mvp/.env
    path.join(__dirname, '../..', '.env'),               // apps/platform/.env
  ];
  
  for (const envPath of searchPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`📁 Loading environment from: ${envPath}`);
      dotenv.config({ path: envPath });
      return;
    }
  }
}

loadEnvFile();

// 型定義
interface Variant {
  content: string;
  hook_type: string;
}

interface Post {
  id: string;
  week: number;
  day: number;
  slot: 'morning' | 'noon' | 'night';
  theme: string;
  type: string;
  variants: {
    A: Variant;
    B: Variant;
  };
  status: string;
  scheduled_date: string;
}

interface ABTestPool {
  metadata: any;
  time_slots: any;
  posts: Post[];
  stats: any;
}

interface PostHistory {
  id: string;
  post_id: string;
  variant: 'A' | 'B';
  content: string;
  tweet_id: string;
  posted_at: string;
  slot: string;
  theme: string;
  metrics?: {
    impressions: number;
    likes: number;
    retweets: number;
    replies: number;
    collected_at: string;
  };
}

// ファイルパス
const POOL_FILE = path.join(__dirname, '../../content/ab_test_pool.yml');
const HISTORY_FILE = path.join(__dirname, '../../content/post_history.json');

// プールを読み込み
function loadPool(): ABTestPool {
  if (!fs.existsSync(POOL_FILE)) {
    throw new Error(`Pool file not found: ${POOL_FILE}`);
  }
  const content = fs.readFileSync(POOL_FILE, 'utf-8');
  return yaml.load(content) as ABTestPool;
}

// 履歴を読み込み
function loadHistory(): PostHistory[] {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
}

// 履歴を保存
function saveHistory(history: PostHistory[]): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// 今日の日付を取得（JST）
function getTodayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

// 今日の投稿を取得
function getTodayPosts(pool: ABTestPool, slot: string): Post[] {
  const today = getTodayJST();
  return pool.posts.filter(p => 
    p.scheduled_date === today && 
    p.slot === slot && 
    p.status === 'active'
  );
}

// 未投稿の投稿を取得（今日以前で未投稿のもの）
function getPendingPosts(pool: ABTestPool, history: PostHistory[], slot: string): Post[] {
  const today = getTodayJST();
  const postedIds = new Set(history.map(h => `${h.post_id}_${h.posted_at.split('T')[0]}`));
  
  return pool.posts.filter(p => {
    const key = `${p.id}_${p.scheduled_date}`;
    return p.scheduled_date <= today && 
           p.slot === slot && 
           p.status === 'active' &&
           !postedIds.has(key);
  });
}

// A/Bをランダム選択（勝者がいる場合は70/30で勝者を優先）
function selectVariant(postId: string, history: PostHistory[]): 'A' | 'B' {
  // この投稿のA/Bの過去実績を集計
  const postHistory = history.filter(h => h.post_id === postId && h.metrics);
  
  const statsA = postHistory.filter(h => h.variant === 'A');
  const statsB = postHistory.filter(h => h.variant === 'B');
  
  // 両方10回以上の投稿がある場合、勝者を70%で選択
  if (statsA.length >= 10 && statsB.length >= 10) {
    const avgLikesA = statsA.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0) / statsA.length;
    const avgLikesB = statsB.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0) / statsB.length;
    
    const winner = avgLikesA > avgLikesB ? 'A' : 'B';
    return Math.random() < 0.7 ? winner : (winner === 'A' ? 'B' : 'A');
  }
  
  // まだデータが不十分な場合は50/50
  return Math.random() < 0.5 ? 'A' : 'B';
}

// X API クライアント
async function getXClient() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    throw new Error('X API credentials not found');
  }

  try {
    const { TwitterApi } = await import('twitter-api-v2');
    return new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });
  } catch (e) {
    throw new Error('twitter-api-v2 not installed. Run: npm install twitter-api-v2');
  }
}

// 投稿実行
async function postTweet(content: string): Promise<string> {
  const client = await getXClient();
  const result = await client.v2.tweet({ text: content });
  return result.data.id;
}

// メイン処理
async function autoPost(slot: string, dryRun: boolean = false): Promise<void> {
  console.log(`\n🤖 Auto Post - Slot: ${slot} ${dryRun ? '(DRY RUN)' : ''}\n`);
  
  const pool = loadPool();
  const history = loadHistory();
  
  // 未投稿の投稿を取得
  const pendingPosts = getPendingPosts(pool, history, slot);
  
  if (pendingPosts.length === 0) {
    console.log(`✅ No pending posts for slot: ${slot}`);
    return;
  }
  
  // 最も古い未投稿を選択
  pendingPosts.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const post = pendingPosts[0];
  
  console.log(`📝 Selected post: ${post.id}`);
  console.log(`   Theme: ${post.theme}`);
  console.log(`   Date: ${post.scheduled_date}`);
  
  // A/B選択
  const variant = selectVariant(post.id, history);
  const content = post.variants[variant].content.trim();
  
  console.log(`   Variant: ${variant} (${post.variants[variant].hook_type})`);
  console.log(`   Content preview: ${content.substring(0, 50)}...`);
  
  if (dryRun) {
    console.log('\n🔍 DRY RUN - Not posting');
    console.log('---');
    console.log(content);
    console.log('---');
    return;
  }
  
  // 投稿実行
  try {
    const tweetId = await postTweet(content);
    console.log(`\n✅ Posted! Tweet ID: ${tweetId}`);
    
    // 履歴に記録
    const record: PostHistory = {
      id: `hist_${Date.now()}`,
      post_id: post.id,
      variant: variant,
      content: content,
      tweet_id: tweetId,
      posted_at: new Date().toISOString(),
      slot: slot,
      theme: post.theme,
    };
    
    history.push(record);
    saveHistory(history);
    
    console.log(`📊 History saved: ${record.id}`);
    
  } catch (error) {
    console.error(`❌ Failed to post:`, error);
    throw error;
  }
}

// 履歴表示
function showHistory(): void {
  const history = loadHistory();
  
  if (history.length === 0) {
    console.log('📭 No post history');
    return;
  }
  
  console.log('\n📊 Post History:\n');
  
  for (const h of history.slice(-10)) {
    const date = new Date(h.posted_at).toLocaleString('ja-JP');
    const metrics = h.metrics 
      ? `❤️${h.metrics.likes} 🔁${h.metrics.retweets} 👁️${h.metrics.impressions}`
      : '(metrics pending)';
    
    console.log(`[${date}] ${h.slot.toUpperCase()}`);
    console.log(`  Theme: ${h.theme} | Variant: ${h.variant}`);
    console.log(`  ${metrics}`);
    console.log(`  Tweet: https://x.com/i/web/status/${h.tweet_id}`);
    console.log('');
  }
}

// 統計表示
function showStats(): void {
  const history = loadHistory();
  const withMetrics = history.filter(h => h.metrics);
  
  if (withMetrics.length === 0) {
    console.log('📊 No metrics collected yet');
    return;
  }
  
  console.log('\n📊 AB Test Stats:\n');
  
  // 投稿IDごとに集計
  const byPostId = new Map<string, { A: PostHistory[], B: PostHistory[] }>();
  
  for (const h of withMetrics) {
    if (!byPostId.has(h.post_id)) {
      byPostId.set(h.post_id, { A: [], B: [] });
    }
    byPostId.get(h.post_id)![h.variant].push(h);
  }
  
  for (const [postId, data] of byPostId) {
    const avgLikesA = data.A.length > 0 
      ? data.A.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0) / data.A.length 
      : 0;
    const avgLikesB = data.B.length > 0 
      ? data.B.reduce((sum, h) => sum + (h.metrics?.likes || 0), 0) / data.B.length 
      : 0;
    
    const winner = data.A.length >= 3 && data.B.length >= 3
      ? (avgLikesA > avgLikesB ? 'A' : 'B')
      : 'TBD';
    
    console.log(`${postId}:`);
    console.log(`  A: ${data.A.length} posts, avg likes: ${avgLikesA.toFixed(1)}`);
    console.log(`  B: ${data.B.length} posts, avg likes: ${avgLikesB.toFixed(1)}`);
    console.log(`  Winner: ${winner}`);
    console.log('');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'post':
      const slot = args[1];
      if (!['morning', 'noon', 'night'].includes(slot)) {
        console.error('Usage: auto_post.ts post <morning|noon|night>');
        process.exit(1);
      }
      await autoPost(slot, false);
      break;

    case 'test':
      const testSlot = args[1] || 'noon';
      await autoPost(testSlot, true);
      break;

    case 'history':
      showHistory();
      break;

    case 'stats':
      showStats();
      break;

    case 'help':
    default:
      console.log(`
自動投稿スクリプト（ABテスト対応）

使い方:
  npx ts-node scripts/marketing/auto_post.ts <command>

コマンド:
  post <slot>    投稿実行（morning/noon/night）
  test [slot]    ドライラン
  history        投稿履歴を表示
  stats          ABテスト統計を表示

例:
  npx ts-node scripts/marketing/auto_post.ts post noon
  npx ts-node scripts/marketing/auto_post.ts test morning
      `);
  }
}

main().catch(console.error);
