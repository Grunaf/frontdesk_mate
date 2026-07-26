export type ChipHorizontalScrollInput = {
  containerScrollLeft: number;
  containerClientWidth: number;
  containerScrollWidth: number;
  containerLeft: number;
  tabLeft: number;
  tabWidth: number;
};

/** Next `scrollLeft` to center the chip, or `null` when already centered. */
export function resolveChipHorizontalScrollLeft(
  input: ChipHorizontalScrollInput
): number | null {
  const containerCenter = input.containerLeft + input.containerClientWidth / 2;
  const tabCenter = input.tabLeft + input.tabWidth / 2;
  const delta = tabCenter - containerCenter;
  const maxLeft = Math.max(0, input.containerScrollWidth - input.containerClientWidth);
  const nextLeft = Math.max(0, Math.min(maxLeft, input.containerScrollLeft + delta));

  if (Math.abs(nextLeft - input.containerScrollLeft) < 1) {
    return null;
  }

  return nextLeft;
}

/** Horizontal-only: center `tab` inside `container` without touching page scroll. */
export function scrollChipHorizontallyIntoView(
  container: HTMLElement,
  tab: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  const containerRect = container.getBoundingClientRect();
  const tabRect = tab.getBoundingClientRect();
  const nextLeft = resolveChipHorizontalScrollLeft({
    containerScrollLeft: container.scrollLeft,
    containerClientWidth: container.clientWidth,
    containerScrollWidth: container.scrollWidth,
    containerLeft: containerRect.left,
    tabLeft: tabRect.left,
    tabWidth: tabRect.width,
  });

  if (nextLeft === null) {
    return;
  }

  container.scrollTo({ left: nextLeft, behavior });
}
