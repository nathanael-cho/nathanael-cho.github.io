import React from 'react';
import ReactDOM from 'react-dom/client';
import { createTheme, MantineProvider, virtualColor } from '@mantine/core';

import App from './App';

import './index.css';

const theme = createTheme({
  colors: {
    'brand-light': [
      '#f0f8fc', '#dceef7', '#c5e3f2', '#aed6f1', '#97c9e6',
      '#7fbcdb', '#67afd0', '#4fa2c5', '#3795ba', '#1f88af'
    ],
    'brand-dark': [
      '#e8f0f5', '#c5d8e5', '#a2c0d5', '#7fa8c5', '#5c90b5',
      '#3978a5', '#1a4971', '#15405f', '#10374d', '#0b2e3b'
    ],
    primary: virtualColor({
      name: 'primary',
      dark: 'brand-light',
      light: 'brand-dark',
    }),
  },
  primaryColor: 'primary',
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <MantineProvider theme={theme} defaultColorScheme="auto">
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </MantineProvider>
);
