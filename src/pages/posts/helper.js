import { Container, Stack, Title } from '@mantine/core';


export function postFramework(title, body) {
    return (
        <Container size="lg">
            <Stack>
                <Title>{title}</Title>
                {body}
            </Stack>
        </Container>
    )
}
