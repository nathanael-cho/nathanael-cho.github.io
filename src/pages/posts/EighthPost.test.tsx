import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';

import EighthPost from './EighthPost';

// jsdom has no canvas, so the simulation's drawing is skipped; what this guards
// is that mounting it — model, animation loop, controls and all — does not throw,
// and that unmounting tears the loop down cleanly.
test('renders the heart simulation without any errors', () => {
    const { unmount } = render(
        <MantineProvider>
            <EighthPost date="August 10, 2026" />
        </MantineProvider>,
    );
    unmount();
});
