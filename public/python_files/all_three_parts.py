import numpy as np

from research_triangle_part_1 import main as part_one_main
from research_triangle_part_2 import main as part_two_main
from research_triangle_part_3 import main as part_three_main


def main(random_seed: int = 9973):
    print(f"RANDOM SEED: {random_seed}")
    print(f"------Part 1------")
    part_one_main(random_seed=random_seed)
    print(f"------Part 2------")
    part_two_main(random_seed=random_seed)
    print(f"------Part 3------")
    part_three_main(random_seed=random_seed)


if __name__ == "__main__":
    random_seed = np.random.randint(0, 1_000_000_000)
    main(random_seed=random_seed)
