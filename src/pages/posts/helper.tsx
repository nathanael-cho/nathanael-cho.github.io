import { ReactNode } from 'react';
import { Container, Stack, Text, Title } from '@mantine/core';


export interface PostProps {
    date: string;
}

export function postFramework(title: string, body: ReactNode, date?: string): JSX.Element {
    return (
        <Container size="lg">
            <Stack>
                <div>
                    <Title>{title}</Title>
                    {date && <Text c="dimmed" size="sm">Published on {date}</Text>}
                </div>
                {body}
            </Stack>
        </Container>
    );
}
