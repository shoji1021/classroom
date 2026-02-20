import { NextResponse } from 'next/server';

// 先ほどデプロイに成功した API の URL
const API_URL = 'https://api-server.shoji-masato.workers.dev';

// Cloudflare Pages で動作させるための設定
export const runtime = 'edge';

export async function GET() {
  try {
    // 1. 作成した Worker API にデータをリクエストする
    // キャッシュを無効化して常に最新データを取得するように設定
    const response = await fetch(API_URL, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API サーバーのエラー: ${response.status}`);
    }

    // 2. API (api-server) が既に整形済みの JSON を返してくるので
    // そのまま受け取るだけでOKです
    const changes = await response.json();
    
    // ログ出力（動作確認用）
    console.log('APIから取得したデータ:', changes.slice(0, 5));
    
    return NextResponse.json(changes);

  } catch (error: any) {
    console.error('授業変更データの取得エラー:', error);
    // エラー時は空の配列を返し、アプリが落ちないようにします
    return NextResponse.json([]);
  }
}