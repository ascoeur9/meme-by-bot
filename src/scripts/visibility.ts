import { maskTerm, platformLabel, type MemeSource, type UnlockPayload } from '../lib/meme';

const STORAGE_KEY = 'meme-by-bot:show-all';

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

function readPayload(card: HTMLElement): UnlockPayload | null {
  const el = card.querySelector<HTMLScriptElement>('script[type="application/json"][data-unlock-payload]');
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as UnlockPayload;
  } catch {
    return null;
  }
}

function appendSourceItem(list: HTMLUListElement, s: MemeSource): void {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = s.url;
  a.textContent = s.label;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  li.appendChild(a);
  const tag = platformLabel(s.platform);
  if (tag) {
    const plat = document.createElement('span');
    plat.className = 'source-platform';
    plat.textContent = tag;
    li.appendChild(document.createTextNode(' '));
    li.appendChild(plat);
  }
  list.appendChild(li);
}

function renderSources(container: HTMLElement, sources: MemeSource[]): void {
  container.replaceChildren();
  container.className = 'sources';
  if (!sources.length) return;
  const label = document.createElement('span');
  label.className = 'sources-label';
  label.textContent = '출처';
  container.appendChild(label);
  const list = document.createElement('ul');
  list.className = 'sources-list';
  for (const s of sources) {
    appendSourceItem(list, s);
  }
  container.appendChild(list);
}

function hydrateListBody(body: HTMLElement, payload: UnlockPayload): void {
  body.replaceChildren();
  const meaning = document.createElement('p');
  meaning.className = 'meaning';
  meaning.textContent = payload.meaning;
  const example = document.createElement('p');
  example.className = 'example';
  const exLabel = document.createElement('span');
  exLabel.className = 'label';
  exLabel.textContent = '예';
  example.append(exLabel, document.createTextNode(` ${payload.example}`));
  body.append(meaning, example);
  if (payload.tags.length) {
    const tags = document.createElement('p');
    tags.className = 'tags';
    tags.textContent = payload.tags.join(' · ');
    body.append(tags);
  }
  if (payload.sources?.length) {
    const sources = document.createElement('div');
    renderSources(sources, payload.sources);
    body.append(sources);
  }
}

function hydrateDetailBody(body: HTMLElement, payload: UnlockPayload): void {
  body.replaceChildren();
  const dl = document.createElement('dl');
  dl.className = 'entry-dl';

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
  if (payload.tags.length) {
    addRow('태그', (dd) => {
      dd.className = 'tags';
      dd.textContent = payload.tags.join(' · ');
    });
  }
  if (payload.sources?.length) {
    addRow('출처', (dd) => {
      const list = document.createElement('ul');
      list.className = 'sources-list';
      for (const s of payload.sources!) {
        appendSourceItem(list, s);
      }
      dd.append(list);
    });
  }
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
