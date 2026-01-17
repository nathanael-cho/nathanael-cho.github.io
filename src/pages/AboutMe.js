import { Container, Space, Text, Title } from '@mantine/core';


function AboutMe() {
    return (
        <Container size="md">
            <Title>About Me</Title>
            <Space h="md" />
            <Text>
                My name is Nathanael Cho, and I am a software developer in the finance industry with a passion for mathematics. You can click on the link below to see what I look like!
            </Text>
            <Space h="md" />
            <a href="https://www.linkedin.com/in/nathanael-a-cho/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </Container>
    )
}


export default AboutMe;
