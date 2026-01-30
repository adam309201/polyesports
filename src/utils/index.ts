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
