import { postFramework } from './helper';

const Latex = require('react-latex');


function SecondPost() {
    const content = (
        <div>
            <p>
                As per Wikipedia:
            </p>
            <p>    
                "The Research Triangle [is a nickname] for a
                metropolitan area in the Piedmont region of the U.S. state of
                North Carolina. Anchored by the cities of Raleigh and Durham
                and the town of Chapel Hill, the region is home to three major
                research universities: North Carolina State University, Duke
                University, and the University of North Carolina at Chapel Hill,
                respectively."
            </p>

            <p>
                With a quick look at Google Maps, one can immediately see that the
                triangle formed by these three cities is not equilateral.
                What a letdown!
            </p>

            <p>
                Last week, I called a friend who lives in that area,
                and upon discovering this, we came up with the following question:
            </p>
            <p><b>
                Given three distinct
                points in a plane, what is the minimum distance we can
                move the points such that the triangle
                formed by the points <i>is</i> equilateral?
            </b></p>

            <p>
                For this post, we start with a simplified version:
            </p>

            <p><b>
                Given three distinct
                points in a plane, what is the minimum distance we can
                move <i>any one point</i> such that the triangle
                formed by the points is equilateral?
            </b></p>

            <p>
                Let <Latex>$a = (x_a, y_a), b = (x_b, y_b), x_3 = (x_c, y_c)$</Latex> be
                the three points. To start, we choose to move <Latex>$a$</Latex>.
                We immediately notice that there are only two
                places <Latex>$a$</Latex> can move to such that the triangle is equilateral.
            </p>

            <p>
                What is a closed form for the coordinates of those two points?
                We call upon an old friend, the two-dimensional rotation
                matrix:
            </p>
            <p>
                <Latex displayMode>{
                    '$\\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\'
                    + '\\sin\\theta & \\cos\\theta \\end{pmatrix}$'
                }</Latex>
            </p>
                
            <p>
                Let <Latex>{'$\\vec{a}$, $\\vec{b}$, $\\vec{c}$'}</Latex> be
                the vector forms of the three points. Then, we have the following closed form
                for where <Latex>{'$a$'}</Latex> can move to:
            </p>

            <p>
                <Latex displayMode>{
                    '$$\\vec{c} +'
                    + '\\begin{pmatrix} \\cos\\pm\\frac{\\pi}{3} & -\\sin\\pm\\frac{\\pi}{3} \\\\'
                    + '\\sin\\pm\\frac{\\pi}{3} & \\cos\\pm\\frac{\\pi}{3} \\end{pmatrix}'
                    + '(\\vec{b} - \\vec{c})$$'
                }</Latex>
            </p>

            <p>
                Said in words, we get the two possible locations for <Latex>{'$a$'}</Latex> by
                rotating <Latex>{'$b$'}</Latex> around <Latex>{'$c$'}</Latex> by <Latex>{'$\\frac{\\pi}{3}$'}</Latex> radians in both directions.
            </p>

            <p>
                To close out this first part, the way to get the minimum distance is as follows:
            </p>

            <ol>
                <li>
                    For each of <Latex>{'$a, b, c$'}</Latex>, calculate the two
                    possible destinations.
                </li>
                <li>
                    For each of the two destinations, calculate the distance
                    to the original location.
                </li>
                <li>
                    Pick the original point/destination point pair
                    that minimizes the travel distance.
                </li>
            </ol>
        </div>
    )
    
    return postFramework("The Research Triangle (Part 1)", content);
}


export default SecondPost;
