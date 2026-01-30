import Image from 'next/image';
import {getStreamEmbedUrl} from './event-utils';

interface LiveMatch {
  team1: { score: number; logo?: string | null; acronym?: string | null };
  team2: { score: number; logo?: string | null; acronym?: string | null };
  tournament?: { name?: string };
  stream?: { url?: string | null };
}

interface StreamModalProps {
  show: boolean;
  onClose: () => void;
  team1: string;
  team2: string;
  liveMatch: LiveMatch | null;
  liveMatchFound: boolean;
}

export default function StreamModal({
  show,
  onClose,
  team1,
  team2,
  liveMatch,
  liveMatchFound,
}: StreamModalProps) {
  if (!show || !liveMatch?.stream?.url) return null;

  const streamUrl = liveMatch.stream.url;
  const embedUrl = getStreamEmbedUrl(streamUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl mx-4 bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--loss-red)] rounded-full animate-pulse"/>
              <span className="text-sm font-semibold text-[var(--loss-red)]">LIVE</span>
            </span>
            <span className="text-sm text-[var(--text-primary)] font-medium">
              {team1} vs {team2}
            </span>
            {liveMatch?.tournament?.name && (
              <span className="text-xs text-[var(--text-muted)]">
                &bull; {liveMatch.tournament.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Stream Embed */}
        <div className="aspect-video bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              width="100%"
              height="100%"
              allowFullScreen
              allow="autoplay; encrypted-media"
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <p className="text-[var(--text-muted)]">Không thể nhúng stream này</p>
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-[#9146FF] text-white font-medium hover:bg-[#7c3aed] transition-colors"
              >
                Mở trong tab mới
              </a>
            </div>
          )}
        </div>

        {/* Score Display in Modal */}
        {liveMatchFound && (
          <div className="flex items-center justify-center gap-6 p-4 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              {liveMatch.team1.logo && (
                <Image src={liveMatch.team1.logo} alt={team1} width={32} height={32}
                       className="w-8 h-8 object-contain"/>
              )}
              <span className="font-semibold text-[var(--text-primary)]">{liveMatch.team1.acronym || team1}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[var(--bg-elevated)]">
              <span className="text-2xl font-bold text-[#00b8ff]">{liveMatch.team1.score}</span>
              <span className="text-[var(--text-muted)]">-</span>
              <span className="text-2xl font-bold text-[#5c6c8a]">{liveMatch.team2.score}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[var(--text-primary)]">{liveMatch.team2.acronym || team2}</span>
              {liveMatch.team2.logo && (
                <Image src={liveMatch.team2.logo} alt={team2} width={32} height={32}
                       className="w-8 h-8 object-contain"/>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
