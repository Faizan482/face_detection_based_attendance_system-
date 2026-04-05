// Convert UTC timestamp string (YYYY-MM-DD HH:MM:SS) to Pakistan local time
export const formatPKTime = (utcTimestamp) => {
  if (!utcTimestamp) return '';
  // Append 'Z' to indicate UTC
  const date = new Date(utcTimestamp + 'Z');
  return date.toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};