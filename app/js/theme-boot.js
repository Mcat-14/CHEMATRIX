// Apply the system theme before first paint to avoid a flash; saved settings load later from IndexedDB.
try { if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark'; } catch (e) { /* ignore */ }
