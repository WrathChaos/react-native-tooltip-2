import { RectType, Placement, GeometryType } from "./Tooltip.type";

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Size {
  width: number;
  height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}

class Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

const swapSizeDimensions = (size: Size) => new Size(size.height, size.width);

const makeChildlessRect = (params: RectType) => {
  const { displayInsets, windowDims, placement } = params;
  switch (placement) {
    case Placement.BOTTOM:
      return new Rect(windowDims.width / 2, displayInsets.top, 1, 1);
    case Placement.RIGHT:
      return new Rect(displayInsets.left, windowDims.height / 2, 1, 1);
    case Placement.LEFT:
      return new Rect(
        windowDims.width - displayInsets.right,
        windowDims.height / 2,
        1,
        1,
      );
    case Placement.TOP: // fall through
    default:
      return new Rect(
        windowDims.width / 2,
        windowDims.height - displayInsets.bottom,
        1,
        1,
      );
  }
};

const computeCenterGeometry = (
  params: Exclude<GeometryType, "arrowSize" | "childContentSpacing">,
) => {
  const { childRect, contentSize, displayInsets, windowDims } = params;
  const maxWidth =
    windowDims.width - (displayInsets.left + displayInsets.right);
  const maxHeight =
    windowDims.height - (displayInsets.top + displayInsets.bottom);

  const adjustedContentSize = new Size(
    contentSize.width >= maxWidth ? maxWidth : -1,
    contentSize.height >= maxHeight ? maxHeight : -1,
  );

  const tooltipOrigin = new Point(
    adjustedContentSize.width === -1
      ? (maxWidth - contentSize.width) / 2 + displayInsets.left
      : displayInsets.left,
    adjustedContentSize.height === -1
      ? (maxHeight - contentSize.height) / 2 + displayInsets.top
      : displayInsets.top,
  );

  const anchorPoint = new Point(
    childRect.x + childRect.width / 2.0,
    childRect.y,
  );

  return {
    tooltipOrigin,
    anchorPoint,
    placement: "center",
    adjustedContentSize,
  };
};

const computeTopGeometry = (params: GeometryType) => {
  const {
    childRect,
    contentSize,
    arrowSize,
    displayInsets,
    windowDims,
    childContentSpacing,
  } = params;
  const maxWidth =
    windowDims.width - (displayInsets.left + displayInsets.right);

  const adjustedContentSize = new Size(
    Math.min(maxWidth, contentSize.width),
    contentSize.height,
  );

  const tooltipOrigin = new Point(
    contentSize.width >= maxWidth
      ? displayInsets.left
      : Math.max(
          displayInsets.left,
          childRect.x + (childRect.width - adjustedContentSize.width) / 2,
        ),
    Math.max(
      displayInsets.top - childContentSpacing,
      childRect.y - contentSize.height - arrowSize.height - childContentSpacing,
    ),
  );

  const anchorPoint = new Point(
    childRect.x + childRect.width / 2.0,
    childRect.y - childContentSpacing,
  );

  // Make sure arrow does not extend beyond displayInsets
  if (
    anchorPoint.x + arrowSize.width >
    windowDims.width - displayInsets.right
  ) {
    anchorPoint.x =
      windowDims.width -
      displayInsets.right -
      Math.abs(arrowSize.width - arrowSize.height) -
      8;
  } else if (anchorPoint.x - arrowSize.width < displayInsets.left) {
    anchorPoint.x =
      displayInsets.left + Math.abs(arrowSize.width - arrowSize.height) + 8;
  }

  const topPlacementBottomBound = anchorPoint.y - arrowSize.height;

  if (tooltipOrigin.y + contentSize.height > topPlacementBottomBound) {
    adjustedContentSize.height = topPlacementBottomBound - tooltipOrigin.y;
  }

  if (tooltipOrigin.x + contentSize.width > maxWidth) {
    tooltipOrigin.x =
      windowDims.width - displayInsets.right - adjustedContentSize.width;
  }

  return {
    tooltipOrigin,
    anchorPoint,
    placement: "top",
    adjustedContentSize,
  };
};

const computeBottomGeometry = (params: GeometryType) => {
  const {
    childRect,
    contentSize,
    arrowSize,
    displayInsets,
    windowDims,
    childContentSpacing,
  } = params;
  const maxWidth =
    windowDims.width - (displayInsets.left + displayInsets.right);

  const adjustedContentSize = new Size(
    Math.min(maxWidth, contentSize.width),
    contentSize.height,
  );

  const tooltipOrigin = new Point(
    contentSize.width >= maxWidth
      ? displayInsets.left
      : Math.max(
          displayInsets.left,
          childRect.x + (childRect.width - adjustedContentSize.width) / 2,
        ),
    Math.min(
      windowDims.height - displayInsets.bottom + childContentSpacing,
      childRect.y + childRect.height + arrowSize.height + childContentSpacing,
    ),
  );
  const anchorPoint = new Point(
    childRect.x + childRect.width / 2.0,
    childRect.y + childRect.height + childContentSpacing,
  );

  // make sure arrow does not extend beyond displayInsets
  if (
    anchorPoint.x + arrowSize.width >
    windowDims.width - displayInsets.right
  ) {
    anchorPoint.x =
      windowDims.width -
      displayInsets.right -
      Math.abs(arrowSize.width - arrowSize.height) -
      8;
  } else if (anchorPoint.x - arrowSize.width < displayInsets.left) {
    anchorPoint.x =
      displayInsets.left + Math.abs(arrowSize.width - arrowSize.height) + 8;
  }

  if (
    tooltipOrigin.y + contentSize.height >
    windowDims.height - displayInsets.bottom
  ) {
    adjustedContentSize.height =
      windowDims.height - displayInsets.bottom - tooltipOrigin.y;
  }

  if (tooltipOrigin.x + contentSize.width > maxWidth) {
    tooltipOrigin.x =
      windowDims.width - displayInsets.right - adjustedContentSize.width;
  }

  return {
    tooltipOrigin,
    anchorPoint,
    placement: "bottom",
    adjustedContentSize,
  };
};

const computeLeftGeometry = (params: GeometryType) => {
  const {
    childRect,
    contentSize,
    arrowSize,
    displayInsets,
    windowDims,
    childContentSpacing,
  } = params;
  const maxHeight =
    windowDims.height - (displayInsets.top + displayInsets.bottom);

  const adjustedContentSize = new Size(
    contentSize.width,
    Math.min(maxHeight, contentSize.height),
  );

  const tooltipOrigin = new Point(
    Math.max(
      displayInsets.left - childContentSpacing,
      childRect.x - contentSize.width - arrowSize.width - childContentSpacing,
    ),
    contentSize.height >= maxHeight
      ? displayInsets.top
      : Math.max(
          displayInsets.top,
          childRect.y + (childRect.height - adjustedContentSize.height) / 2,
        ),
  );

  const anchorPoint = new Point(
    childRect.x - childContentSpacing,
    childRect.y + childRect.height / 2.0,
  );

  // make sure arrow does not extend beyond displayInsets
  if (
    anchorPoint.y + arrowSize.width >
    windowDims.height - displayInsets.bottom
  ) {
    anchorPoint.y =
      windowDims.height -
      displayInsets.bottom -
      Math.abs(arrowSize.height - arrowSize.width) -
      8;
  } else if (anchorPoint.y - arrowSize.height < displayInsets.top) {
    anchorPoint.y =
      displayInsets.top + Math.abs(arrowSize.height - arrowSize.width) + 8;
  }

  const leftPlacementRightBound = anchorPoint.x - arrowSize.width;

  if (tooltipOrigin.x + contentSize.width > leftPlacementRightBound) {
    adjustedContentSize.width = leftPlacementRightBound - tooltipOrigin.x;
  }

  if (tooltipOrigin.y + contentSize.height > maxHeight) {
    tooltipOrigin.y =
      windowDims.height - displayInsets.bottom - adjustedContentSize.height;
  }

  return {
    tooltipOrigin,
    anchorPoint,
    placement: "left",
    adjustedContentSize,
  };
};

const computeRightGeometry = (params: GeometryType) => {
  const {
    childRect,
    contentSize,
    arrowSize,
    displayInsets,
    windowDims,
    childContentSpacing,
  } = params;
  const maxHeight =
    windowDims.height - (displayInsets.top + displayInsets.bottom);

  const adjustedContentSize = new Size(
    contentSize.width,
    Math.min(maxHeight, contentSize.height),
  );

  const tooltipOrigin = new Point(
    Math.min(
      windowDims.width - displayInsets.right + childContentSpacing,
      childRect.x + childRect.width + arrowSize.width + childContentSpacing,
    ),
    contentSize.height >= maxHeight
      ? displayInsets.top
      : Math.max(
          displayInsets.top,
          childRect.y + (childRect.height - adjustedContentSize.height) / 2,
        ),
  );

  const anchorPoint = new Point(
    childRect.x + childRect.width + childContentSpacing,
    childRect.y + childRect.height / 2.0,
  );

  // make sure arrow does not extend beyond displayInsets
  if (
    anchorPoint.y + arrowSize.width >
    windowDims.height - displayInsets.bottom
  ) {
    anchorPoint.y =
      windowDims.height -
      displayInsets.bottom -
      Math.abs(arrowSize.height - arrowSize.width) -
      8;
  } else if (anchorPoint.y - arrowSize.height < displayInsets.top) {
    anchorPoint.y =
      displayInsets.top + Math.abs(arrowSize.height - arrowSize.width) + 8;
  }

  if (
    tooltipOrigin.x + contentSize.width >
    windowDims.width - displayInsets.right
  ) {
    adjustedContentSize.width =
      windowDims.width - displayInsets.right - tooltipOrigin.x;
  }

  if (tooltipOrigin.y + contentSize.height > maxHeight) {
    tooltipOrigin.y =
      windowDims.height - displayInsets.bottom - adjustedContentSize.height;
  }

  return {
    tooltipOrigin,
    anchorPoint,
    placement: "right",
    adjustedContentSize,
  };
};

export {
  Point,
  Size,
  Rect,
  swapSizeDimensions,
  makeChildlessRect,
  computeCenterGeometry,
  computeTopGeometry,
  computeBottomGeometry,
  computeLeftGeometry,
  computeRightGeometry,
};
