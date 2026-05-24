import { CONFIGURABLE_HOME_FEATURE_KEYS, HOME_FEATURE_KEYS, type HomeFeatureKey } from './homeFeatures';

const HOME_HIDDEN_FEATURES_KEY = 'roastplus_home_hidden_features';
const HOME_FEATURE_KEY_SET = new Set<string>(HOME_FEATURE_KEYS);
const CONFIGURABLE_HOME_FEATURE_KEY_SET = new Set<string>(CONFIGURABLE_HOME_FEATURE_KEYS);

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isHomeFeatureKey(value: unknown): value is HomeFeatureKey {
  return typeof value === 'string' && HOME_FEATURE_KEY_SET.has(value);
}

function isConfigurableHomeFeatureKey(value: unknown): value is HomeFeatureKey {
  return typeof value === 'string' && CONFIGURABLE_HOME_FEATURE_KEY_SET.has(value);
}

export function normalizeHiddenHomeFeatureKeys(value: unknown): HomeFeatureKey[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value)).filter(
    (key): key is HomeFeatureKey => isHomeFeatureKey(key) && isConfigurableHomeFeatureKey(key)
  );
}

export function getHiddenHomeFeatureKeys(): HomeFeatureKey[] {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(HOME_HIDDEN_FEATURES_KEY);
  if (!stored) return [];

  const parsed = parseJson<unknown>(stored);
  return normalizeHiddenHomeFeatureKeys(parsed);
}

export function setHiddenHomeFeatureKeys(keys: HomeFeatureKey[]): void {
  if (typeof window === 'undefined') return;

  const normalizedKeys = normalizeHiddenHomeFeatureKeys(keys);

  if (normalizedKeys.length === 0) {
    localStorage.removeItem(HOME_HIDDEN_FEATURES_KEY);
    return;
  }

  localStorage.setItem(HOME_HIDDEN_FEATURES_KEY, JSON.stringify(normalizedKeys));
}

export function setHomeFeatureHidden(key: HomeFeatureKey, hidden: boolean): void {
  if (!isConfigurableHomeFeatureKey(key)) return;

  const currentKeys = getHiddenHomeFeatureKeys();
  const nextKeys = hidden ? [...currentKeys, key] : currentKeys.filter((currentKey) => currentKey !== key);

  setHiddenHomeFeatureKeys(nextKeys);
}

export function isHomeFeatureVisible(key: HomeFeatureKey): boolean {
  return !getHiddenHomeFeatureKeys().includes(key);
}
