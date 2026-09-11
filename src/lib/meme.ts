export type MemeSourcePlatform = 'x' | 'instagram' | 'tiktok' | 'article' | 'other';

export interface MemeSource {
  label: string;
  /** Public permalink only — never store full post body. */
  url: string;
  platform?: MemeSourcePlatform;
}

const PLATFORM_LABELS: Record<MemeSourcePlatform, string> = {
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  article: '기사',
  other: '기타',
};

/** Calm Korean/Latin label for source platform tags. */
export function platformLabel(platform?: MemeSourcePlatform): string | null {
  if (!platform) return null;
  return PLATFORM_LABELS[platform] ?? null;
}

export interface Meme {
  id: string;
  term: string;
  meaning: string;
  example: string;
  firstSeen: string;
  peak: string;
  fade?: string | null;
  sourceCount: number;
  sources?: MemeSource[];
  tags: string[];
  status: 'active' | 'faded';
  sensitivity: 'safe' | 'sensitive';
  visibilityDefault: 'public' | 'hidden';
  updatedAt: string;
}

/** Fields that must not appear as HTML text nodes while locked. */
export interface UnlockPayload {
  term: string;
  meaning: string;
  example: string;
  tags: string[];
  firstSeen: string;
  peak: string;
  fade?: string | null;
  updatedAt: string;
  sources?: MemeSource[];
}

export function needsUnlock(meme: Pick<Meme, 'sensitivity' | 'visibilityDefault'>): boolean {
  return meme.visibilityDefault === 'hidden' || meme.sensitivity === 'sensitive';
}

/** True when fade week is present and non-empty (status=faded only in practice). */
export function hasFade(fade?: string | null): boolean {
  return typeof fade === 'string' && fade.trim().length > 0;
}

/** Neutral placeholder — safe to put in the locked DOM (no first-grapheme leak). */
export function maskTerm(_term?: string): string {
  return '접혀 있음';
}

/**
 * Display ISO week `YYYY-Www` as Korean `YYYY년 M월 N째 주`.
 * Uses the Thursday of the ISO week (ISO mid-point) for calendar month / week-of-month.
 * Example: 2025-W18 → 2025년 5월 1째 주
 */
export function formatIsoWeekKo(isoWeek: string): string {
  const m = /^(\d{4})-W(\d{1,2})$/i.exec(isoWeek.trim());
  if (!m) return isoWeek;
  const isoYear = Number(m[1]);
  const week = Number(m[2]);
  if (!Number.isFinite(isoYear) || !Number.isFinite(week) || week < 1 || week > 53) {
    return isoWeek;
  }

  // Monday of ISO week 1: the week containing Jan 4
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Dow = jan4.getUTCDay() || 7; // Mon=1 … Sun=7
  const mondayWeek1 = Date.UTC(isoYear, 0, 4 - jan4Dow + 1);
  const thursdayMs = mondayWeek1 + (week - 1) * 7 * 86400000 + 3 * 86400000;
  const thursday = new Date(thursdayMs);

  const y = thursday.getUTCFullYear();
  const month = thursday.getUTCMonth() + 1;
  const day = thursday.getUTCDate();
  const weekOfMonth = Math.floor((day - 1) / 7) + 1;
  return `${y}년 ${month}월 ${weekOfMonth}째 주`;
}

export function unlockPayload(meme: Meme): UnlockPayload {
  const payload: UnlockPayload = {
    term: meme.term,
    meaning: meme.meaning,
    example: meme.example,
    tags: meme.tags,
    firstSeen: meme.firstSeen,
    peak: meme.peak,
    updatedAt: meme.updatedAt,
  };
  if (hasFade(meme.fade)) {
    payload.fade = meme.fade;
  }
  if (meme.sources?.length) {
    payload.sources = meme.sources;
  }
  return payload;
}
