'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--bg-card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src="https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/730/library_hero.jpg"
              alt="Esports"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
          </div>

          {/* Hero Content */}
          <div className="relative p-5 sm:p-10 min-h-[200px] sm:min-h-[280px] flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="px-2 sm:px-2.5 py-1 rounded-full bg-[#00b8ff] text-black text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                Prediction Markets
              </span>
              <span className="px-2 sm:px-2.5 py-1 rounded-full bg-[var(--live-red)] text-white text-[10px] sm:text-xs font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-live-pulse" />
                Live
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white mb-2 sm:mb-3 leading-tight">
              Esports Predictions
            </h1>
            <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 max-w-lg">
              Trade on your favorite esports matches. CS2, Valorant, League of Legends and more. Real-time odds powered by Polymarket.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/matches"
                className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-[#00b8ff] font-semibold text-black text-sm hover:bg-[#00b8ff]/90 transition-all"
              >
                View All Matches
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
