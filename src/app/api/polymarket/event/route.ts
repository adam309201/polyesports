import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  try {
    // Fetch event by slug from Polymarket API
    const url = `https://gamma-api.polymarket.com/events?slug=${slug}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const data = await response.json();

    // The API returns an array, get the first item
    if (Array.isArray(data) && data.length > 0) {
      return NextResponse.json(data[0]);
    }

    // If no results, return 404
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  } catch (error) {
    console.error('Polymarket API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event from Polymarket' },
      { status: 500 }
    );
  }
}
