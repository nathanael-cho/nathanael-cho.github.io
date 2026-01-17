import { useEffect, useState } from 'react';
import { Stack, Text } from '@mantine/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { postFramework } from './helper';

const Latex = require('react-latex');


function ThirdPost() {
    const [code, setCode] = useState('');

    useEffect(() => {
        fetch('/python_files/research_triangle_part_2.py')
        .then(res => res.text())
        .then(setCode);
    }, []);

    const content = (
        <Stack gap="md">
            <Text>
                The case where we could only move one point is very straightforward. We move onto the next case:
            </Text>

            <Text fw="bold">
                Given three distinct
                points in a plane, what is the minimum distance we can
                move <i>any two points</i> such that the triangle
                formed by the points is equilateral?
            </Text>

            <Text>
                Let <Latex>$a = (x_a, y_a), b = (x_b, y_b), x_3 = (x_c, y_c)$</Latex> be
                the three points. We choose to fix <Latex>$c$</Latex> and
                choose to move <Latex>$a$</Latex> and <Latex>$b$</Latex>.
                In the final algorithm, we'll switch which point we fix and which points we move.
                Let <Latex>$a'$</Latex> denote where we move <Latex>$a$</Latex> to, and
                let <Latex>$b'$</Latex> denote where we move <Latex>$b$</Latex> to.
            </Text>

            <Text>
                It appears that we are moving two points around, but we can simplify the problem by noting,
                similar to Part 1, that if we fix <Latex>$a'$</Latex> then there are only two possible locations
                for <Latex>$b'$</Latex>. We can write <Latex>$b$</Latex> out
                as <Latex>{'$c + R_{\\pm\\pi/3} (a\' - c)$'}</Latex> where <Latex>{'$R_{\\pm\\pi/3}$'}</Latex> equals:
            </Text>

            <Text>
                <Latex displayMode>{
                    '$$\\begin{pmatrix} \\cos(\\pm\\frac{\\pi}{3}) & -\\sin(\\pm\\frac{\\pi}{3}) \\\\'
                    + '\\sin(\\pm\\frac{\\pi}{3}) & \\cos(\\pm\\frac{\\pi}{3}) \\end{pmatrix}$$'
                }</Latex>
            </Text>

            <Text>
                <Latex>{`
                    We'll then make a change in notation. We will rewrite $a'$ as the
                    expression $a + tv$ where $t$ is some scalar
                    and $v$ is a two dimensional unit vector that we can summarize in a single parameter $\\theta$. We can then
                    rewrite $b'$ as $c + R_{\\pm\\pi/3} (a + tv - c)$.
                `}</Latex>
            </Text>

            <Text>
                We now write out the equation(s) that represents what we want to minimize:
            </Text>

            <Text>
                <Latex displayMode>{
                    '$||a\' - a|| + ||b\' - b||$'
                }</Latex>
                <Latex displayMode>{
                    '$= ||tv|| + ||c + R_{\\pm\\pi/3} (a + tv - c) - b||$'
                }</Latex>
            </Text>

            <Text>
                It is possible to take the derivative of this with respect to <Latex>$t$ and $v$</Latex> and set it equal to zero.
                However, we quicky find that
                a closed-form analytical solution becomes hairy. Thankfully, there are
                numerical approximations that we can do in code, although the pure mathematicians among us may roll
                their eyes. Below is an example Python program of the final algorithm that includes what we mentioned above. We switch
                which point is fixed then pick the best configuration:
            </Text>

            <SyntaxHighlighter language="python" style={coy}>
                {code}
            </SyntaxHighlighter>

            <Text>
                There are probably ways to optimize the optimization and make it work better, but we will
                leave that out of the scope of this post. That concludes Part 2. Onwards to Part 3!
            </Text>
        </Stack>
    )
    
    return postFramework("The Research Triangle (Part 2)", content);
}


export default ThirdPost;
