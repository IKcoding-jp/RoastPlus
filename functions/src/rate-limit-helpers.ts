const DEFAULT_TIME_ZONE = 'Asia/Tokyo';

export function getUsageWindowId(date = new Date(), timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export function getUsageDocId(
  uid: string,
  functionName: string,
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE
): string {
  return [
    encodeURIComponent(uid),
    encodeURIComponent(functionName),
    getUsageWindowId(date, timeZone),
  ].join('_');
}
