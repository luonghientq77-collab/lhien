// Workaround for "Cannot set property fetch of #<Window> which has only a getter"
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    enumerable: true,
    get: () => originalFetch,
    set: () => {
      // Ignore attempts to overwrite fetch
    }
  });
} catch (e) {
  console.warn("Could not redefine window.fetch", e);
}
