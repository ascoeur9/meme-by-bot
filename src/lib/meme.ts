export interface Meme {
  id: string;
  term: string;
  meaning: string;
  example: string;
  firstSeen: string;
  peak: string;
  fade: string;
  sourceCount: number;
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
}

export function needsUnlock(meme: Pick<Meme, 'sensitivity' | 'visibilityDefault'>): boolean {
  return meme.visibilityDefault === 'hidden' || meme.sensitivity === 'sensitive';
}

/** Neutral placeholder — safe to put in the locked DOM (no first-grapheme leak). */
export function maskTerm(_term?: string): string {
  return '····';
}

export function unlockPayload(meme: Meme): UnlockPayload {
  return {
    term: meme.term,
    meaning: meme.meaning,
    example: meme.example,
    tags: meme.tags,
    firstSeen: meme.firstSeen,
    peak: meme.peak,
    fade: meme.fade,
    updatedAt: meme.updatedAt,
  };
}
