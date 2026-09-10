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

/** First grapheme + ellipsis — safe to put in the locked DOM. */
export function maskTerm(term: string): string {
  const first = [...term][0];
  return first ? `${first}…` : '…';
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
