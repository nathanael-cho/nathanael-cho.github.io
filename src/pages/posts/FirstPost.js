import { List, Stack, Text } from '@mantine/core';

import { postFramework } from './helper';


function FirstPost() {
    const content = (
        <Stack gap="md">
            <Text>
                My full name is Nathanael Andrew Cho.
                My first initial is N, and my middle initial is A. Together
                with my last name, you get Nacho!
            </Text>
            <Text>
                It made a first appearance on my kindergarten backpack, but it didn't catch on until high school.
            </Text>
            <Text>Responses to common questions:</Text>
            <List withPadding>
                <List.Item>Yes, I like nachos.</List.Item>
                <List.Item>Yes, I have seen <i>Nacho Libre</i>.</List.Item>
                <List.Item>No, Nacho is not my real name by birth.</List.Item>
            </List>
        </Stack>
    )
    
    return postFramework("Why is my nickname Nacho?", content);
}


export default FirstPost;
