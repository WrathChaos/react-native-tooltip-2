import { Point, Rect, Size } from "./geometry";
import { ScaledSize } from "react-native";

export enum Placement {
  TOP = "top",
  LEFT = "left",
  RIGHT = "right",
  BOTTOM = "bottom",
  CENTER = "center",
}

export type PlacementType = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

export type PlacementStyle = {
  anchorPoint: Point;
  arrowSize: Size;
  placement: Placement;
  tooltipOrigin: Point;
};

export type RectType = {
  displayInsets: PlacementType;
  windowDims: ScaledSize;
  placement: Placement;
};

export type GeometryType = {
  childRect: Rect;
  arrowSize: Size;
  contentSize: Size;
  windowDims: ScaledSize;
  displayInsets: PlacementType;
  childContentSpacing: number;
};
