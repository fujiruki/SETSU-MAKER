type Section = 'recent' | 'favorites' | 'all' | 'tags';

export function useDashboardViewModel(pathname: string): {
  activeSection: Section;
  activeNavItem: string;
} {
  const activeSection: Section =
    pathname === '/favorites' ? 'favorites' :
    pathname === '/notes'     ? 'all' :
    pathname === '/tags'      ? 'tags' : 'recent';

  const activeNavItem =
    activeSection === 'favorites' ? '/favorites' :
    activeSection === 'all'       ? '/notes' :
    activeSection === 'tags'      ? '/tags' : '/app';

  return { activeSection, activeNavItem };
}
