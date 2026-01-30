// --- Mobile wallet deeplink helpers ---

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isMetaMaskInjected(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(window as any).ethereum?.isMetaMask;
}

export function isCoinbaseInjected(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  return !!eth?.isCoinbaseWallet || !!eth?.isCoinbaseBrowser;
}

/** Returns MetaMask deeplink that opens the dApp inside the MetaMask in-app browser */
export function getMetaMaskDeepLink(): string {
  const url = window.location.href.replace(/^https?:\/\//, '');
  return `https://metamask.app.link/dapp/${url}`;
}

/** Returns Coinbase Wallet deeplink */
export function getCoinbaseDeepLink(): string {
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`;
}

/**
 * On mobile, if the wallet app is not already injected (user is in a normal browser),
 * redirect to the wallet's deeplink so the dApp opens inside the wallet's in-app browser.
 * Returns true if a redirect was triggered (caller should skip wagmi connect).
 */
export function handleMobileWalletRedirect(connectorId: string): boolean {
  if (!isMobile()) return false;

  const id = connectorId.toLowerCase();

  if (id.includes('metamask') && !isMetaMaskInjected()) {
    window.location.href = getMetaMaskDeepLink();
    return true;
  }

  if (id.includes('coinbase') && !isCoinbaseInjected()) {
    window.location.href = getCoinbaseDeepLink();
    return true;
  }

  return false;
}

// --- Number formatting ---

const getDecimalPartAsString = (num: number) => {
  return num.toString().split('.')[1] || '0';
};

export const formatNumberBalance = (number: number | string = '0', infractionDigit: number = 4) => {
  let formatPrice = '';
  const numValue = Number(number);
  const threshold = 1 / Math.pow(10, infractionDigit);

  if (isNaN(numValue)) {
    return '0.00';
  }

  if (numValue === 0) {
    return '0.00';
  }

  if (numValue > 0 && numValue < threshold) {
    return `<${threshold.toFixed(infractionDigit)}`;
  }

  if (Number.isInteger(numValue)) {
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  const fixedString = numValue.toFixed(20);
  const indexOf = fixedString.indexOf('.');
  const newNumber = Number(fixedString.slice(0, indexOf + infractionDigit + 1));
  const numDecimalPart = getDecimalPartAsString(newNumber);

  formatPrice = newNumber.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(numDecimalPart.length, infractionDigit),
    maximumFractionDigits: Math.min(numDecimalPart.length, infractionDigit),
  });

  return formatPrice;
};
