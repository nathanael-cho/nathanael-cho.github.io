// Test setup, run before every suite.
//
// jsdom implements neither of these, and both are required just to mount the
// app: Mantine reads the colour scheme through matchMedia, and the canvas
// simulations watch their container with a ResizeObserver.

if (!window.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!window.ResizeObserver) {
    window.ResizeObserver = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    };
}
