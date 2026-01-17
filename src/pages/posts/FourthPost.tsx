import { useEffect, useState } from 'react';
import { Anchor, Stack, Text } from '@mantine/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Latex from 'react-latex';

import { postFramework, PostProps } from './helper';


function FourthPost({ date }: PostProps): JSX.Element {
    const [code, setCode] = useState<string>('');

    useEffect(() => {
        fetch('/python_files/research_triangle_part_3.py')
        .then(res => res.text())
        .then(setCode);
    }, []);

    const content = (
        <Stack gap="md">
            <Text>
                We now come to the final part which addresses the initial question:
            </Text>

            <Text fw="bold">
                Given three distinct
                points in a plane, what is the minimum distance we can
                move the points such that the triangle
                formed by the points is equilateral?
            </Text>

            <Text>
                <Latex>
                    Let $a$, $b$, and $c$ be the vertices of the original triangle,
                    and let $a'$, $b'$, and $c'$ be the vertices of the optimal equilateral triangle.
                    As with Part 2, our goal is to find some hidden structure in the problem
                    so that we're not optimizing over six variables (i.e., the $x$ and $y$ values of the three coordinates).
                </Latex>
            </Text>

            <Text>
                <Latex>
                    We can reduce from six variables to four variables as follows. We define an equilateral triangle by its
                    translation $[l, m]$ of its centroid/circumcenter from the origin, the circumradius $r$ of its circumcircle, and
                    rotation $\theta$ of the triangle
                    about its circumcenter. We define $0^\circ$ to be when the triangle
                    has a vertex directly above the centroid.
                </Latex>
            </Text>

            <Text>
                <Latex>
                    Can we do better? Let $x$, $y$, and $z$ represent the vectors of the three vertices of an equilateral triangle
                    relative to its centroid at $(l, m)$. In other words, the vertices of the equilateral triangle are $x + (l, m)$,
                    $y + (l, m)$, and $z + (l, m)$. It follows that $x$, $y$, and $z$ uniquely depend on $\theta$ and $r$. We pair
                    up $x$ with $a$, $y$ with $b$, and $z$ with $c$ (in our final algorithm we need make sure that assignments
                    from $x$/$y$/$z$ to $a$/$b$/$c$ are covered). The sum of the distance between the points is:
                </Latex>
            </Text>

            <Text>
                <Latex displayMode>{
                    '$||x + [l, m] - a|| + ||y + [l, m] - b|| + ||z + [l, m] - c||$'
                }</Latex>
                <Latex displayMode>{
                    '$= ||[l, m] - (a - x)|| + ||[l, m] - (b - y)|| + ||[l, m] - (c - z)||$'
                }</Latex>
            </Text>

            <Text>
                <Latex>In other words, we want to find the optimal sum of distances of $(l, m)$ from the points represented
                by the vectors $a - x$, $b - y$, and $c - z$. This is simply the geometric median, and there is
                a lovely algorithm to find it</Latex>, <Anchor href="https://en.wikipedia.org/wiki/Geometric_median" target="_blank" rel="noopener noreferrer">Weiszfeld's algorithm</Anchor>.
            </Text>

            <Text>
                <Latex>
                    Putting all that together, if we pick $\theta$ and $r$ and calculate $x$, $y$, and $z$, there's an algorithm to find the optimal values
                    of $l$ and $m$. Thus, we've successfully reduced the problem to a two-dimensional optimization.
                </Latex>
            </Text>

            <Text>
                <Latex>
                    Below is a Python program that implements the final algorithm. We change up the "handedness" of how we
                    assign $x$/$y$/$z$ to $a$/$b$/$c$, and we also range $\theta$ from 0 to $2\pi$
                </Latex>:
            </Text>

            <SyntaxHighlighter language="python" style={coy}>
                {code}
            </SyntaxHighlighter>

            <Text>
                Experimentally, I found that most of the time, the distance we moved the points does not improve whether we're allowed to move one, two, or three
                points. I started to look into it, but I gave up partway through and leave it as an exercise for the reader. If you have any insights,
                feel free to send them my way. My personal biography page has my LinkedIn profile which has my email. I'm somewhat paranoid that if I post my email here directly,
                I'm going to get spammed one day.
            </Text>
        </Stack>
    )
    
    return postFramework("The Research Triangle (Part 3)", content, date);
}


export default FourthPost;
