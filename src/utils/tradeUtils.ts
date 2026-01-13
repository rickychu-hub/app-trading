/**
 * Truncates a number to a specific number of decimals based on stepSize.
 * This ensures we don't send more decimals than Binance (or other exchanges) allow.
 * 
 * @param amount The amount to format
 * @param stepSize The step size (e.g., 0.000001 for 6 decimals)
 * @returns The formatted string
 */
export const formatQuantity = (amount: number | string, stepSize: number | string = "0.000001"): string => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(value)) return "0";

    // Calculate number of decimals from stepSize
    // e.g. 0.001 -> 3 decimals, 1 -> 0 decimals
    const stepStr = stepSize.toString();
    const decimals = stepStr.indexOf('.') > -1 ? stepStr.split('.')[1].length : 0;

    // We use a regex to truncate without rounding to avoid "insufficient balance" or filter errors
    // verification: 1.23456789 with 6 decimals -> 1.234567
    const re = new RegExp(`^-?\\d+(?:\\.\\d{0,${decimals}})?`);
    const match = value.toString().match(re);

    return match ? match[0] : value.toFixed(decimals);
};
