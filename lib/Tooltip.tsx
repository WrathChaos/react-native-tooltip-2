import React, { Component } from "react";
import {
  Dimensions,
  InteractionManager,
  Modal,
  ScaledSize,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import rfcIsEqual from "react-fast-compare";
import {
  computeBottomGeometry,
  computeCenterGeometry,
  computeLeftGeometry,
  computeRightGeometry,
  computeTopGeometry,
  makeChildlessRect,
  Point,
  Rect,
  Size,
  swapSizeDimensions,
} from "./geometry";
import styleGenerator from "./Tooltip.style";
import TooltipChildrenContext from "./TooltipChildren.context";
import { Placement, PlacementType } from "./Tooltip.type";

export { TooltipChildrenContext };

const DEFAULT_DISPLAY_INSETS = {
  top: 24,
  bottom: 24,
  left: 24,
  right: 24,
};

const computeDisplayInsets = (insetsFromProps: PlacementType) =>
  Object.assign({}, DEFAULT_DISPLAY_INSETS, insetsFromProps);

const invertPlacement = (placement: Placement) => {
  switch (placement) {
    case Placement.TOP:
      return Placement.BOTTOM;
    case Placement.BOTTOM:
      return Placement.TOP;
    case Placement.RIGHT:
      return Placement.LEFT;
    case Placement.LEFT:
      return Placement.RIGHT;
    default:
      return placement;
  }
};

export type TooltipProps = typeof Tooltip.defaultProps & {
  isVisible: boolean;
  onClose: () => void;
  content?: any;
  children?: any;
  modalComponent?: any;
  accessible?: boolean;
  topAdjustment?: number;
  disableShadow?: boolean;
  backgroundColor?: string;
  childContentSpacing?: number;
  showChildInTooltip?: boolean;
  useReactNativeModal?: boolean;
  horizontalAdjustment?: number;
  allowChildInteraction?: boolean;
  useInteractionManager?: boolean;
  supportedOrientations?: string[];
  closeOnChildInteraction?: boolean;
  closeOnContentInteraction?: boolean;
  closeOnBackgroundInteraction?: boolean;
  arrowSize?: Size;
  placement?: Placement;
  displayInsets?: PlacementType;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundStyle?: StyleProp<ViewStyle>;
  parentWrapperStyle?: StyleProp<ViewStyle>;
  childrenWrapperStyle?: StyleProp<ViewStyle>;
};

interface TooltipState {
  waitingForInteractions: boolean;
  contentSize: Size;
  adjustedContentSize: Size;
  anchorPoint: Point;
  tooltipOrigin: Point;
  childRect: Rect;
  measurementsFinished: boolean | number;
  windowDims: ScaledSize;
  displayInsets: PlacementType;
  // if we have no children, and place the tooltip at the "top" we want it to
  // behave like placement "bottom", i.e. display below the top of the screen
  placement: Placement;
}

class Tooltip extends Component<TooltipProps, TooltipState> {
  static defaultProps = {
    allowChildInteraction: true,
    arrowSize: new Size(16, 8),
    backgroundColor: "rgba(0,0,0,0.5)",
    childContentSpacing: 4,
    children: null,
    closeOnChildInteraction: true,
    closeOnContentInteraction: true,
    closeOnBackgroundInteraction: true,
    content: <View />,
    displayInsets: {},
    disableShadow: false,
    isVisible: false,
    onClose: () => {
      console.warn("[react-native-tooltip-2] onClose prop not provided");
    },
    placement: Placement.CENTER, // Falls back to "top" if there ARE children
    showChildInTooltip: true,
    supportedOrientations: ["portrait", "landscape"],
    useInteractionManager: false,
    useReactNativeModal: true,
    topAdjustment: 0,
    horizontalAdjustment: 0,
    accessible: true,
  };

  isMeasuringChild: boolean;
  interactionPromise: {
    then: (onfulfilled?: () => any, onrejected?: () => any) => Promise<any>;
    done: (...args: any[]) => any;
    cancel: () => void;
  } | null;
  dimensionsSubscription: any;
  childWrapper: React.RefObject<View>;

  constructor(props: TooltipProps) {
    super(props);

    const {
      isVisible,
      useInteractionManager = Tooltip.defaultProps.useInteractionManager,
    } = props;

    this.isMeasuringChild = false;
    this.interactionPromise = null;
    this.dimensionsSubscription = null;

    this.childWrapper = React.createRef();
    this.state = {
      // No need to wait for interactions if not visible initially
      waitingForInteractions: isVisible && useInteractionManager,
      contentSize: new Size(0, 0),
      adjustedContentSize: new Size(0, 0),
      anchorPoint: new Point(0, 0),
      tooltipOrigin: new Point(0, 0),
      childRect: new Rect(0, 0, 0, 0),
      displayInsets: computeDisplayInsets(props.displayInsets),
      // if we have no children, and place the tooltip at the "top" we want it to
      // behave like placement "bottom", i.e. display below the top of the screen
      placement:
        React.Children.count(props.children) === 0
          ? invertPlacement(props.placement)
          : props.placement,
      measurementsFinished: false,
      windowDims: Dimensions.get("window"),
    };
  }

  componentDidMount() {
    this.dimensionsSubscription = Dimensions.addEventListener(
      "change",
      this.updateWindowDims,
    );
  }

  componentDidUpdate(prevProps: TooltipProps, prevState: TooltipState) {
    const { content, isVisible, placement } = this.props;
    const { displayInsets } = this.state;

    const contentChanged = !rfcIsEqual(prevProps.content, content);
    const placementChanged = prevProps.placement !== placement;
    const becameVisible = isVisible && !prevProps.isVisible;
    const insetsChanged = !rfcIsEqual(prevState.displayInsets, displayInsets);

    if (contentChanged || placementChanged || becameVisible || insetsChanged) {
      setTimeout(() => {
        this.measureChildRect();
      });
    }
  }

  componentWillUnmount() {
    if (this.dimensionsSubscription?.remove) {
      // react native >= 0.65.*
      this.dimensionsSubscription.remove();
    } else {
      // react native < 0.65.*
      // @ts-ignore
      Dimensions.removeEventListener("change", this.updateWindowDims);
    }

    if (this.interactionPromise) {
      this.interactionPromise.cancel();
    }
  }

  static getDerivedStateFromProps(
    nextProps: TooltipProps,
    prevState: TooltipState,
  ) {
    const nextState = {
      placement: prevState.placement,
      displayInsets: prevState.displayInsets,
      measurementsFinished: prevState.measurementsFinished,
      adjustedContentSize: prevState.adjustedContentSize,
    };

    // update placement in state if the prop changed
    const nextPlacement =
      React.Children.count(nextProps.children) === 0
        ? invertPlacement(nextProps.placement)
        : nextProps.placement;

    if (nextPlacement !== prevState.placement) {
      nextState.placement = nextPlacement || Placement.CENTER;
    }

    // update computed display insets if they changed
    const nextDisplayInsets = computeDisplayInsets(nextProps.displayInsets);
    if (!rfcIsEqual(nextDisplayInsets, prevState.displayInsets)) {
      nextState.displayInsets = nextDisplayInsets;
    }

    // set measurements finished flag to false when tooltip closes
    if (prevState.measurementsFinished && !nextProps.isVisible) {
      nextState.measurementsFinished = false;
      nextState.adjustedContentSize = new Size(0, 0);
    }

    if (Object.keys(nextState).length) {
      return nextState;
    }

    return null;
  }

  updateWindowDims = (dims: any) => {
    this.setState(
      {
        windowDims: dims.window,
        contentSize: new Size(0, 0),
        adjustedContentSize: new Size(0, 0),
        anchorPoint: new Point(0, 0),
        tooltipOrigin: new Point(0, 0),
        childRect: new Rect(0, 0, 0, 0),
        measurementsFinished: false,
      },
      () => {
        setTimeout(() => {
          this.measureChildRect();
        }, 500); // give the rotation a moment to finish
      },
    );
  };

  doChildlessPlacement = () => {
    this.onChildMeasurementComplete(
      makeChildlessRect({
        displayInsets: this.state.displayInsets,
        placement: this.state.placement, // MUST use from state, not props
        windowDims: this.state.windowDims,
      }),
    );
  };

  measureContent = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    const contentSize = new Size(width, height);
    this.setState({ contentSize }, () => {
      this.computeGeometry();
    });
  };

  onChildMeasurementComplete = (rect: Rect) => {
    this.setState(
      {
        childRect: rect,
        waitingForInteractions: false,
      },
      () => {
        this.isMeasuringChild = false;
        if (this.state.contentSize.width) {
          this.computeGeometry();
        }
      },
    );
  };

  measureChildRect = () => {
    const doMeasurement = () => {
      if (!this.isMeasuringChild) {
        this.isMeasuringChild = true;
        if (
          this.childWrapper.current &&
          typeof this.childWrapper.current.measure === "function"
        ) {
          this.childWrapper.current.measure(
            (x, y, width, height, pageX, pageY) => {
              const childRect = new Rect(pageX, pageY, width, height);
              if (
                Object.values(childRect).every((value) => value !== undefined)
              ) {
                this.onChildMeasurementComplete(childRect);
              } else {
                this.doChildlessPlacement();
              }
            },
          );
        } else {
          this.doChildlessPlacement();
        }
      }
    };

    if (this.props.useInteractionManager) {
      if (this.interactionPromise) {
        this.interactionPromise.cancel();
      }
      this.interactionPromise = InteractionManager.runAfterInteractions(() => {
        doMeasurement();
      });
    } else {
      doMeasurement();
    }
  };

  computeGeometry = () => {
    const { arrowSize = Tooltip.defaultProps.arrowSize, childContentSpacing } =
      this.props;
    const { childRect, contentSize, displayInsets, placement, windowDims } =
      this.state;

    const options = {
      displayInsets,
      childRect,
      windowDims,
      arrowSize:
        placement === Placement.TOP || placement === Placement.BOTTOM
          ? arrowSize
          : swapSizeDimensions(arrowSize),
      contentSize,
      childContentSpacing,
    };

    let geom = computeTopGeometry(options);

    // Special case for centered, childless placement tooltip
    if (
      placement === "center" &&
      React.Children.count(this.props.children) === 0
    ) {
      geom = computeCenterGeometry(options);
    } else {
      switch (placement) {
        case Placement.BOTTOM:
          geom = computeBottomGeometry(options);
          break;
        case Placement.LEFT:
          geom = computeLeftGeometry(options);
          break;
        case Placement.RIGHT:
          geom = computeRightGeometry(options);
          break;
        case Placement.TOP:
        default:
          break; // Computed just above if-else-block
      }
    }

    const { tooltipOrigin, anchorPoint, adjustedContentSize } = geom;

    this.setState({
      tooltipOrigin,
      anchorPoint,
      placement,
      measurementsFinished: childRect.width && contentSize.width,
      adjustedContentSize,
    });
  };

  renderChildInTooltip = () => {
    let { height, width, x, y } = this.state.childRect;

    if (this.props.horizontalAdjustment) {
      x = x + this.props.horizontalAdjustment;
    }

    const onTouchEnd = () => {
      if (this.props.closeOnChildInteraction) {
        this.props.onClose();
      }
    };

    return (
      <TooltipChildrenContext.Provider value={{ tooltipDuplicate: true }}>
        <View
          onTouchEnd={onTouchEnd}
          pointerEvents={this.props.allowChildInteraction ? "box-none" : "none"}
          style={[
            {
              position: "absolute",
              height,
              width,
              top: y,
              left: x,
              alignItems: "center",
              justifyContent: "center",
            },
            this.props.childrenWrapperStyle,
          ]}
        >
          {this.props.children}
        </View>
      </TooltipChildrenContext.Provider>
    );
  };

  renderContentForTooltip = () => {
    const generatedStyles = styleGenerator({
      adjustedContentSize: this.state.adjustedContentSize,
      anchorPoint: this.state.anchorPoint,
      arrowSize: this.props.arrowSize,
      displayInsets: this.state.displayInsets,
      measurementsFinished: this.state.measurementsFinished,
      ownProps: { ...this.props },
      placement: this.state.placement,
      tooltipOrigin: this.state.tooltipOrigin,
      topAdjustment: this.props.topAdjustment,
    });

    const hasChildren = React.Children.count(this.props.children) > 0;

    const onPressBackground = () => {
      if (this.props.closeOnBackgroundInteraction) {
        this.props.onClose();
      }
    };

    const onPressContent = () => {
      if (this.props.closeOnContentInteraction) {
        this.props.onClose();
      }
    };

    return (
      <TouchableWithoutFeedback
        onPress={onPressBackground}
        accessible={this.props.accessible}
      >
        <View style={generatedStyles.containerStyle}>
          <View
            style={[
              generatedStyles.backgroundStyle,
              this.props.backgroundStyle,
            ]}
          >
            <View style={generatedStyles.tooltipStyle}>
              {hasChildren ? <View style={generatedStyles.arrowStyle} /> : null}
              <View
                onLayout={this.measureContent}
                style={generatedStyles.contentStyle}
              >
                <TouchableWithoutFeedback
                  onPress={onPressContent}
                  accessible={this.props.accessible}
                >
                  {this.props.content}
                </TouchableWithoutFeedback>
              </View>
            </View>
          </View>
          {hasChildren && this.props.showChildInTooltip
            ? this.renderChildInTooltip()
            : null}
        </View>
      </TouchableWithoutFeedback>
    );
  };

  render() {
    const { children, isVisible, useReactNativeModal, modalComponent } =
      this.props;

    const hasChildren = React.Children.count(children) > 0;
    const showTooltip = isVisible && !this.state.waitingForInteractions;
    const ModalComponent = modalComponent || Modal;

    return (
      <React.Fragment>
        {useReactNativeModal ? (
          <ModalComponent
            transparent
            visible={showTooltip}
            onRequestClose={this.props.onClose}
            supportedOrientations={this.props.supportedOrientations}
          >
            {this.renderContentForTooltip()}
          </ModalComponent>
        ) : null}

        {/* This renders the child element in place in the parent's layout */}
        {hasChildren ? (
          <View
            ref={this.childWrapper}
            onLayout={this.measureChildRect}
            style={this.props.parentWrapperStyle}
          >
            {children}
          </View>
        ) : null}

        {!useReactNativeModal && showTooltip
          ? this.renderContentForTooltip()
          : null}
      </React.Fragment>
    );
  }
}

Tooltip.defaultProps = Tooltip.defaultProps;

export default Tooltip;
