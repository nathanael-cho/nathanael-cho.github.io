import numpy as np
from scipy.optimize import minimize_scalar


PI = np.pi


# Adaptation of Weiszfeld's algorithm
def geometric_median(
    a: np.ndarray,
    b: np.ndarray,
    c: np.ndarray,
    tol: float = 1e-8,
    max_iter: int = 1000,
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


def optimize_given_circumradius(circumradius: float, a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[float, float]:
    # The angle is in the interval [0, 2pi]
    def f(theta: float):
        t1 = theta
        t2 = t1 + 2 * PI / 3
        t3 = t2 + 2 * PI / 3 
        x = np.array([np.cos(t1), np.sin(t1)]) * circumradius
        y = np.array([np.cos(t2), np.sin(t2)]) * circumradius
        z = np.array([np.cos(t3), np.sin(t3)]) * circumradius

        # Given the equilateral triangle with orientation theta and circumradius, we
        # want to find the optimal translation (l, m) of the equilateral triangle to minimize the distance
        # from the points a, b, c. Let x, y, and z be the vertics of the equilateral triangle when centered
        # at the origin. We can then write what we want to minimize as:
        #     ||x + [l, m] - a|| + ||y + [l, m] - b|| + ||z + [l, m] - c||
        # We can rewrite this as:
        #     ||[l, m] - (a - x)|| + ||[l, m] - (b - y)|| + ||[l, m] - (c - z)||
        # This is just the geometric median! And there is an existing algorithm for that, Weiszfeld's algorithm

        optimal_center = geometric_median(a - x, b - y, c - z)

        return np.linalg.norm(a - (x + optimal_center)) + np.linalg.norm(b - (y + optimal_center)) + np.linalg.norm(c - (z + optimal_center))
    
    res_min = minimize_scalar(f, method="bounded", bounds=(0, 2 * PI))

    theta_min = res_min.x
    distance_min = res_min.fun
    return theta_min, distance_min


def optimize(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    def f(circumradius):
        _, distance_min = optimize_given_circumradius(circumradius, a, b, c)
        return distance_min
    
    # When we generate points within the unit circle, this suffices
    res_min = minimize_scalar(f, method="bounded", bounds=(0, 1))
    circumradius_min = res_min.x

    theta_min, _ = optimize_given_circumradius(circumradius_min, a, b, c)
    t1 = theta_min
    t2 = t1 + 2 * PI / 3
    t3 = t2 + 2 * PI / 3
    x = np.array([np.cos(t1), np.sin(t1)]) * circumradius_min
    y = np.array([np.cos(t2), np.sin(t2)]) * circumradius_min
    z = np.array([np.cos(t3), np.sin(t3)]) * circumradius_min
    optimal_center = geometric_median(a - x, b - y, c - z)
    return x + optimal_center, y + optimal_center, z + optimal_center


def format_vector(v: np.ndarray) -> str:
    return f"({v[0]}, {v[1]})"


if __name__ == "__main__":
    np.random.seed(42)

    a = np.random.random(size=2)
    b = np.random.random(size=2)
    c = np.random.random(size=2)

    a_prime, b_prime, c_prime = optimize(a, b, c)

    print(f"{format_vector(a)} -> {format_vector(a_prime)}")
    print(f"{format_vector(b)} -> {format_vector(b_prime)}")
    print(f"{format_vector(c)} -> {format_vector(c_prime)}")

    total_distance_moved = sum((
        np.linalg.norm(a_prime - a),
        np.linalg.norm(b_prime - b),
        np.linalg.norm(c_prime - c),
    ))
    print(f"Total distance moved: {total_distance_moved}")
