import { render } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import App from './App';

test('renders App without any errors', () => {
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );
});
