import numpy as np
from scipy.optimize import minimize


PI = np.pi
R = np.array([
    [np.cos(PI / 3), -np.sin(PI / 3)],
    [np.sin(PI / 3), np.cos(PI / 3)],
])
R_INVERSE = R.T


def calculate_given_params(
        params: tuple[float, float], a: np.ndarray, b: np.ndarray, c: np.ndarray, clockwise_flag: bool = True
    ) -> tuple[float, np.ndarray, np.ndarray]:
    """
    The problem we are trying to solve is: given we can move a to a' and b to b' but not c, and given
    that a' b' c must e an equilateral triangle, what is the minimum of ||a' - a|| + ||b' - b||? 
    
    :param params: The theta and scalar t
    :type params: tuple[float, float]
    :param a: The vector that represents a from the original triangle
    :type a: np.ndarray
    :param b: The vector that represents b from the original triangle
    :type b: np.ndarray
    :param c: The vector that represents c from the original triangle
    :type c: np.ndarray
    :param clockwise_flag: Whether to rotate clockwise from a' to b' or vice versa
    :type clockwise_flag: bool
    :return: The minimum distance, a', and b'
    :rtype: tuple[float, np.ndarray, np.ndarray]
    """
    theta, t = params
    assert 0 <= theta < PI

    # We are rewriting a' as a + tv where t is a scalar and v is a unit vector
    # v can then be uniquely defined a single scalar, a theta value
    v = np.array([np.cos(theta), np.sin(theta)])

    rotation = R if clockwise_flag else R_INVERSE

    # a' = a + tv, and b' = c + rotation @ (a + t * v - c)
    a_prime = a + t * v
    b_prime = c + rotation @ (a_prime - c)

    distance = np.linalg.norm(a_prime - a) + np.linalg.norm(b_prime - b)

    return distance, a_prime, b_prime


def optimize_w_fixed_point(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[float, np.ndarray, np.ndarray]:
    """
    The problem we are trying to solve is: given we can move a to a' and b to b' but not c, and given
    that a' b' c must e an equilateral triangle, what is the minimum of ||a' - a|| + ||b' - b||? 

    :param a: The vector that represents a from the original triangle
    :type a: np.ndarray
    :param b: The vector that represents b from the original triangle
    :type b: np.ndarray
    :param c: The vector that represents c from the original triangle - this point is fixed
    :type c: np.ndarray
    :return: The distance, a', and b'
    :rtype: tuple[float, np.ndarray, np.ndarray]
    """
    assert a.shape == (2,)
    assert b.shape == (2,)
    assert c.shape == (2,)

    best_distance = np.inf
    result_to_return = None

    for clockwise_flag in [True, False]:
        for starting_point in [(0, 0)]:
            current_result = minimize(
                lambda params: calculate_given_params(params, a, b, c, clockwise_flag=clockwise_flag)[0],
                x0=starting_point,
                # Theta, then t - For points in the unit square, [0, 1] is a resonable interval for t which scales the unit vector
                bounds=[(0, PI), (0, 1)],
                method="L-BFGS-B",
            )
            if current_result.fun < best_distance:
                best_distance = current_result.fun
                result_to_return = calculate_given_params(current_result.x, a, b, c, clockwise_flag=clockwise_flag)

    return result_to_return


def solve(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    c_fixed_min_distance_traveled, a_prime_c_fixed, b_prime_c_fixed = optimize_w_fixed_point(a, b, c)
    a_fixed_min_distance_traveled, b_prime_a_fixed, c_prime_a_fixed = optimize_w_fixed_point(b, c, a)
    b_fixed_min_distance_traveled, a_prime_b_fixed, c_prime_b_fixed = optimize_w_fixed_point(a, c, b)
    if c_fixed_min_distance_traveled < a_fixed_min_distance_traveled and c_fixed_min_distance_traveled < b_fixed_min_distance_traveled:
        return a_prime_c_fixed, b_prime_c_fixed, c
    elif b_fixed_min_distance_traveled < a_fixed_min_distance_traveled:
        return a_prime_b_fixed, b, c_prime_b_fixed
    else:
        return a, b_prime_a_fixed, c_prime_a_fixed


def format_vector(v: np.ndarray) -> str:
    return f"({v[0]:.12f}, {v[1]:.12f})"


def main(random_seed: int = 9973):
    np.random.seed(random_seed)

    a = np.random.random(size=2)
    b = np.random.random(size=2)
    c = np.random.random(size=2)

    a_prime, b_prime, c_prime = solve(a, b, c)

    print(f"a -> a': {format_vector(a)} -> {format_vector(a_prime)}")
    print(f"b -> b': {format_vector(b)} -> {format_vector(b_prime)}")
    print(f"c -> c': {format_vector(c)} -> {format_vector(c_prime)}")

    total_distance_moved = sum((
        np.linalg.norm(a_prime - a),
        np.linalg.norm(b_prime - b),
        np.linalg.norm(c_prime - c),
    ))
    print(f"Final distance moved: {total_distance_moved:.12f}")


if __name__ == "__main__":
    main()
