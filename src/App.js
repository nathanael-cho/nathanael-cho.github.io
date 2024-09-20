import './App.css';
import { AppShell, Burger, Center, Image, NavLink, Space, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IconBook, IconHome } from '@tabler/icons-react';

import '@mantine/core/styles.css';

function HomeContent() {
  return (
    <div>
      <Center>
        <Image
          radius="md"
          src='/dalle-home-page-painting.webp'
          style={{width: 500}}
        />
      </Center>
      <Space h={10}/>
      <Center>Welcome to my personal blog!</Center>
      </div>
  )
}

function FirstPost() {
  return (
    <div>
      <Title>Why is my nickname Nacho?</Title>
      <Space h="md"/>
      <Text>
        My full name is Nathanael Andrew Cho.
        My first initial is N, and my middle initial is A. Together
        with my last name, you get Nacho!
      </Text>
    </div>
  )
}

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
      <AppShell.Header p="md" style={{background: '#aed6f1'}}>
        <Burger
          opened={opened}
          onClick={toggle}
          size="sm"
        />
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          href="/"
          label="Home"
          leftSection={<IconHome/>}
        />
        <NavLink
          href="/post-1"
          label="Why is my nickname Nacho?"
          leftSection={<IconBook/>}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeContent/>}/>
            <Route path="/post-1" element={<FirstPost/>}/>
          </Routes>
        </BrowserRouter>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
