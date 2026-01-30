// --- Mobile wallet helpers ---

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function isWalletInjected(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  return !!eth?.isMetaMask || !!eth?.isCoinbaseWallet || !!eth?.isCoinbaseBrowser;
}

/**
 * On mobile without an injected wallet (normal browser, not wallet in-app browser),
 * we should use WalletConnect instead of the native connector.
 * WalletConnect will deeplink to the wallet app for approval,
 * then return to this browser with the connection established.
 */
export function shouldUseWalletConnect(connectorId: string): boolean {
  if (!isMobile()) return false;
  if (isWalletInjected()) return false;

  const id = connectorId.toLowerCase();
  return id.includes('metamask') || id.includes('coinbase') || id === 'injected';
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
