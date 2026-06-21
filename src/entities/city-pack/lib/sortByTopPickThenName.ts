export function sortByTopPickThenName<T extends { name: string; isTopPick?: boolean }>(
  items: T[]
): T[] {
  return [...items].sort((left, right) => {
    const leftTopPick = left.isTopPick === true;
    const rightTopPick = right.isTopPick === true;

    if (leftTopPick !== rightTopPick) {
      return leftTopPick ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}
