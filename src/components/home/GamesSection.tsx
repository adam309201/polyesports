'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image, { StaticImageData } from 'next/image';
import Link from 'next/link';

// Import game images
import csgoImg from '@/common/assets/images/csgo.png';
import valorantImg from '@/common/assets/images/valorant.png';
import lolImg from '@/common/assets/images/lol.png';
import dota2Img from '@/common/assets/images/dota2.png';
import logoImg from '@/common/assets/images/logo.png';

interface EsportsGame {
  id: number;
  name: string;
  slug: string;
  image: string;
  seriesId: number;
}

const GAME_IMAGES: Record<string, StaticImageData> = {
  'cs2': csgoImg,
  'val': valorantImg,
  'lol': lolImg,
  'dota2': dota2Img,
};

const getGameImage = (game: EsportsGame): StaticImageData | string => {
  return GAME_IMAGES[game.slug] || game.image;
};

const TOTAL_SLOTS = 8;

export default function GamesSection() {
  const [games, setGames] = useState<EsportsGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/polymarket/sports');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setGames(data);
      } catch (error) {
        console.error('Failed to fetch games:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  const checkScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = sliderRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, loading]);

  const scroll = (dir: 'left' | 'right') => {
    const el = sliderRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  const fallbackCount = Math.max(0, TOTAL_SLOTS - games.length);
  const items = loading
    ? [...Array(TOTAL_SLOTS)]
    : [...games.map(g => ({ type: 'game' as const, game: g })), ...Array(fallbackCount).fill({ type: 'fallback' as const })];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 border-t border-[var(--border-default)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">Browse by Game</h2>
        {/* Arrow buttons - hidden on mobile (swipe), visible on md+ */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
              canScrollLeft
                ? 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                : 'border-transparent bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default opacity-40'
            }`}
            aria-label="Scroll left"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
              canScrollRight
                ? 'border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                : 'border-transparent bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-default opacity-40'
            }`}
            aria-label="Scroll right"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Slider container */}
      <div className="relative">
        {/* Left fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent z-10 pointer-events-none" />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={sliderRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth py-2 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading && items.map((_, i) => (
            <div
              key={`loading-${i}`}
              className={`relative h-[184px] w-[140px] sm:w-[150px] rounded-xl shrink-0 ${
                i < 4 ? 'animate-pulse' : ''
              }`}
            >
              {i < 4 ? (
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-[var(--bg-elevated)]" />
              ) : (
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] border-dashed flex items-center justify-center">
                  <Image className="w-10 h-10 opacity-20 mx-auto" src={logoImg} alt="" />
                </div>
              )}
            </div>
          ))}

          {!loading && items.map((item, i) => {
            if (item.type === 'game') {
              const game = item.game as EsportsGame;
              const image = getGameImage(game);
              return (
                <Link
                  key={game.id}
                  href={`/matches/${game.slug}`}
                  className="show-visible hover-shine-container relative h-[184px] w-[140px] sm:w-[150px] cursor-pointer rounded-xl group block shrink-0"
                >
                  <div className="shine-item relative h-full w-full overflow-hidden rounded-lg bg-gray-200">
                    <Image
                      className="loading-bg h-[184px] w-full rounded-lg object-cover transition-transform group-hover:scale-105"
                      src={image}
                      alt={game.name}
                      width={typeof image === 'string' ? 200 : undefined}
                      height={typeof image === 'string' ? 184 : undefined}
                    />
                    {/* Name overlay - always visible on mobile, hover on desktop */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3">
                        <div className="text-white font-semibold text-xs sm:text-sm">{game.name}</div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }
            // Fallback
            return (
              <div
                key={`fallback-${i}`}
                className="relative h-[184px] w-[140px] sm:w-[150px] rounded-xl shrink-0"
              >
                <div className="relative h-full w-full overflow-hidden rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] border-dashed flex items-center justify-center">
                  <Image className="w-10 h-10 opacity-20 mx-auto" src={logoImg} alt="" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
