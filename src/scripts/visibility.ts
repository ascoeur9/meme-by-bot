const STORAGE_KEY = 'meme-by-bot:show-all';

interface UnlockPayload {
  term: string;
  meaning: string;
  example: string;
  tags: string[];
  firstSeen: string;
  peak: string;
  fade: string;
  updatedAt: string;
}

export function isShowAll(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setShowAll(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function maskTerm(_term?: string): string {
  return '····';
}

function readPayload(card: HTMLElement): UnlockPayload | null {
  const el = card.querySelector<HTMLScriptElement>('script[type="application/json"][data-unlock-payload]');
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as UnlockPayload;
  } catch {
    return null;
  }
}

function renderTags(container: HTMLElement, tags: string[]): void {
  container.replaceChildren();
  for (const t of tags) {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = t;
    container.appendChild(span);
  }
}

function hydrateListBody(body: HTMLElement, payload: UnlockPayload): void {
  body.replaceChildren();
  const meaning = document.createElement('p');
  meaning.textContent = payload.meaning;
  const example = document.createElement('p');
  const exLabel = document.createElement('strong');
  exLabel.textContent = '예:';
  example.append(exLabel, document.createTextNode(` ${payload.example}`));
  const tags = document.createElement('div');
  tags.className = 'tags';
  renderTags(tags, payload.tags);
  body.append(meaning, example, tags);
}

function hydrateDetailBody(body: HTMLElement, payload: UnlockPayload): void {
  body.replaceChildren();
  const dl = document.createElement('dl');

  const addRow = (label: string, fill: (dd: HTMLElement) => void) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    fill(dd);
    wrap.append(dt, dd);
    dl.append(wrap);
  };

  addRow('의미', (dd) => {
    dd.textContent = payload.meaning;
  });
  addRow('예시', (dd) => {
    dd.textContent = payload.example;
  });
  addRow('라이프사이클', (dd) => {
    dd.textContent = `등장 ${payload.firstSeen} → 정점 ${payload.peak} → 쇠퇴 ${payload.fade}`;
  });
  addRow('태그', (dd) => {
    dd.className = 'tags';
    renderTags(dd, payload.tags);
  });
  addRow('갱신', (dd) => {
    dd.textContent = payload.updatedAt;
  });

  body.append(dl);
}

function hydrateCard(card: HTMLElement): void {
  if (card.dataset.hydrated === '1') return;
  const payload = readPayload(card);
  if (!payload) return;

  const termEl = card.querySelector<HTMLElement>('[data-field="term"]');
  if (termEl) termEl.textContent = payload.term;

  const body = card.querySelector<HTMLElement>('[data-unlock-body]');
  if (body) {
    if (card.dataset.layout === 'detail') {
      hydrateDetailBody(body, payload);
    } else {
      hydrateListBody(body, payload);
    }
    body.hidden = false;
  }

  card.dataset.hydrated = '1';
}

function dehydrateCard(card: HTMLElement): void {
  const payload = readPayload(card);
  const termEl = card.querySelector<HTMLElement>('[data-field="term"]');
  if (termEl && payload) termEl.textContent = maskTerm(payload.term);

  const body = card.querySelector<HTMLElement>('[data-unlock-body]');
  if (body) {
    body.replaceChildren();
    body.hidden = true;
  }

  delete card.dataset.hydrated;
}

function unlockCard(card: HTMLElement, local = false): void {
  hydrateCard(card);
  card.classList.add('is-unlocked');
  if (local) card.dataset.localUnlock = '1';
}

function lockCard(card: HTMLElement): void {
  if (card.dataset.localUnlock) return;
  card.classList.remove('is-unlocked');
  dehydrateCard(card);
}

export function applyShowAll(showAll: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-needs-unlock="true"]').forEach((el) => {
    if (showAll) {
      unlockCard(el);
    } else {
      lockCard(el);
    }
  });
}

export function initVisibilityControls(): void {
  const toggle = document.querySelector<HTMLInputElement>('#show-all-toggle');
  const showAll = isShowAll();
  if (toggle) {
    toggle.checked = showAll;
    toggle.addEventListener('change', () => {
      const next = toggle.checked;
      setShowAll(next);
      applyShowAll(next);
    });
  }
  applyShowAll(showAll);

  document.querySelectorAll<HTMLButtonElement>('.reveal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest<HTMLElement>('[data-needs-unlock]');
      if (!card) return;
      unlockCard(card, true);
    });
  });
}
