import numpy as np
from scipy.optimize import minimize_scalar


PI = np.pi
R = np.array([
    [np.cos(PI / 3), -np.sin(PI / 3)],
    [np.sin(PI / 3), np.cos(PI / 3)],
])


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

    # a' = a + tv, and b' = c + R @ (a + t * v - c)
    # Thus, we can rewrite the expression we want to minimize as: ||tv|| + ||c + R @ (a + t * v - c) - b||
    b_offset = c - b + R @ (a - c)
    v_rotated = R @ v
    def function_to_minimize(t: float):
        # ||tv|| simplifies to abs(t) because v is a unit vector
        return abs(t) + np.linalg.norm(b_offset + t * v_rotated)

    res_min = minimize_scalar(function_to_minimize)
    t_min = res_min.x
    fun_min = res_min.fun

    a_prime = a + t_min * v
    b_prime = c + R @ (a_prime - c)

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
    
    res_min = minimize_scalar(function_to_minimize, method="bounded", bounds=(0, PI))
    theta_min = res_min.x

    return optimize_given_theta(theta_min, a, b, c)


def format_vector(v: np.ndarray) -> str:
    return f"({v[0]}, {v[1]})"


def solve(a: np.ndarray, b: np.ndarray, c: np.ndarray):
    print(f"Original points: a - {format_vector(a)}, b - {format_vector(b)}, c - {format_vector(c)}")
    a_prime_c_fixed, b_prime_c_fixed, c_fixed_min_distance_traveled = optimize_w_fixed_point(a, b, c)
    b_prime_a_fixed, c_prime_a_fixed, a_fixed_min_distance_traveled = optimize_w_fixed_point(b, c, a)
    a_prime_b_fixed, c_prime_b_fixed, b_fixed_min_distance_traveled = optimize_w_fixed_point(a, c, b)
    if c_fixed_min_distance_traveled < a_fixed_min_distance_traveled and c_fixed_min_distance_traveled < b_fixed_min_distance_traveled:
        print("Moved a and b")
        print(f"Final points: a' - {format_vector(a_prime_c_fixed)}, b' - {format_vector(b_prime_c_fixed)}, c - {format_vector(c)}")
    elif b_fixed_min_distance_traveled < a_fixed_min_distance_traveled:
        print("Moved a and c")
        print(f"Final points: a' - {format_vector(a_prime_b_fixed)}, b' - {format_vector(b)}, c - {format_vector(c_prime_b_fixed)}")
    else:
        print("Moved b and c")
        print(f"Final points: a' - {format_vector(a)}, b' - {format_vector(b_prime_a_fixed)}, c - {format_vector(c_prime_a_fixed)}")


if __name__ == "__main__":
    a = np.random.random(size=2)
    b = np.random.random(size=2)
    c = np.random.random(size=2)

    solve(a, b, c)
