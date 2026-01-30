// CS:GO Teams Data
export interface Team {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  worldRanking: number;
  region: 'EU' | 'NA' | 'CIS' | 'ASIA' | 'SA' | 'OCE';
  winRate: number;
  recentForm: ('W' | 'L')[];
  players: Player[];
}

export interface Player {
  id: string;
  nickname: string;
  name: string;
  country: string;
  countryFlag: string;
  rating: number;
  role: 'Rifler' | 'AWPer' | 'IGL' | 'Entry' | 'Support';
}

export interface Match {
  id: string;
  tournament: string;
  tournamentLogo: string;
  stage: string;
  team1: Team;
  team2: Team;
  team1Odds: number;
  team2Odds: number;
  status: 'live' | 'upcoming' | 'finished';
  startTime: Date;
  bestOf: 1 | 3 | 5;
  // Live match data
  team1Score?: number;
  team2Score?: number;
  currentMap?: string;
  currentRound?: number;
  // Finished match data
  winner?: string;
}

export interface Position {
  id: string;
  match: Match;
  teamBetOn: Team;
  amount: number;
  odds: number;
  potentialPayout: number;
  currentValue: number;
  status: 'active' | 'won' | 'lost';
  timestamp: Date;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  displayName: string;
  avatar: string;
  totalProfit: number;
  winRate: number;
  totalBets: number;
  roi: number;
  badges: string[];
}

// CS:GO Teams
export const teams: Team[] = [
  {
    id: 'navi',
    name: 'Natus Vincere',
    shortName: 'NAVI',
    logo: 'https://img-cdn.hltv.org/teamlogo/kixzGZIb9IYvPMXDo-1VVA.svg?ixlib=java-2.1.0&s=ecef2752e2e4fd73c4296a941633d72e',
    worldRanking: 1,
    region: 'CIS',
    winRate: 72,
    recentForm: ['W', 'W', 'L', 'W', 'W'],
    players: [
      { id: 's1mple', nickname: 's1mple', name: 'Oleksandr Kostyliev', country: 'Ukraine', countryFlag: '🇺🇦', rating: 1.25, role: 'AWPer' },
      { id: 'b1t', nickname: 'b1t', name: 'Valerii Vakhovskyi', country: 'Ukraine', countryFlag: '🇺🇦', rating: 1.12, role: 'Rifler' },
      { id: 'jl', nickname: 'jL', name: 'Justinas Lekavicius', country: 'Lithuania', countryFlag: '🇱🇹', rating: 1.08, role: 'Entry' },
      { id: 'aleksib', nickname: 'Aleksib', name: 'Aleksi Virolainen', country: 'Finland', countryFlag: '🇫🇮', rating: 0.98, role: 'IGL' },
      { id: 'im', nickname: 'iM', name: 'Mihai Ivan', country: 'Romania', countryFlag: '🇷🇴', rating: 1.05, role: 'Support' },
    ],
  },
  {
    id: 'faze',
    name: 'FaZe Clan',
    shortName: 'FaZe',
    logo: 'https://img-cdn.hltv.org/teamlogo/SMhzsxzbguPMjH5VdPGmfN.svg?ixlib=java-2.1.0&s=d923d73e27f6f7a5a3e1b5c4b0f4b3d4',
    worldRanking: 3,
    region: 'EU',
    winRate: 68,
    recentForm: ['W', 'L', 'W', 'W', 'L'],
    players: [
      { id: 'broky', nickname: 'broky', name: 'Helvijs Saukants', country: 'Latvia', countryFlag: '🇱🇻', rating: 1.18, role: 'AWPer' },
      { id: 'ropz', nickname: 'ropz', name: 'Robin Kool', country: 'Estonia', countryFlag: '🇪🇪', rating: 1.15, role: 'Rifler' },
      { id: 'rain', nickname: 'rain', name: 'Håvard Nygaard', country: 'Norway', countryFlag: '🇳🇴', rating: 1.08, role: 'Entry' },
      { id: 'frozen', nickname: 'frozen', name: 'David Čerňanský', country: 'Slovakia', countryFlag: '🇸🇰', rating: 1.10, role: 'Rifler' },
      { id: 'karrigan', nickname: 'karrigan', name: 'Finn Andersen', country: 'Denmark', countryFlag: '🇩🇰', rating: 0.92, role: 'IGL' },
    ],
  },
  {
    id: 'vitality',
    name: 'Team Vitality',
    shortName: 'Vitality',
    logo: 'https://img-cdn.hltv.org/teamlogo/GHHGaPgkErSzjVA_qOUDQr.svg?ixlib=java-2.1.0&s=7b1234567890abcdef',
    worldRanking: 2,
    region: 'EU',
    winRate: 70,
    recentForm: ['W', 'W', 'W', 'L', 'W'],
    players: [
      { id: 'zywoo', nickname: 'ZywOo', name: 'Mathieu Herbaut', country: 'France', countryFlag: '🇫🇷', rating: 1.28, role: 'AWPer' },
      { id: 'apeks', nickname: 'apEX', name: 'Dan Madesclaire', country: 'France', countryFlag: '🇫🇷', rating: 1.02, role: 'IGL' },
      { id: 'spinx', nickname: 'Spinx', name: 'Lotan Giladi', country: 'Israel', countryFlag: '🇮🇱', rating: 1.12, role: 'Rifler' },
      { id: 'flameZ', nickname: 'flameZ', name: 'Shahar Shushan', country: 'Israel', countryFlag: '🇮🇱', rating: 1.10, role: 'Entry' },
      { id: 'mezii', nickname: 'mezii', name: 'William Merriman', country: 'UK', countryFlag: '🇬🇧', rating: 1.05, role: 'Support' },
    ],
  },
  {
    id: 'g2',
    name: 'G2 Esports',
    shortName: 'G2',
    logo: 'https://img-cdn.hltv.org/teamlogo/zFLwAELOD15BjJSDMMNBWQ.png?ixlib=java-2.1.0&s=f1234567890abcdef',
    worldRanking: 4,
    region: 'EU',
    winRate: 65,
    recentForm: ['L', 'W', 'W', 'L', 'W'],
    players: [
      { id: 'monesy', nickname: 'm0NESY', name: 'Ilya Osipov', country: 'Russia', countryFlag: '🇷🇺', rating: 1.22, role: 'AWPer' },
      { id: 'niko', nickname: 'NiKo', name: 'Nikola Kovač', country: 'Bosnia', countryFlag: '🇧🇦', rating: 1.18, role: 'Rifler' },
      { id: 'hunter', nickname: 'huNter-', name: 'Nemanja Kovač', country: 'Bosnia', countryFlag: '🇧🇦', rating: 1.08, role: 'Entry' },
      { id: 'nexa', nickname: 'nexa', name: 'Nemanja Isaković', country: 'Serbia', countryFlag: '🇷🇸', rating: 0.95, role: 'IGL' },
      { id: 'stewie2k', nickname: 'Stewie2K', name: 'Jake Yip', country: 'USA', countryFlag: '🇺🇸', rating: 1.02, role: 'Support' },
    ],
  },
  {
    id: 'spirit',
    name: 'Team Spirit',
    shortName: 'Spirit',
    logo: 'https://img-cdn.hltv.org/teamlogo/v4F3QRHFy4aN3MP3XkP2QZ.svg?ixlib=java-2.1.0&s=g1234567890abcdef',
    worldRanking: 5,
    region: 'CIS',
    winRate: 64,
    recentForm: ['W', 'W', 'L', 'L', 'W'],
    players: [
      { id: 'donk', nickname: 'donk', name: 'Danil Kryshkovets', country: 'Russia', countryFlag: '🇷🇺', rating: 1.20, role: 'Rifler' },
      { id: 'zont1x', nickname: 'zont1x', name: 'Leonid Serebryansky', country: 'Russia', countryFlag: '🇷🇺', rating: 1.12, role: 'AWPer' },
      { id: 'chopper', nickname: 'chopper', name: 'Leonid Vishnyakov', country: 'Russia', countryFlag: '🇷🇺', rating: 1.02, role: 'IGL' },
      { id: 'magixx', nickname: 'magixx', name: 'Boris Vorobiev', country: 'Russia', countryFlag: '🇷🇺', rating: 1.08, role: 'Entry' },
      { id: 'sh1ro', nickname: 'sh1ro', name: 'Dmitry Sokolov', country: 'Russia', countryFlag: '🇷🇺', rating: 1.15, role: 'AWPer' },
    ],
  },
  {
    id: 'mouz',
    name: 'MOUZ',
    shortName: 'MOUZ',
    logo: 'https://img-cdn.hltv.org/teamlogo/RKkLYj6SySxvMkJxqNEnPW.svg?ixlib=java-2.1.0&s=h1234567890abcdef',
    worldRanking: 6,
    region: 'EU',
    winRate: 62,
    recentForm: ['W', 'L', 'W', 'W', 'W'],
    players: [
      { id: 'torzsi', nickname: 'torzsi', name: 'Ádám Torzsás', country: 'Hungary', countryFlag: '🇭🇺', rating: 1.14, role: 'AWPer' },
      { id: 'jimpphat', nickname: 'Jimpphat', name: 'Jimi Salo', country: 'Finland', countryFlag: '🇫🇮', rating: 1.10, role: 'Rifler' },
      { id: 'siuhy', nickname: 'siuhy', name: 'Kamil Szkaradek', country: 'Poland', countryFlag: '🇵🇱', rating: 0.98, role: 'IGL' },
      { id: 'xertioN', nickname: 'xertioN', name: 'Dorian Berman', country: 'Israel', countryFlag: '🇮🇱', rating: 1.08, role: 'Entry' },
      { id: 'Brollan', nickname: 'Brollan', name: 'Ludvig Brolin', country: 'Sweden', countryFlag: '🇸🇪', rating: 1.12, role: 'Rifler' },
    ],
  },
];

// Mock Matches
export const matches: Match[] = [
  {
    id: 'match-1',
    tournament: 'IEM Katowice 2025',
    tournamentLogo: 'https://img-cdn.hltv.org/eventlogo/abc123.png',
    stage: 'Grand Final',
    team1: teams[0], // NAVI
    team2: teams[1], // FaZe
    team1Odds: 1.65,
    team2Odds: 2.25,
    status: 'live',
    startTime: new Date(),
    bestOf: 5,
    team1Score: 2,
    team2Score: 1,
    currentMap: 'Mirage',
    currentRound: 18,
  },
  {
    id: 'match-2',
    tournament: 'BLAST Premier World Final',
    tournamentLogo: 'https://img-cdn.hltv.org/eventlogo/def456.png',
    stage: 'Semi Final',
    team1: teams[2], // Vitality
    team2: teams[3], // G2
    team1Odds: 1.45,
    team2Odds: 2.75,
    status: 'live',
    startTime: new Date(),
    bestOf: 3,
    team1Score: 1,
    team2Score: 0,
    currentMap: 'Inferno',
    currentRound: 24,
  },
  {
    id: 'match-3',
    tournament: 'ESL Pro League S20',
    tournamentLogo: 'https://img-cdn.hltv.org/eventlogo/ghi789.png',
    stage: 'Quarter Final',
    team1: teams[4], // Spirit
    team2: teams[5], // MOUZ
    team1Odds: 1.85,
    team2Odds: 1.95,
    status: 'upcoming',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    bestOf: 3,
  },
  {
    id: 'match-4',
    tournament: 'IEM Katowice 2025',
    tournamentLogo: 'https://img-cdn.hltv.org/eventlogo/abc123.png',
    stage: 'Quarter Final',
    team1: teams[0], // NAVI
    team2: teams[3], // G2
    team1Odds: 1.55,
    team2Odds: 2.45,
    status: 'upcoming',
    startTime: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
    bestOf: 3,
  },
  {
    id: 'match-5',
    tournament: 'BLAST Premier World Final',
    tournamentLogo: 'https://img-cdn.hltv.org/eventlogo/def456.png',
    stage: 'Group Stage',
    team1: teams[1], // FaZe
    team2: teams[4], // Spirit
    team1Odds: 1.72,
    team2Odds: 2.10,
    status: 'upcoming',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    bestOf: 3,
  },
  {
    id: 'match-6',
    tournament: 'ESL Pro League S20',
    tournamentLogo: 'https://img-cdn.hltv.org/eventlogo/ghi789.png',
    stage: 'Group Stage',
    team1: teams[2], // Vitality
    team2: teams[5], // MOUZ
    team1Odds: 1.50,
    team2Odds: 2.60,
    status: 'finished',
    startTime: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    bestOf: 3,
    team1Score: 2,
    team2Score: 1,
    winner: 'vitality',
  },
];

// Mock Positions
export const positions: Position[] = [
  {
    id: 'pos-1',
    match: matches[0],
    teamBetOn: teams[0], // NAVI
    amount: 100,
    odds: 1.65,
    potentialPayout: 165,
    currentValue: 120,
    status: 'active',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
  {
    id: 'pos-2',
    match: matches[1],
    teamBetOn: teams[2], // Vitality
    amount: 50,
    odds: 1.45,
    potentialPayout: 72.5,
    currentValue: 58,
    status: 'active',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: 'pos-3',
    match: matches[5],
    teamBetOn: teams[2], // Vitality
    amount: 75,
    odds: 1.50,
    potentialPayout: 112.5,
    currentValue: 112.5,
    status: 'won',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
];

// Mock Leaderboard
export const leaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    address: '0x1234...abcd',
    displayName: 'CryptoWhale',
    avatar: '🐋',
    totalProfit: 15420.50,
    winRate: 78.5,
    totalBets: 342,
    roi: 156.2,
    badges: ['Top Trader', 'Whale', '100+ Wins'],
  },
  {
    rank: 2,
    address: '0x5678...efgh',
    displayName: 'NaviFan2k',
    avatar: '🎯',
    totalProfit: 12350.25,
    winRate: 72.3,
    totalBets: 456,
    roi: 124.8,
    badges: ['Top 10', 'Hot Streak'],
  },
  {
    rank: 3,
    address: '0x9abc...ijkl',
    displayName: 'ESportsKing',
    avatar: '👑',
    totalProfit: 9875.00,
    winRate: 68.9,
    totalBets: 289,
    roi: 98.5,
    badges: ['Top 10', 'Veteran'],
  },
  {
    rank: 4,
    address: '0xdef0...mnop',
    displayName: 'BetMaster',
    avatar: '🎲',
    totalProfit: 8420.75,
    winRate: 65.2,
    totalBets: 512,
    roi: 84.2,
    badges: ['High Volume'],
  },
  {
    rank: 5,
    address: '0x1357...qrst',
    displayName: 'S1mpleFan',
    avatar: '⚡',
    totalProfit: 7650.30,
    winRate: 71.8,
    totalBets: 198,
    roi: 76.5,
    badges: ['Rising Star'],
  },
  {
    rank: 6,
    address: '0x2468...uvwx',
    displayName: 'TacticalBets',
    avatar: '🧠',
    totalProfit: 6890.15,
    winRate: 64.5,
    totalBets: 367,
    roi: 68.9,
    badges: [],
  },
  {
    rank: 7,
    address: '0x3690...yzab',
    displayName: 'CSGOTrader',
    avatar: '💹',
    totalProfit: 5420.80,
    winRate: 62.1,
    totalBets: 423,
    roi: 54.2,
    badges: [],
  },
  {
    rank: 8,
    address: '0x4812...cdef',
    displayName: 'ProPredictor',
    avatar: '🔮',
    totalProfit: 4875.45,
    winRate: 59.8,
    totalBets: 278,
    roi: 48.8,
    badges: [],
  },
  {
    rank: 9,
    address: '0x5934...ghij',
    displayName: 'PolyMaster',
    avatar: '📊',
    totalProfit: 4230.60,
    winRate: 58.4,
    totalBets: 345,
    roi: 42.3,
    badges: [],
  },
  {
    rank: 10,
    address: '0x6056...klmn',
    displayName: 'WinStreak',
    avatar: '🔥',
    totalProfit: 3890.25,
    winRate: 67.2,
    totalBets: 156,
    roi: 38.9,
    badges: ['Hot Streak'],
  },
];

// Helper functions
export const getTeamById = (id: string): Team | undefined => {
  return teams.find(team => team.id === id);
};

export const getMatchById = (id: string): Match | undefined => {
  return matches.find(match => match.id === id);
};

export const getLiveMatches = (): Match[] => {
  return matches.filter(match => match.status === 'live');
};

export const getUpcomingMatches = (): Match[] => {
  return matches.filter(match => match.status === 'upcoming');
};

export const getFinishedMatches = (): Match[] => {
  return matches.filter(match => match.status === 'finished');
};

export const getActivePositions = (): Position[] => {
  return positions.filter(pos => pos.status === 'active');
};

export const formatOdds = (odds: number): string => {
  return odds.toFixed(2);
};

export const calculateProbability = (odds: number): number => {
  return Math.round((1 / odds) * 100);
};

export const formatTimeUntil = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return 'Started';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};
