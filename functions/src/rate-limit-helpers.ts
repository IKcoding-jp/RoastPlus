const DEFAULT_TIME_ZONE = 'Asia/Tokyo';

interface DefaultAdminAppDependencies<TApp> {
  getApp: () => TApp;
  initializeApp: () => TApp;
}

export function getDefaultAdminApp<TApp>({ getApp, initializeApp }: DefaultAdminAppDependencies<TApp>): TApp {
  try {
    return getApp();
  } catch (error) {
    const appError = error as { code?: string };
    if (appError.code !== 'app/no-app') {
      throw error;
    }

    return initializeApp();
  }
}

export function getUsageWindowId(date = new Date(), timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export function getUsageDocId(
  uid: string,
  functionName: string,
  date = new Date(),
  timeZone = DEFAULT_TIME_ZONE
): string {
  return [encodeURIComponent(uid), encodeURIComponent(functionName), getUsageWindowId(date, timeZone)].join('_');
}
