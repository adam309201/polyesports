export interface TradingSession {
  eoaAddress: string;
  safeAddress: string;
  isSafeDeployed: boolean;
  hasApiCredentials: boolean;
  hasApprovals: boolean;
  apiCredentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
  lastChecked: number;
}

export type SessionStep =
  | 'idle'
  | 'checking'
  | 'deploying'
  | 'credentials'
  | 'approvals'
  | 'complete';

const SESSION_KEY_PREFIX = 'polymarket_trading_session_';

export const loadSession = (address: string): TradingSession | null => {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(`${SESSION_KEY_PREFIX}${address.toLowerCase()}`);
  if (!stored) return null;

  try {
    const session = JSON.parse(stored) as TradingSession;

    // Validate session belongs to this address
    if (session.eoaAddress.toLowerCase() !== address.toLowerCase()) {
      console.warn('[Session] Address mismatch, clearing invalid session');
      clearSession(address);
      return null;
    }

    return session;
  } catch (e) {
    console.error('[Session] Failed to parse session:', e);
    return null;
  }
};

export const saveSession = (address: string, session: TradingSession): void => {
  if (typeof window === 'undefined') return;

  localStorage.setItem(`${SESSION_KEY_PREFIX}${address.toLowerCase()}`, JSON.stringify(session));
};

export const clearSession = (address: string): void => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(`${SESSION_KEY_PREFIX}${address.toLowerCase()}`);
};