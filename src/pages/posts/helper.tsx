import { ReactNode } from 'react';
import { Container, Stack, Title } from '@mantine/core';


export function postFramework(title: string, body: ReactNode): JSX.Element {
    return (
        <Container size="lg">
            <Stack>
                <Title>{title}</Title>
                {body}
            </Stack>
        </Container>
    );
}
