import { useEffect, useState } from 'react';
import { List, Stack, Text } from '@mantine/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { postFramework } from './helper';

const Latex = require('react-latex');


function SecondPost() {
    const [code, setCode] = useState('');

        useEffect(() => {
            fetch('/python_files/research_triangle_part_1.py')
            .then(res => res.text())
            .then(setCode);
        }, []);

    const content = (
        <Stack gap="md">
            <Text>
                As per Wikipedia:
            </Text>
            <Text>
                "The Research Triangle [is a nickname] for a
                metropolitan area in the Piedmont region of the U.S. state of
                North Carolina. Anchored by the cities of Raleigh and Durham
                and the town of Chapel Hill, the region is home to three major
                research universities: North Carolina State University, Duke
                University, and the University of North Carolina at Chapel Hill,
                respectively."
            </Text>

            <Text>
                With a quick look at Google Maps, one can immediately see that the
                triangle formed by these three cities is not equilateral.
                What a letdown!
            </Text>

            <Text>
                Last week, I called a friend who lives in that area,
                and upon discovering this, we came up with the following question:
            </Text>
            <Text fw="bold">
                Given three distinct
                points in a plane, what is the minimum distance we can
                move the points such that the triangle
                formed by the points <i>is</i> equilateral?
            </Text>

            <Text>
                For this post, we start with a simplified version:
            </Text>

            <Text fw="bold">
                Given three distinct
                points in a plane, what is the minimum distance we can
                move <i>any one point</i> such that the triangle
                formed by the points is equilateral?
            </Text>

            <Text>
                Let <Latex>$a = (x_a, y_a), b = (x_b, y_b), x_3 = (x_c, y_c)$</Latex> be
                the three points which are also three vectors. To start, we choose to move <Latex>$a$</Latex>.
                We immediately notice that there are only two
                places <Latex>$a$</Latex> can move to such that the triangle is equilateral.
            </Text>

            <Text>
                What is a closed form for the coordinates of those two points?
                We call upon an old friend, the two-dimensional rotation
                matrix:
            </Text>
            <Text>
                <Latex displayMode>{
                    '$\\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\'
                    + '\\sin\\theta & \\cos\\theta \\end{pmatrix}$'
                }</Latex>
            </Text>

            <Text>
                We then have the following closed form
                for where <Latex>{'$a$'}</Latex> can move to:
            </Text>

            <Text>
                <Latex displayMode>{
                    '$$c +'
                    + '\\begin{pmatrix} \\cos\\pm\\frac{\\pi}{3} & -\\sin\\pm\\frac{\\pi}{3} \\\\'
                    + '\\sin\\pm\\frac{\\pi}{3} & \\cos\\pm\\frac{\\pi}{3} \\end{pmatrix}'
                    + '(b - c)$$'
                }</Latex>
            </Text>

            <Text>
                Said in words, we get the two possible locations for <Latex>{'$a$'}</Latex> by
                rotating <Latex>{'$b$'}</Latex> around <Latex>{'$c$'}</Latex> by <Latex>{'$\\frac{\\pi}{3}$'}</Latex> radians in both directions.
            </Text>

            <Text>
                To close out this first part, the way to get the minimum distance is as follows:
            </Text>

            <List type="ordered" withPadding>
                <List.Item>
                    For each of <Latex>{'$a, b, c$'}</Latex>, calculate the two
                    possible destinations.
                </List.Item>
                <List.Item>
                    For each of the two destinations, calculate the distance
                    to the original location.
                </List.Item>
                <List.Item>
                    Pick the original point/destination point pair
                    that minimizes the travel distance.
                </List.Item>
            </List>

            <Text>
                Here is Python code that implements it:
            </Text>

            <SyntaxHighlighter language="python" style={coy}>
                {code}
            </SyntaxHighlighter>
        </Stack>
    )
    
    return postFramework("The Research Triangle (Part 1)", content);
}


export default SecondPost;
