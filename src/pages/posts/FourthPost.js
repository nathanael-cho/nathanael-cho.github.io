import { useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { postFramework } from './helper';

const Latex = require('react-latex');


function FourthPost() {
    const [code, setCode] = useState('');

    useEffect(() => {
        fetch('/python_files/research_triangle_part_3.py')
        .then(res => res.text())
        .then(setCode);
    }, []);

    const content = (
        <div>
            <p>
                We now come to the final part which addresses the initial question:
            </p>

            <p><b>
                Given three distinct
                points in a plane, what is the minimum distance we can
                move the points such that the triangle
                formed by the points is equilateral?
            </b></p>

            <p>
                Let <Latex>$a$, $b$, and $c$</Latex> be the vertices of the original triangle,
                and let <Latex>$a'$, $b'$, and $c'$</Latex> be the vertices of the optimal equilateral triangle.
                As with Part 2, our goal is to find some hidden structure in the problem
                so that we're not optimizing over six variables.
            </p>

            <p>
                TODO!
            </p>

            <p>
                Below is a Python program that implements the final algorithm:
            </p>

            <p>
                <SyntaxHighlighter language="python" style={coy}>
                    {code}
                </SyntaxHighlighter>
            </p>
        </div>
    )
    
    return postFramework("The Research Triangle (Part 3)", content);
}


export default FourthPost;
