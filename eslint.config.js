import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['build', 'coverage', 'node_modules', 'public'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Closures created inside a loop that read a variable the loop mutates.
      // Not in eslint:recommended, but it is the rule that caught a real bug in
      // the pressure-trace labelling, so it is on deliberately.
      'no-loop-func': 'error',

      // tsc already reports unused locals and parameters, and does it with more
      // context; leaving both on means every one is reported twice.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // The simulations are written against a canvas and a fixed timestep, where
  // bitwise truncation and non-null assertions on freshly-checked values are
  // ordinary rather than suspicious.
  {
    files: ['src/components/heart*.ts', 'src/components/*Simulation.tsx'],
    rules: {
      'no-bitwise': 'off',
    },
  },

  // Vitest injects its globals, and the test files legitimately assert on
  // values they have just proven are present.
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Node scripts and config files, which run outside the browser.
  {
    files: ['**/*.cjs', 'vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
