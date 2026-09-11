export interface MemeSource {
  label: string;
  url: string;
}

export interface Meme {
  id: string;
  term: string;
  meaning: string;
  example: string;
  firstSeen: string;
  peak: string;
  fade: string;
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
  fade: string;
  updatedAt: string;
  sources?: MemeSource[];
}

export function needsUnlock(meme: Pick<Meme, 'sensitivity' | 'visibilityDefault'>): boolean {
  return meme.visibilityDefault === 'hidden' || meme.sensitivity === 'sensitive';
}

/** Neutral placeholder — safe to put in the locked DOM (no first-grapheme leak). */
export function maskTerm(_term?: string): string {
  return '····';
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
    fade: meme.fade,
    updatedAt: meme.updatedAt,
  };
  if (meme.sources?.length) {
    payload.sources = meme.sources;
  }
  return payload;
}
