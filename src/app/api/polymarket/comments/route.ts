import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const assetId = searchParams.get('asset_id');
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset') || '0';

  if (!assetId) {
    return NextResponse.json({ error: 'asset_id is required' }, { status: 400 });
  }

  try {
    const url = `https://gamma-api.polymarket.com/comments?parent_entity_type=Event&parent_entity_id=${assetId}&limit=${limit}&offset=${offset}&order=createdAt&ascending=false&get_positions=true`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Comments API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
