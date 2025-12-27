import numpy as np
from scipy.optimize import minimize


PI = np.pi


# Adaptation of Weiszfeld's algorithm
def geometric_median(
    a: np.ndarray,
    b: np.ndarray,
    c: np.ndarray,
    tol: float = 1e-8,
    max_iter: int = 100,  # For 3 points, it's very fast
) -> np.ndarray:
    """Compute the geometric median of a set of points using Weiszfeld's algorithm"""
    points = np.array([a, b, c])

    # Initial guess: centroid (works well in practice)
    guess = (a + b + c) / 3
    for _ in range(max_iter):
        diff = points - guess
        distances = np.linalg.norm(diff, axis=1)

        # If x coincides with a point, it's already optimal
        if np.any(distances < tol):
            return guess

        weights = 1.0 / distances
        guess_next = np.sum(points * weights[:, None], axis=0) / np.sum(weights)

        if np.linalg.norm(guess_next - guess) < tol:
            return guess_next

        guess = guess_next

    return guess


def calculate_given_params(params: tuple[float, float], a: np.ndarray, b: np.ndarray, c: np.ndarray, clockwise_flag: bool = True) -> tuple[float, float]:
    circumradius, theta = params
    assert -2 * PI <= theta <= 2 * PI
    assert circumradius >= 0

    angular_interval = 2 * PI / 3 if clockwise_flag else -2 * PI / 3
    t1 = theta
    t2 = t1 + angular_interval
    t3 = t2 + angular_interval

    x = np.array([np.cos(t1), np.sin(t1)]) * circumradius
    y = np.array([np.cos(t2), np.sin(t2)]) * circumradius
    z = np.array([np.cos(t3), np.sin(t3)]) * circumradius

    # Given the equilateral triangle with orientation theta and circumradius, we want to find the
    # optimal translation (l, m) of the equilateral triangle to minimize the distance from the
    # points a, b, c. Let x, y, and z be the vertics of the equilateral triangle when centered at
    # the origin. We can then write what we want to minimize as:
    #     ||x + [l, m] - a|| + ||y + [l, m] - b|| + ||z + [l, m] - c||
    # We can rewrite this as:
    #     ||[l, m] - (a - x)|| + ||[l, m] - (b - y)|| + ||[l, m] - (c - z)||
    # This is just the geometric median! And there is an existing algorithm for that, Weiszfeld's algorithm
    optimal_center = geometric_median(a - x, b - y, c - z)

    a_prime = x + optimal_center
    b_prime = y + optimal_center
    c_prime = z + optimal_center
    distance = np.linalg.norm(a - (x + optimal_center)) + np.linalg.norm(b - (y + optimal_center)) + np.linalg.norm(c - (z + optimal_center))

    return distance, a_prime, b_prime, c_prime


def optimize(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    best_distance = np.inf
    a_prime, b_prime, c_prime = None, None, None

    for clockwise_flag in [True, False]:
        for starting_point in [(0, 0), (0, 2 * PI), (0, -2 * PI), (1, 0), (1, 2 * PI), (1, -2 * PI)]:
            current_result = minimize(
                lambda params: calculate_given_params(params, a, b, c, clockwise_flag=clockwise_flag)[0],
                x0=starting_point,
                # For a triangle completely inside the unit square, this is a sufficient upper bound
                bounds=[(0, 1), (-2 * PI, 2 * PI)],
                method="L-BFGS-B",
            )
            if current_result.fun < best_distance:
                best_distance = current_result.fun
                _, a_prime, b_prime, c_prime = calculate_given_params(current_result.x, a, b, c, clockwise_flag=clockwise_flag)

    return a_prime, b_prime, c_prime


def format_vector(v: np.ndarray) -> str:
    return f"({v[0]:.12f}, {v[1]:.12f})"


if __name__ == "__main__":
    np.random.seed(42)

    a = np.random.random(size=2)
    b = np.random.random(size=2)
    c = np.random.random(size=2)

    a_prime, b_prime, c_prime = optimize(a, b, c)

    print(f"a -> a': {format_vector(a)} -> {format_vector(a_prime)}")
    print(f"b -> b': {format_vector(b)} -> {format_vector(b_prime)}")
    print(f"c -> c': {format_vector(c)} -> {format_vector(c_prime)}")

    total_distance_moved = sum((
        np.linalg.norm(a_prime - a),
        np.linalg.norm(b_prime - b),
        np.linalg.norm(c_prime - c),
    ))
    print(f"Final distance moved: {total_distance_moved:.12f}")
