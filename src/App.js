import { AppShell, Burger, Center, Container, Image, List, NavLink, Space, Text, Title } from '@mantine/core';
import { useDisclosure, useHash } from '@mantine/hooks';
import { IconBook, IconHome, IconUserCircle } from '@tabler/icons-react';

import '@mantine/core/styles.css';
import './App.css';

function HomeContent() {
  return (
    <Container size="md">
      <Center>
        <Image
          radius="md"
          src='/dalle-home-page-painting.webp'
          className='feature-image'
        />
      </Center>
      <Space h={10}/>
      <Center>Welcome to my personal blog!</Center>
      </Container>
  )
}

function AboutMe() {
  return (
    <Container size="md">
      <Title>About Me</Title>
      <Space h="md"/>
      <Text>
        My name is Nathanael Cho, and I am a software developer in the finance industry with a passion for mathematics. You can click on the link below to see what I look like!
      </Text>
      <Space h="md"/>
      <a href="https://www.linkedin.com/in/nathanael-a-cho/">LinkedIn</a>
    </Container>
  )
}

function FirstPost() {
  return (
    <Container size="md">
      <Title>Why is my nickname Nacho?</Title>
      <Space h="md"/>
      <Text>
        My full name is Nathanael Andrew Cho.
        My first initial is N, and my middle initial is A. Together
        with my last name, you get Nacho!
      </Text>
      <Space h="md"/>
      <Text>
        It made a first appearance on my kindergarten backpack, but it didn't catch on until high school.
      </Text>
      <Space h="md"/>
      <Text>Responses to common questions:</Text>
      <List withPadding>
        <List.Item>Yes, I like nachos.</List.Item>
        <List.Item>Yes, I have seen <i>Nacho Libre</i>.</List.Item>
        <List.Item>No, Nacho is not my real name by birth.</List.Item>
      </List>
      <Space h="md"/>
      <Image
        radius="md"
        src='/nacho-eating-nachos.webp'
        className='feature-image'
      /> 
    </Container>
  )
}

function App() {
  const [opened, { close, toggle }] = useDisclosure();
  const [hash,] = useHash();

  let mainContent;
  if (hash === '#post-1') {
    mainContent = <FirstPost/>;
  } else if (hash === '#about-me') {
    mainContent = <AboutMe/>;
  } else {
    mainContent = <HomeContent/>;
  }

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
      <AppShell.Header p="md" style={{background: '#aed6f1'}}>
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
          leftSection={<IconHome/>}
          onClick={close}
        />
        <NavLink
          href="#about-me"
          label="About Me"
          leftSection={<IconUserCircle/>}
          onClick={close}
        />
        <NavLink
          href="#post-1"
          label="1. Why is my nickname Nacho?"
          leftSection={<IconBook/>}
          onClick={close}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        {mainContent}
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
