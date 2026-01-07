import {
  ActionIcon,
  Anchor,
  AppShell,
  Burger,
  Group,
  NavLink,
  Paper,
  Stack,
  Text,
} from '@mantine/core';
import { useDisclosure, useHash } from '@mantine/hooks';
import { IconArrowLeft, IconArrowRight, IconBook, IconTriangle } from '@tabler/icons-react';

import Home from './pages/Home';
import AboutMe from './pages/AboutMe';
import FirstPost from './pages/posts/FirstPost';
import SecondPost from './pages/posts/SecondPost';
import ThirdPost from './pages/posts/ThirdPost';
import FourthPost from './pages/posts/FourthPost';

import '@mantine/core/styles.css';
import './App.css';


const posts = [
  {
    id: 'post-1',
    title: 'Why is my nickname Nacho?',
    icon: IconBook,
    component: FirstPost,
  },
  {
    id: 'post-2',
    title: 'The Research Triangle (Part 1)',
    icon: IconTriangle,
    component: SecondPost,
  },
  {
    id: 'post-3',
    title: 'The Research Triangle (Part 2)',
    icon: IconTriangle,
    component: ThirdPost,
  },
  {
    id: 'post-4',
    title: 'The Research Triangle (Part 3)',
    icon: IconTriangle,
    component: FourthPost,
  },
];


const getContent = (hash) => {
  if (hash === '#about-me') return <AboutMe />;
  if (hash === '#home' || !hash) return <Home />;

  const post = posts.find((p) => `#${p.id}` === hash);
  return post ? <post.component /> : <Home />;
};


function PostNavigation({ hash }) {
  const index = posts.findIndex((p) => `#${p.id}` === hash);
  if (index === -1) return null;

  const prev = posts[index - 1];
  const next = posts[index + 1];

  const paperWidth = 240;

  return (
    <Group
      justify="space-between"
      px="md"
    >
      {prev ? (
        <Paper
          component="a"
          href={`#${prev.id}`}
          withBorder
          radius="md"
          p="md"
          style={{ maxWidth: paperWidth, flex: 1 }}
        >
          <Group gap="sm">
            <ActionIcon variant="light">
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div>
              <Text size="md" c="dimmed">
                Previous
              </Text>
              <Text fw={600}>{prev.label}</Text>
            </div>
          </Group>
        </Paper>
      ) : (
        <div style={{ flex: 1 }} />
      )}

      {next ? (
        <Paper
          component="a"
          href={`#${next.id}`}
          withBorder
          radius="md"
          p="md"
          style={{ maxWidth: paperWidth, flex: 1, textAlign: 'right' }}
        >
          <Group gap="sm" justify="flex-end">
            <div>
              <Text size="md" c="dimmed">
                Next
              </Text>
              <Text fw={600}>{next.label}</Text>
            </div>
            <ActionIcon variant="light">
              <IconArrowRight size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      ) : (
        <div style={{ flex: 1 }} />
      )}
    </Group>
  );
};


const App = () => {
  const [opened, { close, toggle }] = useDisclosure();
  const [hash,] = useHash();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        // The width is 100% when the viewport is smaller than the breakpoint
        width: 400,
        breakpoint: 'md',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      padding="md"
    >
      <AppShell.Header p="md" style={{ background: '#aed6f1' }}>
        <Group justify="space-between" h="100%">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
            />

            <Anchor href="#home" fw={600}>
              Home
            </Anchor>

            <Anchor href="#about-me" fw={600}>
              About Me
            </Anchor>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {posts.map((post, index) => (
          <NavLink
            key={post.id}
            href={`#${post.id}`}
            label={`${index + 1}. ${post.title}`}
            leftSection={<post.icon />}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack>
          {getContent(hash)}
          <PostNavigation hash={hash} />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
