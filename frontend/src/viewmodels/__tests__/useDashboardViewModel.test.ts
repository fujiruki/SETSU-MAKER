import { describe, it, expect } from 'vitest';
import { useDashboardViewModel } from '../useDashboardViewModel';

describe('useDashboardViewModel', () => {
  it('/app → activeSection: recent, activeNavItem: /app', () => {
    const { activeSection, activeNavItem } = useDashboardViewModel('/app');
    expect(activeSection).toBe('recent');
    expect(activeNavItem).toBe('/app');
  });

  it('/favorites → activeSection: favorites, activeNavItem: /favorites', () => {
    const { activeSection, activeNavItem } = useDashboardViewModel('/favorites');
    expect(activeSection).toBe('favorites');
    expect(activeNavItem).toBe('/favorites');
  });

  it('/notes → activeSection: all, activeNavItem: /notes', () => {
    const { activeSection, activeNavItem } = useDashboardViewModel('/notes');
    expect(activeSection).toBe('all');
    expect(activeNavItem).toBe('/notes');
  });

  it('/tags → activeSection: tags, activeNavItem: /tags', () => {
    const { activeSection, activeNavItem } = useDashboardViewModel('/tags');
    expect(activeSection).toBe('tags');
    expect(activeNavItem).toBe('/tags');
  });

  it('不明パス → activeSection: recent にフォールバック', () => {
    const { activeSection, activeNavItem } = useDashboardViewModel('/unknown');
    expect(activeSection).toBe('recent');
    expect(activeNavItem).toBe('/app');
  });
});
