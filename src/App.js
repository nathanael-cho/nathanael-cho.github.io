import './App.css';
import { AppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import '@mantine/core/styles.css';

function App() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'md',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Burger
          opened={opened}
          onClick={toggle}
          size="md"
        />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        Post 1
      </AppShell.Navbar>

      <AppShell.Main>
        This is my blog!
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
