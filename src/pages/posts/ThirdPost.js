import { postFramework } from './helper';

const Latex = require('react-latex');


function ThirdPost() {
    const content = (
        <div>
            <p>
                The case where we could only move one point is very straightforward. We move onto the next case:
            </p>

            <p><b>
                Given three distinct
                points in a plane, what is the minimum distance we can
                move <i>any two points</i> such that the triangle
                formed by the points is equilateral?
            </b></p>

            <p>
                Let <Latex>$a = (x_a, y_a), b = (x_b, y_b), x_3 = (x_c, y_c)$</Latex> be
                the three points. Without loss of generality, we choose to fix <Latex>$c$</Latex> and
                choose to move <Latex>$a$</Latex> and <Latex>$b$</Latex>.
                Let <Latex>$a'$</Latex> denote where we move <Latex>$a$</Latex> to, and
                let <Latex>$b'$</Latex> denote where we move <Latex>$b$</Latex> to.
            </p>

            <p>
                It appears that we are moving two points around, but we can simplify the problem by noting,
                similar to Part 1, that if we fix <Latex>$a'$</Latex> then there are only two possible locations
                for <Latex>$b'$</Latex>. Furthermore, since we can move <Latex>$a$</Latex> all around the plane,
                we only need to consider the clockwise rotation of <Latex>$a'$</Latex> about <Latex>$c$</Latex>, since
                the counterclockwise case is covered if we move <Latex>$a'$</Latex> to that position and do a
                clockwise rotation back. We can write <Latex>$b$</Latex> out
                as <Latex>{'$c + R_{\\pi/3} (a\' - c)$'}</Latex> where <Latex>{'$R_{\\pi/3}$'}</Latex> equals:
            </p>

            <p>
                <Latex displayMode>{
                    '$$\\begin{pmatrix} \\cos\\frac{\\pi}{3} & -\\sin\\frac{\\pi}{3} \\\\'
                    + '\\sin\\frac{\\pi}{3} & \\cos\\frac{\\pi}{3} \\end{pmatrix}$$'
                }</Latex>
            </p>

            <p>
                We'll make one more change in notation. We will rewrite <Latex>$a'$</Latex> as the
                expression <Latex>$a + tv$</Latex> where <Latex>$t$</Latex> is some scalar
                and <Latex>$v$</Latex> is a two dimensional unit vector. We can then
                rewrite <Latex>$b'$</Latex> as <Latex>{'$c + R_{\\pi/3} (a + tv - c)$'}</Latex>.
            </p>

            <p>
                We now write out the equation that represents what we want to minimize:
            </p>

            <p>
                <Latex displayMode>{
                    '$||a\' - a|| + ||b\' - b||$'
                }</Latex>
                <Latex displayMode>{
                    '$= ||tv|| + ||c + R_{\\pi/3} (a + tv - c) - b||$'
                }</Latex>
            </p>

            <p>
                It is clear that a closed-form analytical solution is very hairy. What should we do...?
            </p>
        </div>
    )
    
    return postFramework("The Research Triangle (Part 2)", content);
}


export default ThirdPost;
