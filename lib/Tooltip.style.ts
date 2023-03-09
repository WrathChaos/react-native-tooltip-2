import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { Placement, PlacementStyle } from "./Tooltip.type";

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
    backgroundColor: "transparent",
    zIndex: 500,
  },
  containerVisible: {
    opacity: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  tooltip: {
    backgroundColor: "transparent",
    position: "absolute",
  },
  shadow: {
    shadowRadius: 3,
    shadowOpacity: 0.4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  content: {
    borderRadius: 12,
    padding: 8,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  arrow: {
    position: "absolute",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
});

const arrowRotationForPlacement = (placement: Placement) => {
  switch (placement) {
    case "bottom":
      return "180deg";
    case "left":
      return "-90deg";
    case "right":
      return "90deg";
    default:
      return "0deg";
  }
};
const arrowPlacementStyles = (params: PlacementStyle) => {
  const { anchorPoint, arrowSize, placement, tooltipOrigin } = params;
  // Create the arrow from a rectangle with the appropriate borderXWidth set
  // A rotation is then applied depending on the placement
  // Also make it slightly bigger
  // to fix a visual artifact when the tooltip is animated with a scale
  const width = arrowSize.width + 2;
  const height = arrowSize.height * 2 + 2;
  let marginTop = 0;
  let marginLeft = 0;

  if (placement === Placement.BOTTOM) {
    marginTop = arrowSize.height;
  } else if (placement === Placement.RIGHT) {
    marginLeft = arrowSize.height;
  }

  return {
    left: anchorPoint.x - tooltipOrigin.x - (width / 2 - marginLeft),
    top: anchorPoint.y - tooltipOrigin.y - (height / 2 - marginTop),
    width,
    height,
    borderTopWidth: height / 2,
    borderRightWidth: width / 2,
    borderBottomWidth: height / 2,
    borderLeftWidth: width / 2,
  };
};

const getArrowRotation = (
  arrowStyle: StyleProp<ViewStyle>,
  placement: Placement,
) => {
  // prevent rotation getting incorrectly overwritten
  const arrowRotation = arrowRotationForPlacement(placement);
  const transform = (StyleSheet.flatten(arrowStyle).transform || []).slice(0);
  transform.unshift({ rotate: arrowRotation });

  return { transform };
};

const tooltipPlacementStyles = (
  params: Exclude<PlacementStyle, "anchorPoint">,
) => {
  const { arrowSize, placement, tooltipOrigin } = params;
  const { height } = arrowSize;

  switch (placement) {
    case Placement.BOTTOM:
      return {
        paddingTop: height,
        top: tooltipOrigin.y - height,
        left: tooltipOrigin.x,
      };
    case Placement.TOP:
      return {
        paddingBottom: height,
        top: tooltipOrigin.y,
        left: tooltipOrigin.x,
      };
    case Placement.RIGHT:
      return {
        paddingLeft: height,
        top: tooltipOrigin.y,
        left: tooltipOrigin.x - height,
      };
    case Placement.LEFT:
      return {
        paddingRight: height,
        top: tooltipOrigin.y,
        left: tooltipOrigin.x,
      };
    case Placement.CENTER:
    default:
      return {
        top: tooltipOrigin.y,
        left: tooltipOrigin.x,
      };
  }
};

// TODO(kuray): Fix the any type
const styleGenerator = (styleGeneratorProps: any) => {
  const {
    adjustedContentSize,
    displayInsets,
    measurementsFinished,
    ownProps,
    placement,
    topAdjustment,
  } = styleGeneratorProps;

  const { height, width } = adjustedContentSize;
  const { backgroundColor } = ownProps;

  const contentStyle = [
    styles.content,
    height > 0 && { height }, // ignore special case of -1 with center placement (and 0 when not yet measured)
    width > 0 && { width }, // ignore special case of -1 with center placement (and 0 when not yet measured)
    ownProps.contentStyle,
  ];

  const contentBackgroundColor =
    StyleSheet.flatten(contentStyle).backgroundColor;

  const arrowStyle = [
    styles.arrow,
    arrowPlacementStyles(styleGeneratorProps),
    { borderTopColor: contentBackgroundColor },
    ownProps.arrowStyle,
  ];

  return {
    arrowStyle: [...arrowStyle, getArrowRotation(arrowStyle, placement)],
    backgroundStyle: [
      styles.background,
      ownProps.backgroundStyle,
      {
        paddingTop: displayInsets.top,
        paddingLeft: displayInsets.left,
        paddingRight: displayInsets.right,
        paddingBottom: displayInsets.bottom,
        backgroundColor,
      },
    ],
    containerStyle: [
      styles.container,
      StyleSheet.compose(
        adjustedContentSize.width !== 0 &&
          measurementsFinished &&
          styles.containerVisible,
        topAdjustment !== 0 && {
          top: topAdjustment,
        },
      ),
    ],
    contentStyle,
    tooltipStyle: [
      StyleSheet.compose(
        styles.tooltip,
        ownProps.disableShadow ? {} : styles.shadow,
      ),
      tooltipPlacementStyles(styleGeneratorProps),
      ownProps.tooltipStyle,
    ],
  };
};

export default styleGenerator;
