import { Container, Image, List, Space, Text, Title } from '@mantine/core';


function FirstPost() {
    return (
        <Container size="md">
            <Title>Why is my nickname Nacho?</Title>
            <Space h="md" />
            <Text>
                My full name is Nathanael Andrew Cho.
                My first initial is N, and my middle initial is A. Together
                with my last name, you get Nacho!
            </Text>
            <Space h="md" />
            <Text>
                It made a first appearance on my kindergarten backpack, but it didn't catch on until high school.
            </Text>
            <Space h="md" />
            <Text>Responses to common questions:</Text>
            <List withPadding>
                <List.Item>Yes, I like nachos.</List.Item>
                <List.Item>Yes, I have seen <i>Nacho Libre</i>.</List.Item>
                <List.Item>No, Nacho is not my real name by birth.</List.Item>
            </List>
            <Space h="md" />
            <Image
                radius="md"
                src='/nacho-eating-nachos.webp'
                className='feature-image'
            />
        </Container>
    )
}


export default FirstPost;
