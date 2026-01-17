import { Blockquote, Stack, Text } from '@mantine/core';

import { postFramework } from './helper';


function FifthPost() {
    const content = (
        <Stack gap="md">
            <Text>
                On September 15th, 2025 we welcomed Collin Nathanael Cho as the newest member of our
                family. He measured in at 20 and 1/4 inches and 7 pounds 4 ounces.
            </Text>
            <Text>
                His first name Collin is a play on words on "calling." Calling has been a practice of the seekers
                of God since the third generation of mankind (Gen. 4:26). More than merely a practice,
                however, to call is to cry out to a wonderful Person. Throughout this journey, despite being frail
                and mortal men, by calling on the Lord we experienced the Lord as our source, strength,
                shepherd, friend, and so many other things.
            </Text>
            <Text>
                In the past months, we've enjoyed calling on the Lord in many songs. These are some of our
                highlights:
            </Text>
            <Stack gap="sm">
                <Blockquote>
                    How sweet the name of Jesus sounds<br />
                    In a believer's ear!<br />
                    It soothes his sorrow, heals his wounds,<br />
                    And drives away his fear. (Hymn 66)
                </Blockquote>
                <Blockquote>
                    Jesus! oh, how sweet the name,<br />
                    Jesus! every day the same;<br />
                    Jesus! let all saints proclaim,<br />
                    Its worthy praise forever. (Hymn 67)
                </Blockquote>
            </Stack>
            <Text>
                During our long stay in the hospital, we enjoyed singing a song together:
            </Text>
            <Blockquote>
                In moments like these I call on the Lord.<br />
                I call, O Lord Jesus, He saves me.
            </Blockquote>
            <Text>
                His middle name Nathanael is his father's name and means gift of God. The Lord gave Collin to
                us, and we'd like to give him back to the Lord. Our prayer is that he would be a caller on the
                precious name of our Lord.
            </Text>
        </Stack>
    )

    return postFramework("How We Named Our Son", content);
}


export default FifthPost;
