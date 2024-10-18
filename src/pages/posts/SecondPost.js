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
            </p>

            <p>TODO.</p>
        </div>
    )
    
    return postFramework("The Research Triangle (Part 1)", content);
}


export default SecondPost;
