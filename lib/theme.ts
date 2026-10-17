export type AccentTheme = 'orange' | 'purple';
export const themeStorageKey = 'liftide-accent';

// Apply the saved accent before paint; the app always uses dark surfaces.
export const themeInitScript = `document.documentElement.dataset.theme='dark';try{document.documentElement.dataset.accent=localStorage.getItem('${themeStorageKey}')==='purple'?'purple':'orange'}catch{document.documentElement.dataset.accent='orange'}`;
