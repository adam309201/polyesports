import Image from 'next/image';
import {StreamIcon} from '@/components/icons';
import logoImage from '@/common/assets/images/logo.png';
import {getTeamInitials} from './event-utils';

interface LiveMatch {
  team1: { score: number; logo?: string | null; acronym?: string | null };
  team2: { score: number; logo?: string | null; acronym?: string | null };
  tournament?: { name?: string };
  stream?: { url?: string | null };
}

interface SeriesMatchBoxProps {
  team1: string;
  team2: string;
  team1Percent: string;
  team2Percent: string;
  teamLogos: Record<string, string | null>;
  eventImage: string;
  isLive: boolean;
  liveMatch: LiveMatch | null;
  liveMatchFound: boolean;
  onShowStream: () => void;
}

export default function SeriesMatchBox({
  team1,
  team2,
  team1Percent,
  team2Percent,
  teamLogos,
  eventImage,
  isLive,
  liveMatch,
  liveMatchFound,
  onShowStream,
}: SeriesMatchBoxProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Team 1 */}
      <div className="flex flex-col items-center flex-1 min-w-0">
        <div
          className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden bg-[var(--bg-elevated)] mb-2 sm:mb-3">
          {teamLogos[team1] ? (
            <Image
              src={teamLogos[team1]!}
              alt={team1}
              width={80}
              height={80}
              className="w-full h-full object-contain p-1 sm:p-2"
            />
          ) : eventImage ? (
            <Image
              src={eventImage}
              alt={team1}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[var(--text-muted)]">{getTeamInitials(team1)}</span>
          )}
        </div>
        <div className="font-bold text-xs sm:text-lg text-[var(--text-primary)] text-center truncate max-w-full">{team1}</div>
        <div className="text-lg sm:text-2xl font-bold text-[#00b8ff] mt-0.5 sm:mt-1">{team1Percent}¢</div>
      </div>

      {/* VS / Score */}
      <div className="flex flex-col items-center px-2 sm:px-6 shrink-0">
        {isLive ? (
          <div className="text-center flex flex-col items-center">
            <div className="text-xl sm:text-4xl font-bold text-[var(--text-primary)]">
              {liveMatchFound && liveMatch ? (
                <span>
                  <span className="text-[#00b8ff]">{liveMatch.team1.score}</span>
                  <span className="text-[var(--text-muted)]"> - </span>
                  <span className="text-[#5c6c8a]">{liveMatch.team2.score}</span>
                </span>
              ) : (
                '0 - 0'
              )}
            </div>
            <div className={'flex items-center group gap-2 mt-2 sm:mt-3'}>
              <div className="flex w-12 sm:w-20 h-2 sm:h-2.5 items-center relative overflow-visible">
                <div className="h-full bg-[#00b8ff] transition-all duration-500"
                     style={{width: `${team1Percent}%`}}/>
                <div className="h-full bg-[#5c6c8a] transition-all duration-500"
                     style={{width: `${team2Percent}%`}}/>
                <div
                  className="hidden sm:flex absolute top-1/2 left-1/2 group-hover:opacity-100 opacity-0 -translate-x-1/2 -translate-y-1/2 justify-between gap-[100px]"
                ><p className="font-medium text-text-primary text-base leading-[22px]">{team1Percent}%</p>
                  <p className="font-medium text-text-primary text-base leading-[22px]">{team2Percent}%</p>
                </div>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1.5 sm:mt-2">
              {liveMatchFound && liveMatch?.tournament?.name ? liveMatch.tournament.name : 'Live Score'}
            </div>
            {liveMatchFound && liveMatch?.stream?.url ? (
              <button
                onClick={onShowStream}
                className="flex cursor-pointer justify-center items-center mt-2 sm:mt-4 gap-1 hover:text-[#9146FF] transition-colors"
              >
                <StreamIcon/>
                <span className="text-[10px] sm:text-xs">Watch Stream</span>
              </button>
            ) : (
              <div className="flex justify-center items-center mt-2 sm:mt-4 gap-1 opacity-50">
                <StreamIcon/>
                <span className="text-[10px] sm:text-xs hidden sm:inline">Stream Unavailable</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 items-center">
            <div className={'flex items-center group gap-2 mt-2 sm:mt-3'}>
              <div className="flex w-12 sm:w-20 h-2 sm:h-2.5 items-center relative overflow-visible">
                <div className="h-full bg-[#00b8ff] transition-all duration-500"
                     style={{width: `${team1Percent}%`}}/>
                <div className="h-full bg-[#5c6c8a] transition-all duration-500"
                     style={{width: `${team2Percent}%`}}/>
                <div
                  className="hidden sm:flex absolute top-1/2 left-1/2 group-hover:opacity-100 -translate-x-1/2 -translate-y-1/2 justify-between gap-[100px]"
                ><p className="font-medium text-text-primary text-base leading-[22px]">{team1Percent}%</p>
                  <p className="font-medium text-text-primary text-base leading-[22px]">{team2Percent}%</p>
                </div>
              </div>
            </div>
            <div className={'flex flex-col gap-1 items-center'}>
              <Image className={'w-8 sm:w-10 opacity-40'} src={logoImage.src} alt="PolyEsports" width={40}
                     height={40}/>
              <span className={'font-bold text-[10px] sm:text-xs text-gray-500'}>PolyEsports</span>
            </div>
            {liveMatchFound && liveMatch?.stream?.url ? (
              <button
                onClick={onShowStream}
                className="flex cursor-pointer justify-center items-center mt-1 sm:mt-2 gap-1 hover:text-[#9146FF] transition-colors"
              >
                <StreamIcon/>
                <span className="text-[10px] sm:text-xs">Watch Stream</span>
              </button>
            ) : (
              <div className="flex justify-center items-center mt-1 sm:mt-2 gap-1 opacity-50">
                <StreamIcon/>
                <span className="text-[10px] sm:text-xs hidden sm:inline">Stream Unavailable</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Team 2 */}
      <div className="flex flex-col items-center flex-1 min-w-0">
        <div
          className="w-12 h-12 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-bold text-lg overflow-hidden bg-[var(--bg-elevated)] mb-2 sm:mb-3">
          {teamLogos[team2] ? (
            <Image
              src={teamLogos[team2]!}
              alt={team2}
              width={80}
              height={80}
              className="w-full h-full object-contain p-1 sm:p-2"
            />
          ) : eventImage ? (
            <Image
              src={eventImage}
              alt={team2}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-[var(--text-muted)]">{getTeamInitials(team2)}</span>
          )}
        </div>
        <div className="font-bold text-xs sm:text-lg text-[var(--text-primary)] text-center truncate max-w-full">{team2}</div>
        <div className="text-lg sm:text-2xl font-bold text-[#5c6c8a] mt-0.5 sm:mt-1">{team2Percent}¢</div>
      </div>
    </div>
  );
}
