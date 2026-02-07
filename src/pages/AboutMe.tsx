import { Anchor, Container, Stack, Text, Title } from '@mantine/core';


function AboutMe(): JSX.Element {
    return (
        <Container size="md">
            <Stack>
                <Title>About Me</Title>
                <Text>
                    My name is Nathanael Cho, and I am a software developer in the financial industry.
                    I live in Cambridge, MA with my family. I got my bachelor's degree in computer science
                    from Harvard.
                    After college, I worked at Amazon for a year,
                    took a three-year hiatus to work with a Christian nonprofit and participate in
                    their Bible truth and service program,
                    then joined HarbourVest at the end
                    of 2023.
                </Text>
                <Text>
                    What do I love? First and foremost, I love the Lord Jesus! I'm not ashamed to say
                    that my life is for Him
                    and <Anchor c="blue" href="https://gospel.biblesforamerica.org/the-big-question/" target="_blank" rel="noopener noreferrer">His purpose</Anchor>:
                    to gain a corporate expression among man
                    by coming into us as the Spirit to be our life and everything,
                    and to bring His kingdom to the earth.
                </Text>
                <Text>
                    I love to code! When I took my first computer science class, I had a rough time,
                    but with the help of my professors and classmates I grew to enjoy the problem-solving
                    nature
                    of the field. I'm grateful to have ended up in a place where I love what I do
                    for work and am excited for the problems that lie in wait each day.
                </Text>
                <Text>
                    I love mathematics! Although
                    I ultimately studied computer science, I took a number of
                    upper-level courses such as Real Analysis, Abstract Algebra, and Number Theory.
                    I participated in numerous competitions growing up
                    such as the AMC 8/10/12, and I have completed 140 problems
                    on <Anchor c="blue" href="https://projecteuler.net/" target="_blank" rel="noopener noreferrer">Project Euler</Anchor> (as of Jan. 2026).
                </Text>
                <Text>
                    I love to run! I live by the Charles River which has lovely trails on either side to run along.
                </Text>
                <Text fs="italic">
                    Disclaimer: The views expressed in this blog are my own and do not represent those of my employer.
                    I collaborate with AI when writing technical posts, so I cannot take full (any?)
                    credit for the insights therein.
                </Text>
                <Stack gap="xs">
                    <Anchor c="blue" href="mailto:nathanael.a.cho@gmail.com">nathanael.a.cho@gmail.com</Anchor>
                    <Anchor c="blue" href="https://www.linkedin.com/in/nathanael-a-cho/" target="_blank" rel="noopener noreferrer">LinkedIn</Anchor>
                    <Anchor c="blue" href="https://github.com/nathanael-cho" target="_blank" rel="noopener noreferrer">GitHub</Anchor>
                    <Anchor c="blue" href="https://soundcloud.com/n-a-cho" target="_blank" rel="noopener noreferrer">SoundCloud</Anchor>
                </Stack>
            </Stack>
        </Container>
    )
}


export default AboutMe;
