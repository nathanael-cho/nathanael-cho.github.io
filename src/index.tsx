import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, MantineProvider } from '@mantine/core';

import App from './App';

import './index.css';

const theme = createTheme({
  /** Put your mantine theme override here */
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </MantineProvider>
);
