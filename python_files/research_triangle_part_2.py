import numpy as np
from scipy.optimize import minimize_scalar


PI = np.pi
R = np.array([
    [np.cos(PI / 3), -np.sin(PI / 3)],
    [np.sin(PI / 3), np.cos(PI / 3)],
])
R_INVERSE = R.T


def optimize_given_theta(theta: float, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray, float]:
    """
    The problem we are trying to solve is: given we can move a to a' and b to b' but not c, and given
    that a' b' c must e an equilateral triangle, what is the minimum of ||a' - a|| + ||b' - b||? 
    
    :param theta: A float in the interval [0, pi) that represents the angle of the unit vector that we will move a to a' along
    :type theta: float
    :param a: The vector that represents a from the original triangle
    :type a: np.ndarray
    :param b: The vector that represents b from the original triangle
    :type b: np.ndarray
    :param c: The vector that represents c from the original triangle
    :type c: np.ndarray
    :return: a' and b' and the minimum distance
    :rtype: tuple[np.ndarray, np.ndarray, float]
    """
    assert a.shape == (2,)
    assert b.shape == (2,)
    assert c.shape == (2,)
    assert 0 <= theta < PI

    # We are rewriting a' as a + tv where t is a scalar and v is a unit vector
    # v can then be uniquely defined a single scalar, a theta value
    v = np.array([np.cos(theta), np.sin(theta)])

    fun_min = None
    a_prime = None
    b_prime = None
    # We have to try both rotations since we fix the "handed-ness" if we just try clock-wise
    for rotation in (R, R_INVERSE):
        # a' = a + tv, and b' = c + rotation @ (a + t * v - c)
        # Thus, we can rewrite the expression we want to minimize as: ||tv|| + ||c + rotation @ (a + t * v - c) - b||
        b_offset = c - b + rotation @ (a - c)
        v_rotated = rotation @ v
        def function_to_minimize(t: float):
            # ||tv|| simplifies to abs(t) because v is a unit vector
            return abs(t) + np.linalg.norm(b_offset + t * v_rotated)

        res_min_cand = minimize_scalar(function_to_minimize)
        t_min_cand = res_min_cand.x
        fun_min_cand = res_min_cand.fun

        if fun_min is None or fun_min_cand < fun_min:
            fun_min = fun_min_cand
            a_prime = a + t_min_cand * v
            b_prime = c + rotation @ (a_prime - c)

    return a_prime, b_prime, fun_min


def optimize_w_fixed_point(a: np.ndarray, b: np.ndarray, c: np.ndarray):
    """
    The problem we are trying to solve is: given we can move a to a' and b to b' but not c, and given
    that a' b' c must e an equilateral triangle, what is the minimum of ||a' - a|| + ||b' - b||? 

    :param a: The vector that represents a from the original triangle
    :type a: np.ndarray
    :param b: The vector that represents b from the original triangle
    :type b: np.ndarray
    :param c: The vector that represents c from the original triangle - this point is fixed
    :type c: np.ndarray
    :return: a' and b'
    :rtype: tuple[np.ndarray, np.ndarray]
    """
    assert a.shape == (2,)
    assert b.shape == (2,)
    assert c.shape == (2,)

    def function_to_minimize(theta: float):
        _, _, distance = optimize_given_theta(theta, a, b, c)
        return distance

    # These bounds are inclusive
    res_min = minimize_scalar(function_to_minimize, method="bounded", bounds=(0, PI))
    theta_min = res_min.x

    return optimize_given_theta(theta_min, a, b, c)


def format_vector(v: np.ndarray) -> str:
    return f"({v[0]:.12f}, {v[1]:.12f})"


def solve(a: np.ndarray, b: np.ndarray, c: np.ndarray):
    a_prime_c_fixed, b_prime_c_fixed, c_fixed_min_distance_traveled = optimize_w_fixed_point(a, b, c)
    b_prime_a_fixed, c_prime_a_fixed, a_fixed_min_distance_traveled = optimize_w_fixed_point(b, c, a)
    a_prime_b_fixed, c_prime_b_fixed, b_fixed_min_distance_traveled = optimize_w_fixed_point(a, c, b)
    if c_fixed_min_distance_traveled < a_fixed_min_distance_traveled and c_fixed_min_distance_traveled < b_fixed_min_distance_traveled:
        return a_prime_c_fixed, b_prime_c_fixed, c
    elif b_fixed_min_distance_traveled < a_fixed_min_distance_traveled:
        return a_prime_b_fixed, b, c_prime_b_fixed
    else:
        return a, b_prime_a_fixed, c_prime_a_fixed


if __name__ == "__main__":
    np.random.seed(9973)

    a = np.random.random(size=2)
    b = np.random.random(size=2)
    c = np.random.random(size=2)

    a_prime, b_prime, c_prime = solve(a, b, c)

    print(f"a -> a': {format_vector(a)} -> {format_vector(a_prime)}")
    print(f"b -> b': {format_vector(b)} -> {format_vector(b_prime)}")
    print(f"c -> c': {format_vector(c)} -> {format_vector(c_prime)}")

    final_distance_moved = sum((
        np.linalg.norm(a_prime - a),
        np.linalg.norm(b_prime - b),
        np.linalg.norm(c_prime - c),
    ))
    print(f"Final distance moved: {final_distance_moved:.12f}")
