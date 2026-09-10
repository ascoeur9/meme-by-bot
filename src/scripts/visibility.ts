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

export function applyShowAll(showAll: boolean): void {
  document.querySelectorAll<HTMLElement>('[data-needs-unlock="true"]').forEach((el) => {
    if (showAll) {
      el.classList.add('is-unlocked');
    } else if (!el.dataset.localUnlock) {
      el.classList.remove('is-unlocked');
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
      card.classList.add('is-unlocked');
      card.dataset.localUnlock = '1';
    });
  });
}
