import { AppShell, Burger, NavLink } from '@mantine/core';
import { useDisclosure, useHash } from '@mantine/hooks';
import { IconBook, IconHome, IconTriangle, IconUserCircle } from '@tabler/icons-react';

import Home from './pages/Home';
import AboutMe from './pages/AboutMe';
import FirstPost from './pages/posts/FirstPost';
import SecondPost from './pages/posts/SecondPost';

import '@mantine/core/styles.css';
import './App.css';


function getContent(hash) {
  if (hash === '#post-1') {
    return <FirstPost />;
  } else if (hash === '#post-2') {
    return <SecondPost />;
  } else if (hash === '#about-me') {
    return <AboutMe />;
  } else {
    return <Home />;
  }
}


function App() {
  const [opened, { close, toggle }] = useDisclosure();
  const [hash,] = useHash();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        // The width is 100% when the viewport is smaller than the breakpoint
        width: 300,
        breakpoint: 'md',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
    >
      <AppShell.Header p="md" style={{ background: '#aed6f1' }}>
        <Burger
          opened={opened}
          onClick={toggle}
          size="sm"
        />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          href="#home"
          label="Home"
          leftSection={<IconHome />}
          onClick={close}
        />
        <NavLink
          href="#about-me"
          label="About Me"
          leftSection={<IconUserCircle />}
          onClick={close}
        />
        <NavLink
          href="#post-1"
          label="1. Why is my nickname Nacho?"
          leftSection={<IconBook />}
          onClick={close}
        />
        <NavLink
          href="#post-2"
          label="2. The Research Triangle"
          leftSection={<IconTriangle />}
          onClick={close}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        {getContent(hash)}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
