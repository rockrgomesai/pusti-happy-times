export const calculateTableMinWidth = (
  columnCount: number,
  columnWidth = 160,
  minimumWidth = 960
) => {
  if (columnCount <= 0) {
    return minimumWidth;
  }

  return Math.max(columnCount * columnWidth, minimumWidth);
};
