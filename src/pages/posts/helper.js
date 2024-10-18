import { Container, Space, Title } from '@mantine/core';


export function postFramework(title, body) {
    return (
        <Container size="md">
            <Title>{title}</Title>
            <Space h="md" />
            {body}
        </Container>
    )
}
