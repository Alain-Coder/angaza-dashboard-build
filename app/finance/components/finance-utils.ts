/**
 * Format Firestore document IDs into a more professional readable format
 * @param id - The original Firestore document ID
 * @param prefix - Optional prefix for the ID (e.g., 'REQ' for requests, 'LIQ' for liquidations)
 * @returns Formatted ID string
 */
export function formatFinanceId(id: string, prefix: string = ''): string {
  // Check if id exists and is a string
  if (!id || typeof id !== 'string') {
    return prefix ? `${prefix}-UNKNOWN` : 'UNKNOWN';
  }
  
  // If the ID is already formatted, return as is
  if (prefix && id.startsWith && id.startsWith(prefix)) {
    return id;
  }
  
  // Take first 8 characters of the ID and uppercase them
  const shortId = id.substring(0, 8).toUpperCase();
  
  // Add prefix if provided
  return prefix ? `${prefix}-${shortId}` : shortId;
}

/**
 * Format request ID specifically
 * @param id - The original request ID
 * @returns Formatted request ID (e.g., "REQ-A1B2C3D4")
 */
export function formatRequestId(id: string): string {
  return formatFinanceId(id, 'REQ');
}

/**
 * Format liquidation ID specifically
 * @param id - The original liquidation ID
 * @returns Formatted liquidation ID (e.g., "LIQ-E5F6G7H8")
 */
export function formatLiquidationId(id: string): string {
  return formatFinanceId(id, 'LIQ');
}