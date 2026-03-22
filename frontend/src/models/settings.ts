export interface AppSettings {
  videoMaxDuration: number;
  thumbnailMaxSize: number;
}

const STORAGE_KEY = 'sm_settings';

const DEFAULTS: AppSettings = {
  videoMaxDuration: 60,
  thumbnailMaxSize: 480,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
