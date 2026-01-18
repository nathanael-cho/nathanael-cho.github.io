def pentagonal(k):
    """Returns the k-th generalized pentagonal number."""
    return k * (3 * k - 1) // 2


if __name__ == "__main__":
    partitions = [1]  # p(0) = 1

    # Generalized pentagonal numbers: 1, 2, 5, 7, 12, 15, ...
    pentagonal_offsets = [1, 2]
    pentagonal_index = 1

    n = 0
    while partitions[-1] != 0:
        n += 1

        # Extend pentagonal offsets as needed
        if n > pentagonal_offsets[-1]:
            pentagonal_index += 1
            pentagonal_offsets.append(pentagonal(pentagonal_index))
            pentagonal_offsets.append(pentagonal(-pentagonal_index))

        # Compute p(n) using the recurrence relation
        p_n = 0
        for i, offset in enumerate(pentagonal_offsets):
            if offset > n:
                break

            sign = 1 if i % 4 < 2 else -1
            p_n += sign * partitions[n - offset]

        partitions.append(p_n % 1_000_000)

    print("Final answer:", n)
