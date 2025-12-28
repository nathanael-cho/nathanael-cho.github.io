import numpy as np


PI = np.pi
R = np.array([
    [np.cos(PI / 3), -np.sin(PI / 3)],
    [np.sin(PI / 3), np.cos(PI / 3)],
])
R_INVERSE = R.T


def rotate_first_fix_second_third(first: np.ndarray, second: np.ndarray, third: np.ndarray) -> tuple[np.ndarray, float]:
    assert first.shape == (2,)
    assert second.shape == (2,)
    assert third.shape == (2,)

    candidates = []
    for rotation in [R, R_INVERSE]:
        candidates.append(third + rotation @ (second - third))

    min_distance = np.inf
    new_first = None
    for a_prime_candidate in candidates:
        candidate_distance = np.linalg.norm(first - a_prime_candidate)
        if candidate_distance < min_distance:
            min_distance = candidate_distance
            new_first = a_prime_candidate

    return new_first, min_distance


def solve(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    a_prime, bc_fixed_min_distance_traveled = rotate_first_fix_second_third(a, b, c)
    b_prime, ac_fixed_min_distance_traveled = rotate_first_fix_second_third(b, a, c)
    c_prime, ab_fixed_min_distance_traveled = rotate_first_fix_second_third(c, a, b)
    if ab_fixed_min_distance_traveled < ac_fixed_min_distance_traveled and ab_fixed_min_distance_traveled < bc_fixed_min_distance_traveled:
        return a, b, c_prime
    elif ac_fixed_min_distance_traveled < bc_fixed_min_distance_traveled:
        return a, b_prime, c
    else:
        return a_prime, b, c
    

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
