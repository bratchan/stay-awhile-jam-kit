export const PUBLIC_ASSET_BASE_URL = new URL(
  import.meta.env.BASE_URL || './',
  window.location.href,
).href;

export const BACKGROUND_MUSIC_SRC = '/music/rainy-table-by-the-window.mp3';
export const EMPTY_TABLE_IMAGE_SRC = '/admin-uploads/store/smallChair.png';

export const UI_ICON_SRC = {
  gear: '/icons/gear.png',
  logBook: '/icons/logBook.png',
  store: '/icons/store.png',
  upgrades: '/icons/storeIcon.png',
  lock: '/icons/lock.png',
  cafeComfort: '/icons/cat_happy.png',
} as const;

export const RELATIONSHIP_HEART_SRC = {
  black: '/icons/black_heart.png',
  white: '/icons/white_heart.png',
  purple: '/icons/purple_heart.png',
  blue: '/icons/blue_heart.png',
  green: '/icons/green_heart.png',
  yellow: '/icons/yellow_heart.png',
  orange: '/icons/orange_heart.png',
  pink: '/icons/pink_heart.png',
  red: '/icons/red_heart.png',
} as const;

export function resolveAssetSrc(src: unknown): string {
  if (typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (/^(?:data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (!trimmed.startsWith('/')) return trimmed;

  return new URL(trimmed.replace(/^\/+/, ''), PUBLIC_ASSET_BASE_URL).href;
}

export function cssAssetUrl(src: unknown): string | undefined {
  const resolved = resolveAssetSrc(src);
  return resolved ? `url("${resolved.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")` : undefined;
}
