import numpy as np


PI = np.pi
R = np.array([
    [np.cos(PI / 3), -np.sin(PI / 3)],
    [np.sin(PI / 3), np.cos(PI / 3)],
])
R_INVERSE = R.T


def rotate_a_fix_b_c(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, float]:
    assert a.shape == (2,)
    assert b.shape == (2,)
    assert c.shape == (2,)

    a_prime_candidates = []
    for rotation in [R, R_INVERSE]:
        a_prime_candidates.append(c + rotation @ (b - c))

    min_distance = np.inf
    a_prime = None
    for a_prime_candidate in a_prime_candidates:
        candidate_distance = np.linalg.norm(a - a_prime_candidate)
        if candidate_distance < min_distance:
            min_distance = candidate_distance
            a_prime = a_prime_candidate

    return a_prime, min_distance


def solve(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    a_prime, bc_fixed_min_distance_traveled = rotate_a_fix_b_c(a, b, c)
    b_prime, ac_fixed_min_distance_traveled = rotate_a_fix_b_c(b, a, c)
    c_prime, ab_fixed_min_distance_traveled = rotate_a_fix_b_c(c, a, b)
    if ab_fixed_min_distance_traveled < ac_fixed_min_distance_traveled and ab_fixed_min_distance_traveled < bc_fixed_min_distance_traveled:
        return a, b, c_prime
    elif ac_fixed_min_distance_traveled < bc_fixed_min_distance_traveled:
        return a, b_prime, c
    else:
        return a_prime, b, c
    

def format_vector(v: np.ndarray) -> str:
    return f"({v[0]:.12f}, {v[1]:.12f})"
    

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
