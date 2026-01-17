import { ComponentType } from 'react';
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
  useComputedColorScheme,
  useMantineColorScheme,
  useMantineTheme,
} from '@mantine/core';
import { useDisclosure, useHash } from '@mantine/hooks';
import { IconArrowLeft, IconArrowRight, IconBabyCarriage, IconChefHat, IconMoon, IconSun, IconTriangle, TablerIcon } from '@tabler/icons-react';

import Home from './pages/Home';
import AboutMe from './pages/AboutMe';
import FirstPost from './pages/posts/FirstPost';
import SecondPost from './pages/posts/SecondPost';
import ThirdPost from './pages/posts/ThirdPost';
import FourthPost from './pages/posts/FourthPost';
import FifthPost from './pages/posts/FifthPost';
import { PostProps } from './pages/posts/helper';

import '@mantine/core/styles.css';
import './App.css';

interface Post {
  id: string;
  title: string;
  date: Date;
  icon: TablerIcon;
  component: ComponentType<PostProps>;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const posts: Post[] = [
  {
    id: 'post-1',
    title: 'Why is my nickname Nacho?',
    date: new Date(2024, 8, 20), // September 20, 2024
    icon: IconChefHat,
    component: FirstPost,
  },
  {
    id: 'post-2',
    title: 'The Research Triangle (Part 1)',
    date: new Date(2024, 9, 18), // October 18, 2024
    icon: IconTriangle,
    component: SecondPost,
  },
  {
    id: 'post-3',
    title: 'The Research Triangle (Part 2)',
    date: new Date(2025, 11, 25), // December 25, 2025
    icon: IconTriangle,
    component: ThirdPost,
  },
  {
    id: 'post-4',
    title: 'The Research Triangle (Part 3)',
    date: new Date(2025, 11, 28), // December 28, 2025
    icon: IconTriangle,
    component: FourthPost,
  },
  {
    id: 'post-5',
    title: 'How We Named Our Son',
    date: new Date(2026, 0, 17), // January 17, 2026
    icon: IconBabyCarriage,
    component: FifthPost,
  },
];


const getContent = (hash: string): JSX.Element => {
  if (hash === '#about-me') return <AboutMe />;
  if (hash === '#home' || !hash) return <Home />;

  const post = posts.find((p) => `#${p.id}` === hash);
  return post ? <post.component date={formatDate(post.date)} /> : <Home />;
};


interface PostNavigationProps {
  hash: string;
}

function PostNavigation({ hash }: PostNavigationProps): JSX.Element | null {
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
            <Text size="md" c="dimmed">
              Previous
            </Text>
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
            <Text size="md" c="dimmed">
              Next
            </Text>
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


const App = (): JSX.Element => {
  const [opened, { close, toggle }] = useDisclosure();
  const [hash,] = useHash();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  const theme = useMantineTheme();
  const isDark = computedColorScheme === 'dark';
  const headerBg = isDark ? theme.colors['brand-dark'][6] : theme.colors['brand-light'][3];
  const headerTextColor = isDark ? theme.colors['brand-light'][3] : theme.colors['brand-dark'][6];

  const toggleColorScheme = () => {
    setColorScheme(isDark ? 'light' : 'dark');
  };

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
      <AppShell.Header style={{ background: headerBg }}>
        <Group justify="space-between" h="100%" px="md">
          <Group align="center">
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              color={headerTextColor}
            />

            <Anchor href="#home" fw="bold" c={headerTextColor}>
              Home
            </Anchor>

            <Anchor href="#about-me" fw="bold" c={headerTextColor}>
              About Me
            </Anchor>
          </Group>

          <ActionIcon
            variant="subtle"
            onClick={toggleColorScheme}
            size="lg"
            c={headerTextColor}
          >
            {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
          </ActionIcon>
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
