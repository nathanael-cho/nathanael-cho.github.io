import { useEffect, useState } from 'react';
import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Latex from 'react-latex';

import { postFramework, PostProps } from './helper';


function SixthPost({ date }: PostProps): JSX.Element {
    const [code, setCode] = useState<string>('');

    useEffect(() => {
            fetch('/python_files/project_euler_78.py')
            .then(res => res.text())
            .then(setCode);
        }, []);

    const content = (
        <Stack gap="md">
            <Text fs="italic">
                Project Euler's policy allows anyone to publicly discuss the solutions
                for the first one hundred problems as long as there is clear intent
                to shine light on the methodology and not just give the answer.
            </Text>

            <Text>
                From the get-go, I'm going to be honest: I would not have been able
                to solve this problem without external help. At best, I came up with a
                solution that runs in <Latex>$O(n^2)$</Latex> time, and that would have taken
                a very long time to run given that
                the final answer is in the tens of thousands. This post walks through
                the <Latex>{'$O(n \\sqrt{n})$'}</Latex> solution which I think is absolutely
                beautiful.
            </Text>

            <Title>Problem Statement</Title>

            <Text fw="bold">
                <Latex>
                    Problem Statement: Let $p(n)$ represent the number of ways
                    in which $n$ coins can be separated into piles. For example,
                    five coins can be separated into five piles. Find the least
                    value of $n$ such that $p(n)$ is divisible by one million.
                </Latex>
            </Text>

            <Title>Power Series</Title>

            <Text>
                The key insight is that we are going to work with
                the <Anchor c="blue" href="https://en.wikipedia.org/wiki/Ring_(mathematics)" target="_blank" rel="noopener noreferrer">ring</Anchor> of formal power series
                over <Latex>{'$\\mathbb{Z}$'}</Latex>. These are power series of the
                form <Latex>{'$\\sum\\limits_{i = 0}^\\infty a_i x^i$'}</Latex> where <Latex>{'$a_i \\in \\mathbb{Z}$'}</Latex>.
                Why does this make sense? Let's look at the following
                expression: <Latex>{'$\\prod\\limits_{i=1}^\\infty \\sum\\limits_{j = 0}^\\infty x^{ij}$'}</Latex>.
                Let the <Latex>$j$th term of the $i$th sum</Latex> represent <Latex>$j$</Latex> piles
                of size <Latex>$i$</Latex>.
                From here, the key insight is that the multiplication of terms across the sums represents a particular
                partition of coins. For example, let's suppose we have the <Latex>
                    $x^3$ term from the $i = 1$ sum, the $x^2$ term from the $i = 2$ sum, and the $x^4$ terms
                    from the $i = 4$ sum, and the $1$ term from the remaining sums. When we multiply these terms together,
                    we get $x^9$: this represents a partition
                    of $9$ coins into $3$ piles of $1$, $1$ pile of $2$, and $1$ pile of $4$
                </Latex>.
                It follows that when we multiply out the expression,
                the coefficient on <Latex>$x^n$</Latex> equals the number of ways to partition <Latex>$n$</Latex> coins.
                Amazing! To put it into formal notation, <Latex>
                    {'$\\sum\\limits_{n = 0}^\\infty p(n) x^n = \\prod\\limits_{i=1}^\\infty \\sum\\limits_{j = 0}^\\infty x^{ij}$'}
                </Latex>.
            </Text>
            <Text>
                This is great, but now what do we do with <Latex>{'$\\prod\\limits_{i=1}^\\infty \\sum\\limits_{j = 0}^\\infty x^{ij}$'}</Latex>?
                The next major step is to multiply both sides by <Latex>
                    {'$\\prod\\limits_{i=1}^\\infty 1 - x^i$'}
                </Latex>.
                By doing this we end up with:
            </Text>

            <div>
                <Latex displayMode>{
                    '$\\prod\\limits_{i=1}^\\infty (1 - x^i) \\sum\\limits_{n = 0}^\\infty p(n) x^n = \\prod\\limits_{i=1}^\\infty (1 - x^i) \\prod\\limits_{i=1}^\\infty \\sum\\limits_{j = 0}^\\infty x^{ij}$'
                }</Latex>
                <Latex displayMode>{
                    '$= \\prod\\limits_{i=1}^\\infty (1 - x^i) \\sum\\limits_{j = 0}^\\infty x^{ij}$'
                }</Latex>
            </div>

            <Text>
                Drawing on what we know about geometric series, we recognize that
                the expression within the product is a telescoping sum that reduces to <Latex>$1$</Latex>, and thus
                the whole product reduces to <Latex>$1$</Latex>. Thus:
            </Text>

            <Latex displayMode>{
                '$\\prod\\limits_{i=1}^\\infty (1 - x^i) \\sum\\limits_{n = 0}^\\infty p(n) x^n = 1$'
            }</Latex>

            <Text>
                At this point, it's worth pointing out again that we are working with the ring
                of formal power series over <Latex>{'$\\mathbb{Z}$'}</Latex>, <i>not</i> with
                polynomial functions. This means that there's no concept of whether the function will converge or not.
                Rather, we are thinking about what the coefficients are of the resultant power series
                when we add or multiply two power series together.
            </Text>

            <Title>Pentagonal Number Theorem</Title>

            <Text>
                Now, the next step is to derive a power series expression proper for <Latex>
                    {'$\\prod\\limits_{i=1}^\\infty (1 - x^i)$'}
                </Latex>. In the literature, this is known as Euler's pentagonal number theorem, and
                what the theorem states is that:
            </Text>

            <Latex displayMode>{
                '$\\prod\\limits_{i=1}^\\infty (1 - x^i) = \\sum\\limits_{j = -\\infty}^\\infty (-1)^j x^{j(3j - 1) / 2}$'
            }</Latex>

            <Latex displayMode>{
                '$= 1 + \\sum\\limits_{j = 1}^\\infty (-1)^j (x^{j(3j - 1) / 2} + x^{j(3j + 1) / 2})$'
            }</Latex>

            <Text>
                We prove the pentagonal number theorem by noting that the lefthand side also represents a partition problem:
                indeed, the coefficient on <Latex>$x^n$</Latex> is related to the number of ways to
                partition <Latex>$n$</Latex> coins <i>but with the condition</i> that all the piles be of different sizes.
                The relation is as follows: every partition of <Latex>$n$</Latex> coins into an odd number of piles
                contributes <Latex>$-1$</Latex> to the coefficient on <Latex>$x^n$</Latex>, and every partition into
                an even number of piles contributes <Latex>$1$</Latex>. The crux of the proof now is proving that for
                non-pentagonal numbers the odd and even partitions cancel each other out and that for pentagonal numbers
                there is exactly a <Latex>$1$</Latex> partition imbalance.
            </Text>

            <Text>
                The proof for this is from a man named Fabian Franklin in the year 1881. He introduced the following involution
                between even and odd partitions. Order the partitions by size from smallest to largest. <Latex>
                    Let $s$ be the size of the smallest partition, and let $m$ be the slope of the partition
                    which we define as set of partitions at the "back" that includes the largest partition size
                    and forms a sequence of consecutive integers. The involution is as follows: if $s \leq m$,
                    we remove the smallest element and add $1$ to each of the largest $s$ partitions; and
                    if $s \gt m$, we pop $1$ off of each partition in the slope and add a new smallest element of
                    size $m$
                </Latex>.
            </Text>

            <Text><Latex>
                We'll consider this in a few phases. First, we'll consider the case when $s$ is not in
                the slope. If $s$ is not in the slope and $s \leq m$, then we pop off the first partition,
                add $1$ to each partition in the slope, and thus we correspond to a partition with $1$ less
                partition and thus opposite parity. When $s$ is not in the slope and $s \gt m$,
                the least element of the slope has at least a margin of $2$ with the next smallest element
                by definition of the slope, so we can safely pop $1$ off of each partition in the slope
                and add a new partition of size $m \lt s$, and again we correspond with a partition of
                the opposite parity.
            </Latex></Text>

            <Text><Latex>
                Next, we'll consider when $s$ is in the slope. If $s$ is in the slope
                and $s \lt m$ (we'll come back to when $s = m$), we pop off the first partition of size $s$ and
                add $1$ to each of the greatest $s$ partitions in the slope. When $s$ is in the slope
                and $s \gt m + 1$ (we'll come back to when $s = m + 1)$, we pop off $m$ elements to create
                a new partition of size $m$ which works because the previous smallest partition is at least
                of size $m + 1$.
            </Latex></Text>

            <Text><Latex>
                If $s$ is in the slope
                and $s = m$ , the involution fails: we cannot pop off the first partition of size $s$ and
                add $1$ to each of the greatest $s$ partitions in the slope because once we pop off the smallest
                partition there are $s - 1$ partitions left to increment, and we have $1$ element left over.
                When $s$ is in the slope
                and $s = m + 1$, the involution also fails: we pop off $m$ elements to create
                a new partition of size $m$, but the partition of size $s$ is not of size $m$, so we
                have two partitions of the same size which is not allowed.
            </Latex></Text>

            <Text>
                <Latex>
                    The final question to ask is: how many of these partitions that fail the involution does each $n$ have?
                    If $s$ is in the slope and $s = m$, the partition must contain the consecutive integers
                    from $m$ to $2m - 1$,
                </Latex>,
                so <Latex>{'$n = \\frac{m(3m - 1)}{2}$'}</Latex>. Similarly,
                if <Latex>$s$ is in the slope and $s = m + 1$, the partition must contain the consecutive integers from $m + 1$ to $2m$</Latex>,
                so <Latex>{'$n = \\frac{m(3m + 1)}{2}$'}</Latex>. It follows that only when <Latex>$n$</Latex> is a pentagonal
                number does it have a partition that fails the involution, and each pentagonal number has a single partition
                that fails the involution. The final loose end to tie up is the power
                of <Latex>$-1$</Latex> to multiply each term by, which exponent is simply <Latex>$m$</Latex> when <Latex>{'$n = \\frac{m (3m \\pm 1)}{2}$'}</Latex>,
                and thus we have sketched out the proof of the pentagonal number theorem.
            </Text>

            <Title>Putting Everything Together</Title>

            <Text>
                We use the pentagonal number theorem to rewrite our final expression from the Power Series section:
            </Text>

            <Latex displayMode>
                {'$\\left( 1 + \\sum\\limits_{j = 1}^\\infty (-1)^j (x^{j(3j - 1) / 2} + x^{j(3j + 1) / 2}) \\right) \\sum\\limits_{n = 0}^\\infty p(n) x^n = 1$'}
            </Latex>

            <Text>
                Let's relax the formal notation and write out the first few terms of the left summation:
            </Text>

            <Latex displayMode>
                {'$(1 - x - x^2 + x^5 + x^7 - x^{12} - ...) \\sum\\limits_{n = 0}^\\infty p(n) x^n = 1$'}
            </Latex>

            <Text>
                The left expression contains exponents of the pentagonal numbers with alternating
                groups of two negatives then two positives, and so on.
            </Text>

            <Text>
                In order for this equality to hold, the left side needs to have a coefficient
                of <Latex>$1$ on $x^0$ and $0$ on every other term</Latex>. This gives us a way now
                to solve for <Latex>$p(n)$</Latex>. As a base case, <Latex>$p(0) = 1$</Latex>.
                Now, let's consider some <Latex>$n \gt 0$</Latex>.
                The coefficient on <Latex>
                    $x^n$ contains a positive term $p(n)$ by cross-multiplying $1$ and $p(n) x^n$.
                    It then contains a negative term $p(n - 1)$ by cross-multiplying $-x$
                </Latex> and <Latex>{'$p(n - 1) x^{n - 1}$'}</Latex>. <Latex>
                    Following the pattern, it also contains a negative term $p(n - 2)$ (if $n \geq 2$),
                    a positive term $p(n - 5)$ (if $n \geq 5$), and so on
                </Latex>.
                We can write out the coefficient on <Latex>
                    $x^n$
                </Latex> as:
            </Text>

            <Latex displayMode>
                $p(n) - p(n - 1) - p(n - 2) + p(n - 5) + ...$
            </Latex>

            <Text>Setting this equal to <Latex>$0$</Latex> and rearranging yields:</Text>

            <Latex displayMode>
                $p(n) = p(n - 1) + p(n - 2) - p(n - 5) - ...$
            </Latex>

            <Text>
                This is amazing! This is a recursive solution for calculating <Latex>$p(n)$</Latex>,
                and the runtime is <Latex>$O(n\alpha)$ where $\alpha$ is</Latex> the
                number of pentagonal numbers less than or equal to <Latex>$n$</Latex>. Reversing the form
                of pentagonal numbers, we conclude that the runtime of this algorithm, assuming
                proper dynamic programming, is <Latex>{'$O(n \\sqrt{n})$'}</Latex>.
            </Text>

            <Title>Code Implementation</Title>

            <Text>
                Here is some code that solves the Project Euler problem specifically. Note the use
                of modular arithmetic since we only need the answer modulo one million:
            </Text>

            <SyntaxHighlighter language="python" style={coy}>
                {code}
            </SyntaxHighlighter>
        </Stack>
    )

    return postFramework("Coin Partitions (Project Euler #78)", content, date);
}


export default SixthPost;
