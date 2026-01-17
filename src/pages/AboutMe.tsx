import { Anchor, Container, Space, Stack, Text, Title } from '@mantine/core';


function AboutMe(): JSX.Element {
    return (
        <Container size="md">
            <Title>About Me</Title>
            <Space h="md" />
            <Text>
                My name is Nathanael Cho, and I am a software developer in the finance industry with a passion for mathematics.
            </Text>
            <Space h="md" />
            <Stack gap="xs">
                <Anchor href="mailto:nathanael.a.cho@gmail.com">nathanael.a.cho@gmail.com</Anchor>
                <Anchor href="https://www.linkedin.com/in/nathanael-a-cho/" target="_blank" rel="noopener noreferrer">LinkedIn</Anchor>
                <Anchor href="https://github.com/nathanael-cho" target="_blank" rel="noopener noreferrer">GitHub</Anchor>
            </Stack>
        </Container>
    )
}


export default AboutMe;
