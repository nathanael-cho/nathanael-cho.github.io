import { Center, Container, Image, Space, } from '@mantine/core';


function Home() {
    return (
        <Container size="md">
            <Center>
                <Image
                    radius="md"
                    src='/dalle-home-page-painting.webp'
                    className='feature-image'
                />
            </Center>
            <Space h={10} />
            <Center>Welcome to my personal blog!</Center>
        </Container>
    )
}


export default Home;
