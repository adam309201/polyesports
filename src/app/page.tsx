import { HeroSection, GamesSection, PredictionMarkets, GameEvents } from '@/components/home';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] pb-20">
      <HeroSection />
      <GamesSection />
      <PredictionMarkets />
      <GameEvents />
    </div>
  );
}
