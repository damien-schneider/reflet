import type { ComponentProps, CSSProperties, MouseEvent, ReactElement, ReactNode, Ref } from "react";
import type {
  AccordionKnobStyle,
  CollapsibleKnobStyle,
  ActivityKnobStyle,
  AlertKnobStyle,
  AudioVisualizerKnobStyle,
  AvatarKnobStyle,
  BadgeKnobStyle,
  ButtonGroupKnobStyle,
  ButtonKnobStyle,
  CardKnobStyle,
  ChatComposerKnobStyle,
  ChatMessageKnobStyle,
  ChoiceKnobStyle,
  ColorPickerKnobStyle,
  ContextKnobStyle,
  DockablePanelKnobStyle,
  DynamicNotificationKnobStyle,
  EmptyKnobStyle,
  FieldKnobStyle,
  GradientEditorKnobStyle,
  InfiniteCanvasKnobStyle,
  ItemKnobStyle,
  KbdKnobStyle,
  LabelKnobStyle,
  MarkdownKnobStyle,
  MorphingPanelKnobStyle,
  PaginationKnobStyle,
  PopupKnobStyle,
  RangeKnobStyle,
  ResizableKnobStyle,
  ScrollAreaKnobStyle,
  SidebarKnobStyle,
  SpinnerKnobStyle,
  StepperKnobStyle,
  SwitchKnobStyle,
  TableKnobStyle,
  TableOfContentsKnobStyle,
  TabsKnobStyle,
  TaskListKnobStyle,
  ThreadRailKnobStyle,
  TimelineKnobStyle,
  ToastKnobStyle,
  ToolbarKnobStyle,
  TranscriptDividerKnobStyle,
  TreeKnobStyle,
  UserAskKnobStyle,
} from "./knob-contracts";
export type ControlledChoice<TValue extends string = string> = {
  value?: TValue;
  defaultValue?: NoInfer<TValue>;
  onValueChange?: (value: TValue) => void;
};
export type ControlledMultiChoice<TValue extends string = string> = {
  value?: TValue[];
  defaultValue?: NoInfer<TValue>[];
  onValueChange?: (value: TValue[]) => void;
};
export type ChatRole = "user" | "assistant" | "system" | "tool";
export type ChatDensity = "compact" | "comfortable";
export type ChatState = "idle" | "streaming" | "pending" | "error";
export type ChatTone = "neutral" | "success" | "warning" | "danger";
export type InlineAttachmentState = "ready" | "pending" | "error";
export type DropzoneSelectionMode = "append" | "replace";
export type DropzoneVisualState = "idle" | "accept" | "reject" | "unknown" | "processing";
export type DropzoneOverlayScope = "local" | "global";
export type DropzoneValueChangeReason = "drop" | "input" | "remove" | "clear";
export type ChatMessageProps = ComponentProps<"article"> & {
  from: ChatRole;
  state?: ChatState;
  density?: ChatDensity;
  tone?: ChatTone;
} & { style?: CSSProperties & ChatMessageKnobStyle };
export type ChatComposerSubmitPayload = {
  value: string;
  clear: () => void;
  mentions?: MentionItem[];
};
export type ChatComposerProps = Omit<ComponentProps<"form">, "onSubmit" | "style"> & {
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (payload: ChatComposerSubmitPayload) => void | Promise<void>;
  state?: "idle" | "submitting" | "disabled";
  density?: ChatDensity;
  disabled?: boolean;
  style?: CSSProperties & ChatComposerKnobStyle;
};
export type ActivityState = "pending" | "running" | "success" | "error";
export type ActivityKind = "default" | "tool" | "reasoning" | "signal";
export type ActivityDetailFormat = "text" | "code";
export type ActivityProps = Omit<CollapsibleProps, "children" | "style"> & {
  children?: ReactNode;
  kind?: ActivityKind;
  name?: string;
  state?: ActivityState;
  statusLabel?: ReactNode;
  style?: CSSProperties & ActivityKnobStyle;
};
export type TranscriptDividerProps = Omit<ComponentProps<"div">, "style"> & {
  tone?: ChatTone;
  style?: CSSProperties & TranscriptDividerKnobStyle;
};
export type ContextSegmentKind = "system" | "tool" | "message" | "source" | "reasoning" | "cache" | "other";
export type ContextStatus = "normal" | "over-limit" | "unavailable";
export type ContextSegment = {
  id: string;
  label: string;
  tokens: number;
  kind?: ContextSegmentKind;
  description?: ReactNode;
};
export type ContextProps = Omit<ComponentProps<"div">, "children"> & {
  segments: readonly ContextSegment[];
  maxTokens?: number | null;
  model?: string;
  locale?: Intl.LocalesArgument;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  children?: ReactNode;
} & { style?: CSSProperties & ContextKnobStyle };
export type SourceReference = {
  href: string;
  title?: string;
  description?: string;
  quote?: string;
  faviconSrc?: string | false;
};
export type UserAskAnswers = Record<string, string>;
export type UserAskProps = Omit<ComponentProps<"section">, "style"> & {
  children?: ReactNode;
  onComplete?: (answers: UserAskAnswers) => void;
  onDismiss?: () => void;
  style?: CSSProperties & UserAskKnobStyle;
};
export type AudioVisualizerVariant = "bars" | "line";
export type AudioVisualizerProps = Omit<ComponentProps<"div">, "children" | "style"> & {
  levels: readonly number[];
  active?: boolean;
  points?: number;
  style?: CSSProperties & AudioVisualizerKnobStyle;
};
export type ToasterProps = {
  className?: string;
  timeout?: number;
  limit?: number;
  rootStyle?: CSSProperties & ToastKnobStyle;
  indicatorStyle?: CSSProperties & ToastKnobStyle;
  actionStyle?: CSSProperties & ToastKnobStyle;
  closeStyle?: CSSProperties & ToastKnobStyle;
};
export type ThreadRailProps = ComponentProps<"nav"> & { style?: CSSProperties & ThreadRailKnobStyle };
export type ThreadRailItemProps = Omit<ComponentProps<"div">, "style"> & {
  from?: ChatRole;
  inView?: boolean;
  active?: boolean;
  style?: CSSProperties & ThreadRailKnobStyle;
};
export type RenderProp<Props, State extends Record<string, unknown> = Record<string, unknown>> =
  | ReactElement
  | ((props: Props, state: State) => ReactElement<unknown>);
export type ControlSize = "xs" | "sm" | "md" | "lg";
export type ControlEffect = "top-shine" | "ripple" | "hover-circle";
export const buttonVariants = ["solid", "surface", "ghost", "quiet"] as const;
export type ButtonVariant = (typeof buttonVariants)[number];
export type ButtonSize = ControlSize;
export const buttonTones = ["neutral", "primary", "danger"] as const;
export type ButtonTone = (typeof buttonTones)[number];
export const buttonShapes = ["default", "circle"] as const;
export type ButtonShape = (typeof buttonShapes)[number];
export type ButtonAppearanceProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  active?: boolean;
  iconOnly?: boolean;
  shape?: ButtonShape;
  style?: CSSProperties & ButtonKnobStyle;
};
export type ButtonProps = ComponentProps<"button"> &
  ButtonAppearanceProps & {
    render?: RenderProp<ComponentProps<"button">, { disabled: boolean }>;
    nativeButton?: boolean;
  };
export type ButtonLinkProps = ComponentProps<"a"> &
  ButtonAppearanceProps & {
    render?: RenderProp<ComponentProps<"a">>;
  };
export type ButtonLabelProps = ComponentProps<"label"> & ButtonAppearanceProps;
export const popupParts = [
  "backdrop",
  "surface",
  "list-surface",
  "list-content",
  "bar",
  "item",
  "navigation-link",
  "label",
  "separator",
  "shortcut",
] as const;
export type PopupPart = (typeof popupParts)[number];
export type OpenChangeReason =
  | "trigger-hover"
  | "trigger-focus"
  | "trigger-press"
  | "outside-press"
  | "escape-key"
  | "close-watcher"
  | "close-press"
  | "focus-out"
  | "list-navigation"
  | "item-press"
  | "sibling-open"
  | "cancel-open"
  | "input-change"
  | "input-clear"
  | "input-press"
  | "clear-press"
  | "chip-remove-press"
  | "imperative-action"
  | "swipe"
  | "none";
export type OpenChangeEventDetails = {
  reason: OpenChangeReason;
  event: Event;
  cancel: () => void;
  allowPropagation: () => void;
  isCanceled: boolean;
  isPropagationAllowed: boolean;
  trigger: Element | undefined;
};
export type CollapsibleProps = Omit<ComponentProps<"div">, "onChange"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  children?: ReactNode;
} & { style?: CSSProperties & CollapsibleKnobStyle };
export type CollapsibleTriggerProps = Omit<ComponentProps<"button">, "style"> & {
  "data-slot"?: string;
  render?: RenderProp<ComponentProps<"button">, { open: boolean }>;
  nativeButton?: boolean;
  style?: CSSProperties & CollapsibleKnobStyle;
};
export type CollapsibleContentProps = ComponentProps<"div"> & {
  "data-slot"?: string;
  keepMounted?: boolean;
} & { style?: CSSProperties & CollapsibleKnobStyle };
export type MorphingPanelDimensions = { width: string; height: string };
export type MorphingPanelProps = Omit<CollapsibleProps, "style"> & {
  collapsedSize: MorphingPanelDimensions;
  expandedSize: MorphingPanelDimensions;
  style?: CSSProperties & MorphingPanelKnobStyle;
};
export type MorphingPanelTriggerProps = Omit<CollapsibleTriggerProps, "style"> & {
  style?: CSSProperties & MorphingPanelKnobStyle;
};
export type MorphingPanelContentProps = Omit<CollapsibleContentProps, "style"> & {
  style?: CSSProperties & MorphingPanelKnobStyle;
};
export type TaskStatus = "pending" | "active" | "completed";
export type TaskListProps = Omit<CollapsibleProps, "style"> & { style?: CSSProperties & TaskListKnobStyle };
export type TabsProps<TValue extends string = string> = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> &
  ControlledChoice<TValue> & { style?: CSSProperties & TabsKnobStyle };
export type TabsListVariant = "default" | "browser";
export type TabsListProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & TabsKnobStyle } & {
  size?: ControlSize;
  variant?: TabsListVariant;
};
export type TabsTabProps = Omit<Omit<ComponentProps<"button">, "value">, "style"> & { style?: CSSProperties & TabsKnobStyle } & {
  value: string;
  render?: RenderProp<ComponentProps<"button">, { active: boolean; disabled: boolean }>;
  nativeButton?: boolean;
};
export type TabsPanelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & TabsKnobStyle } & {
  value: string;
};
export type TimelineState = "neutral" | "pending" | "running" | "success" | "error";
export type TimelineProps = ComponentProps<"ol"> & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineItemProps = ComponentProps<"li"> & {
  state?: TimelineState;
} & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineIndicatorProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineSeparatorProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineContentProps = ComponentProps<"div"> & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineTitleProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineDescriptionProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & TimelineKnobStyle };
export type TimelineMetaProps = ComponentProps<"div"> & { style?: CSSProperties & TimelineKnobStyle };
export type StepperOrientation = "horizontal" | "vertical";
export type StepperContentMode = "current" | "all";
export type StepperState = "neutral" | "complete" | "current" | "upcoming";
export type StepperProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number) => void;
  orientation?: StepperOrientation;
  contentMode?: StepperContentMode;
  responsive?: boolean;
} & { style?: CSSProperties & StepperKnobStyle };
export type StepperListProps = ComponentProps<"ol"> & { style?: CSSProperties & StepperKnobStyle };
export type StepperItemProps = Omit<ComponentProps<"li">, "value"> & {
  step: number;
  disabled?: boolean;
  invalid?: boolean;
} & { style?: CSSProperties & StepperKnobStyle };
export type StepperTriggerProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & StepperKnobStyle };
export type StepperIndicatorProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & StepperKnobStyle };
export type StepperSeparatorProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & StepperKnobStyle };
export type StepperTitleProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & StepperKnobStyle };
export type StepperDescriptionProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & StepperKnobStyle };
export type StepperContentProps = ComponentProps<"section"> & {
  step: number;
  keepMounted?: boolean;
} & { style?: CSSProperties & StepperKnobStyle };
export const sidebarMenuButtonVariants = ["default", "outline"] as const;
export type SidebarMenuButtonVariant = (typeof sidebarMenuButtonVariants)[number];
export const sidebarMenuButtonSizes = ["default", "sm", "lg"] as const;
export type SidebarMenuButtonSize = (typeof sidebarMenuButtonSizes)[number];
export type SidebarRailProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & SidebarKnobStyle };
export type SidebarInsetProps = Omit<ComponentProps<"main">, "style"> & { style?: CSSProperties & SidebarKnobStyle };
export type SidebarGroupLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & SidebarKnobStyle } & {
  render?: RenderProp<ComponentProps<"div">>;
};
export type SidebarMenuButtonProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & SidebarKnobStyle } & {
  render?: RenderProp<ComponentProps<"button">>;
  isActive?: boolean;
  tooltip?: ReactNode;
  variant?: SidebarMenuButtonVariant;
  size?: SidebarMenuButtonSize;
};
export type TreeSelectionMode = "none" | "single" | "multiple";
export type TreeInteractionReason = "pointer" | "keyboard" | "imperative";
export type TreeSelectionChangeDetails = {
  value: string;
  reason: TreeInteractionReason;
};
export type TreeExpandedChangeDetails = {
  value: string;
  expanded: boolean;
  reason: TreeInteractionReason;
};
export type SelectionIndicator = "none" | "slide";
export const SIDEBAR_COOKIE_NAME = "sidebar_state";
export type TreeSelectionIndicator = SelectionIndicator;
export type TreeProps = Omit<Omit<ComponentProps<"ul">, "onChange" | "defaultValue">, "style"> & {
  style?: CSSProperties & TreeKnobStyle;
} & {
  selectionMode?: TreeSelectionMode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[], details: TreeSelectionChangeDetails) => void;
  expandedValue?: string[];
  defaultExpandedValue?: string[];
  onExpandedChange?: (expanded: string[], details: TreeExpandedChangeDetails) => void;
  indicator?: TreeSelectionIndicator;
};
export type TreeItemProps = Omit<ComponentProps<"li">, "value"> & {
  value: string;
  disabled?: boolean;
  label?: string;
  children?: ReactNode;
};
export type TreeItemTriggerProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & TreeKnobStyle } & {
  render?: RenderProp<ComponentProps<"div">>;
};
export type TreeItemIndicatorProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & TreeKnobStyle };
export type TreeItemLabelProps = ComponentProps<"span"> & {
  render?: RenderProp<ComponentProps<"span">>;
};
export type TreeItemContentProps = ComponentProps<"div"> & { style?: CSSProperties & TreeKnobStyle };
export const scrollAreaScrollbarVisibilities = ["scroll", "hover", "always"] as const;
export type ScrollAreaScrollbarVisibility = (typeof scrollAreaScrollbarVisibilities)[number];
export type ScrollAreaLockAxis = "x" | "y" | "both";
export type ScrollAreaViewportProps = Omit<ComponentProps<"div">, "children" | "className" | "ref"> & {
  "data-control-ui"?: string;
  "data-control-family"?: string;
  "data-slot"?: string;
};
export type ScrollAreaProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ScrollAreaKnobStyle } & {
  viewportClassName?: string;
  viewportProps?: ScrollAreaViewportProps;
  viewportRef?: Ref<HTMLDivElement>;
  maxHeight?: string;
  mask?: boolean;
  lockAxis?: ScrollAreaLockAxis;
  scrollbarVisibility?: ScrollAreaScrollbarVisibility;
};
export type TocItem = {
  href: string;
  label: string;
  level?: number;
  children?: TocItem[];
};
export const tableOfContentsVariants = ["background", "trail", "both"] as const;
export type TableOfContentsVariant = (typeof tableOfContentsVariants)[number];
export type TableOfContentsProps = Omit<Omit<ComponentProps<"nav">, "children">, "style"> & {
  style?: CSSProperties & TableOfContentsKnobStyle;
} & {
  items: TocItem[];
  label?: string;
  variant?: TableOfContentsVariant;
};
export type SelectProps<TValue extends string = string> = ControlledChoice<TValue> & {
  disabled?: boolean;
  name?: string;
  children?: ReactNode;
};
export const selectTriggerVariants = ["surface", "ghost"] as const;
export type SelectTriggerVariant = (typeof selectTriggerVariants)[number];
export type SelectTriggerProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & ButtonKnobStyle } & {
  size?: ControlSize;
  variant?: SelectTriggerVariant;
};
export type SelectValueProps = {
  placeholder?: ReactNode;
  children?: ReactNode | ((value: string) => ReactNode);
};
export type SelectContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type SelectItemProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  value: string;
  label?: string;
  disabled?: boolean;
};
export type DropdownMenuProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export const dropdownMenuTriggerVariants = ["surface", "ghost"] as const;
export type DropdownMenuTriggerVariant = (typeof dropdownMenuTriggerVariants)[number];
export type DropdownMenuTriggerProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & ButtonKnobStyle } & {
  size?: ControlSize;
  iconOnly?: boolean;
  variant?: DropdownMenuTriggerVariant;
};
export type DropdownMenuContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type DropdownMenuItemProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
};
export type DropdownMenuSeparatorProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type DropdownMenuLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export const popoverContentPaddings = ["default", "none"] as const;
export type PopoverContentPadding = (typeof popoverContentPaddings)[number];
export type RichTooltipTone = "accent" | "surface";
export type RichTooltipProgressVariant = "count" | "dots";
export type ContextMenuProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type ContextMenuTriggerProps = ComponentProps<"div"> & { style?: CSSProperties & PopupKnobStyle };
export type ContextMenuGroupProps = ComponentProps<"div"> & { style?: CSSProperties & PopupKnobStyle };
export type ContextMenuContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ContextMenuItemProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  disabled?: boolean;
  inset?: boolean;
  onClick?: (event: MouseEvent) => void;
};
export type ContextMenuCheckboxItemProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & {
  style?: CSSProperties & PopupKnobStyle;
} & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};
export type ContextMenuRadioGroupProps<TValue extends string = string> = ComponentProps<"div"> &
  Omit<ControlledChoice<TValue>, "defaultValue"> & { style?: CSSProperties & PopupKnobStyle };
export type ContextMenuRadioItemProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & {
  style?: CSSProperties & PopupKnobStyle;
} & {
  value: string;
  disabled?: boolean;
};
export type ContextMenuLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  inset?: boolean;
};
export type ContextMenuSeparatorProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ContextMenuShortcutProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ContextMenuSubProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type ContextMenuSubTriggerProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & {
  style?: CSSProperties & PopupKnobStyle;
} & {
  disabled?: boolean;
  inset?: boolean;
};
export type ContextMenuSubContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type MenubarProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  modal?: boolean;
  loopFocus?: boolean;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
};
export type MenubarMenuProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type MenubarTriggerProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & ButtonKnobStyle };
export type MenubarContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type MenubarGroupProps = ComponentProps<"div"> & { style?: CSSProperties & PopupKnobStyle };
export type MenubarItemProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
};
export type MenubarSeparatorProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type MenubarLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  inset?: boolean;
};
export type MenubarShortcutProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type MenubarSubProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type MenubarSubTriggerProps = Omit<Omit<ComponentProps<"div">, "onClick">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  disabled?: boolean;
  inset?: boolean;
};
export type MenubarSubContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type NavigationMenuProps = ComponentProps<"nav"> & {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  orientation?: "horizontal" | "vertical";
  delay?: number;
  closeDelay?: number;
} & { style?: CSSProperties & PopupKnobStyle };
export type NavigationMenuListProps = ComponentProps<"ul"> & { style?: CSSProperties & PopupKnobStyle };
export type NavigationMenuItemProps = ComponentProps<"li"> & {
  value?: string;
} & { style?: CSSProperties & PopupKnobStyle };
export type NavigationMenuTriggerProps = Omit<ComponentProps<"button">, "style"> & {
  style?: CSSProperties & ButtonKnobStyle & PopupKnobStyle;
};
export type NavigationMenuContentProps = ComponentProps<"div"> & { style?: CSSProperties & PopupKnobStyle };
export const navigationMenuLinkVariants = ["default", "compact"] as const;
export type NavigationMenuLinkVariant = (typeof navigationMenuLinkVariants)[number];
export type NavigationMenuLinkProps = Omit<ComponentProps<"a">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  active?: boolean;
  closeOnClick?: boolean;
  variant?: NavigationMenuLinkVariant;
};
export type NavigationMenuViewportProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ModelOption = {
  value: string;
  label: string;
  hint?: ReactNode;
};
export type ModelSwitcherProps = {
  models: ModelOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: "xs" | "sm";
  variant?: SelectTriggerVariant;
  className?: string;
  style?: CSSProperties & ButtonKnobStyle;
};
export type DialogProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type DialogContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  showCloseButton?: boolean;
};
export type ResponsiveDialogProps = DialogProps;
export type ResponsiveDialogContentProps = DialogContentProps & {
  dialogClassName?: string;
  drawerClassName?: string;
};
export type InputProps = Omit<Omit<ComponentProps<"input">, "size">, "style"> & { style?: CSSProperties & FieldKnobStyle } & {
  size?: ControlSize;
};
export type InputGroupProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & FieldKnobStyle } & {
  render?: RenderProp<ComponentProps<"div">>;
  size?: ControlSize;
};
export type InputGroupAddonProps = ComponentProps<"span"> & { style?: CSSProperties & FieldKnobStyle };
export type LabelProps = Omit<ComponentProps<"label">, "style"> & { style?: CSSProperties & LabelKnobStyle };
export type SliderVariant = "default" | "plain";
export type SliderProps = Omit<
  {
    variant?: SliderVariant;
    value?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    label?: string;
    showValue?: boolean;
    formatValue?: (value: number) => string;
    className?: string;
    "aria-label"?: string;
  },
  "style"
> & { style?: CSSProperties & RangeKnobStyle };
export type ToggleProps = Omit<ButtonProps, "render" | "nativeButton" | "value"> & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  value?: string;
  showCheck?: boolean;
};
export type ToggleGroupProps<TValue extends string = string> = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> &
  ControlledMultiChoice<TValue> & {
    multiple?: boolean;
    disabled?: boolean;
    orientation?: "horizontal" | "vertical";
  };
export type CheckboxProps = Omit<
  {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    indeterminate?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
    id?: string;
    className?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
  },
  "style"
> & { style?: CSSProperties & ChoiceKnobStyle };
export type RadioGroupProps<TValue extends string = string> = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> &
  ControlledChoice<TValue> & {
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    name?: string;
    orientation?: "horizontal" | "vertical";
  } & { style?: CSSProperties & ChoiceKnobStyle };
export type RadioProps = Omit<
  {
    value: string;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    id?: string;
    className?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
  },
  "style"
> & { style?: CSSProperties & ChoiceKnobStyle };
export type SwitchProps = Omit<
  {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    readOnly?: boolean;
    required?: boolean;
    name?: string;
    value?: string;
    id?: string;
    className?: string;
    icon?: ReactNode;
    checkedIcon?: ReactNode;
    uncheckedIcon?: ReactNode;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
  },
  "style"
> & { style?: CSSProperties & SwitchKnobStyle };
export type FieldProps = ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal" | "responsive";
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  validationMode?: "onSubmit" | "onBlur" | "onChange";
} & { style?: CSSProperties & FieldKnobStyle };
export type FieldLabelProps = Omit<ComponentProps<"label">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldContentProps = ComponentProps<"div"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldTitleProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldControlProps = Omit<ComponentProps<"input">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldDescriptionProps = Omit<ComponentProps<"p">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldErrorMatch = boolean | keyof ValidityState;
export type FieldErrorProps = Omit<ComponentProps<"div">, "style"> & {
  match?: FieldErrorMatch;
  style?: CSSProperties & FieldKnobStyle;
};
export type FieldGroupProps = ComponentProps<"div"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldSeparatorProps = Omit<ComponentProps<"div">, "style"> & {
  children?: ReactNode;
  style?: CSSProperties & FieldKnobStyle;
};
export type FieldItemProps = ComponentProps<"div"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldSetProps = Omit<ComponentProps<"fieldset">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type FieldLegendProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type FormErrors = Record<string, string | string[]>;
export type FormProps = ComponentProps<"form"> & {
  errors?: FormErrors;
  validationMode?: "onSubmit" | "onBlur" | "onChange";
};
export type NativeSelectProps = Omit<Omit<ComponentProps<"select">, "size">, "style"> & { style?: CSSProperties & FieldKnobStyle } & {
  size?: ControlSize;
};
export type TextareaProps = Omit<ComponentProps<"textarea">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type AccordionValue = (string | number)[];
export type AccordionProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> & {
  value?: AccordionValue;
  defaultValue?: AccordionValue;
  onValueChange?: (value: AccordionValue) => void;
  multiple?: boolean;
  disabled?: boolean;
} & { style?: CSSProperties & AccordionKnobStyle };
export type AccordionItemProps = Omit<
  ComponentProps<"div"> & {
    value?: string | number;
    disabled?: boolean;
  },
  "style"
> & { style?: CSSProperties & AccordionKnobStyle };
export type AccordionTriggerProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & AccordionKnobStyle };
export type AccordionPanelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & AccordionKnobStyle };
export type AvatarProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & AvatarKnobStyle };
export type AvatarGroupProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & AvatarKnobStyle };
export type AvatarImageProps = ComponentProps<"img"> & {
  onLoadingStatusChange?: (status: "idle" | "loading" | "loaded" | "error") => void;
} & { style?: CSSProperties & AvatarKnobStyle };
export type AvatarFallbackProps = Omit<ComponentProps<"span">, "style"> & {
  delay?: number;
  style?: CSSProperties & AvatarKnobStyle;
};
export type ProgressProps = Omit<
  ComponentProps<"div"> & {
    value: number | null;
    min?: number;
    max?: number;
    format?: Intl.NumberFormatOptions;
    getAriaValueText?: (formattedValue: string | null, value: number | null) => string;
    locale?: Intl.LocalesArgument;
  },
  "style"
> & { style?: CSSProperties & RangeKnobStyle };
export type ProgressTrackProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & RangeKnobStyle };
export type ProgressIndicatorProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & RangeKnobStyle };
export type ProgressLabelProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & RangeKnobStyle };
export type ProgressValueProps = Omit<
  Omit<ComponentProps<"span">, "children"> & {
    children?: ((formattedValue: string | null, value: number | null) => ReactNode) | null;
  },
  "style"
> & { style?: CSSProperties & RangeKnobStyle };
export type HoverCardProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type HoverCardContentProps = Omit<
  ComponentProps<"div"> & {
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    sideOffset?: number;
  },
  "style"
> & { style?: CSSProperties & PopupKnobStyle };
export type AlertDialogProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
};
export type AlertDialogContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type InputOTPProps = {
  length?: number;
  separator?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  mask?: boolean;
  id?: string;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
  "aria-describedby"?: string;
} & { style?: CSSProperties & FieldKnobStyle };
export type InputOTPSlotProps = {
  index: number;
  length?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  style?: CSSProperties & FieldKnobStyle;
};
export type InputOTPSeparatorProps = ComponentProps<"div"> & { style?: CSSProperties & FieldKnobStyle };
export type ComboboxProps<Value = string> = {
  children?: ReactNode;
  items?: readonly Value[];
  value?: Value | null;
  defaultValue?: Value | null;
  onValueChange?: (value: Value | null) => void;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (inputValue: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  autoHighlight?: boolean;
  itemToStringLabel?: (itemValue: Value) => string;
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
};
export type ComboboxInputProps = Omit<Omit<ComponentProps<"input">, "size">, "style"> & { style?: CSSProperties & FieldKnobStyle } & {
  size?: ControlSize;
};
export type ComboboxTriggerProps = ComponentProps<"button"> & { style?: CSSProperties & FieldKnobStyle };
export type ComboboxContentProps = Omit<
  ComponentProps<"div"> & {
    sideOffset?: number;
  },
  "style"
> & { style?: CSSProperties & PopupKnobStyle };
export type ComboboxListProps<Value = unknown> = Omit<ComponentProps<"div">, "children"> & {
  children?: ReactNode | ((item: Value, index: number) => ReactNode);
} & { style?: CSSProperties & PopupKnobStyle };
export type ComboboxItemProps<Value = unknown> = Omit<
  Omit<ComponentProps<"div">, "value"> & {
    value?: Value;
    disabled?: boolean;
  },
  "style"
> & { style?: CSSProperties & PopupKnobStyle };
export type ComboboxEmptyProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type ComboboxGroupProps = ComponentProps<"div"> & { style?: CSSProperties & FieldKnobStyle };
export type ComboboxGroupLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export const alertVariants = ["default", "destructive"] as const;
export type AlertVariant = (typeof alertVariants)[number];
export type AlertProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & AlertKnobStyle } & { variant?: AlertVariant };
export type AlertTitleProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & AlertKnobStyle };
export type AlertDescriptionProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & AlertKnobStyle };
export const badgeVariants = ["default", "secondary", "destructive", "outline"] as const;
export type BadgeVariant = (typeof badgeVariants)[number];
export const badgeSizes = ["sm", "md"] as const;
export type BadgeSize = (typeof badgeSizes)[number];
export const BADGE_COLORS = ["neutral", "red", "orange", "yellow", "green", "blue", "purple", "pink"] as const;
export type BadgeColor = (typeof BADGE_COLORS)[number];
export type BadgeProps = Omit<ComponentProps<"span">, "style"> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  render?: RenderProp<ComponentProps<"span">>;
  style?: CSSProperties & BadgeKnobStyle;
};
export type CardVariant = "default" | "sectioned";
export type CardProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & CardKnobStyle } & { variant?: CardVariant };
export type CardHeaderProps = ComponentProps<"div"> & { style?: CSSProperties & CardKnobStyle };
export type CardTitleProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & CardKnobStyle };
export type CardDescriptionProps = ComponentProps<"div"> & { style?: CSSProperties & CardKnobStyle };
export type CardActionProps = ComponentProps<"div"> & { style?: CSSProperties & CardKnobStyle };
export type CardContentProps = ComponentProps<"div"> & { style?: CSSProperties & CardKnobStyle };
export type CardFooterProps = ComponentProps<"div"> & { style?: CSSProperties & CardKnobStyle };
export type TableProps = Omit<ComponentProps<"table">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type TableSectionProps = ComponentProps<"tbody">;
export type TableHeaderProps = Omit<ComponentProps<"thead">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type TableBodyProps = Omit<ComponentProps<"tbody">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type TableFooterProps = Omit<ComponentProps<"tfoot">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type TableRowProps = Omit<ComponentProps<"tr">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type TableHeadProps = Omit<ComponentProps<"th">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type TableCellProps = ComponentProps<"td"> & { style?: CSSProperties & TableKnobStyle };
export type TableCaptionProps = Omit<ComponentProps<"caption">, "style"> & { style?: CSSProperties & TableKnobStyle };
export type AspectRatioProps = ComponentProps<"div"> & { ratio?: number };
export type KbdProps = Omit<ComponentProps<"kbd">, "style"> & { style?: CSSProperties & KbdKnobStyle };
export type ButtonGroupTextProps = Omit<
  ComponentProps<"div"> & {
    size?: ControlSize;
  },
  "style"
> & { style?: CSSProperties & ButtonGroupKnobStyle };
export type ButtonGroupProps = ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
} & { style?: CSSProperties & ButtonGroupKnobStyle };
export type ButtonGroupSeparatorProps = Omit<
  ComponentProps<"div"> & {
    orientation?: "horizontal" | "vertical";
  },
  "style"
> & { style?: CSSProperties & ButtonGroupKnobStyle };
export type EmptyProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & EmptyKnobStyle };
export type EmptyMediaProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & EmptyKnobStyle };
export type EmptyContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & EmptyKnobStyle };
export type EmptyDescriptionProps = Omit<ComponentProps<"p">, "style"> & { style?: CSSProperties & EmptyKnobStyle };
export type EmptyTitleProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & EmptyKnobStyle };
export const itemVariants = ["default", "outline", "muted"] as const;
export type ItemVariant = (typeof itemVariants)[number];
export type ItemProps = Omit<
  ComponentProps<"div"> & {
    variant?: ItemVariant;
    render?: RenderProp<ComponentProps<"div">>;
  },
  "style"
> & { style?: CSSProperties & ItemKnobStyle };
export type ItemDescriptionProps = Omit<ComponentProps<"p">, "style"> & { style?: CSSProperties & ItemKnobStyle };
export type ItemFooterProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ItemKnobStyle };
export type ItemMediaProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ItemKnobStyle };
export type ItemTitleProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ItemKnobStyle };
export type ItemGroupProps = ComponentProps<"div"> & { style?: CSSProperties & ItemKnobStyle };
export type ItemSeparatorProps = ComponentProps<"div">;
export type PaginationEllipsisProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & PaginationKnobStyle };
export type PaginationLinkProps = Omit<
  ComponentProps<"a"> & {
    isActive?: boolean;
  },
  "style"
> & { style?: CSSProperties & PaginationKnobStyle };
export type SpinnerProps = Omit<
  ComponentProps<"span"> & {
    size?: ControlSize;
  },
  "style"
> & { style?: CSSProperties & SpinnerKnobStyle };
export type MeterProps = Omit<
  ComponentProps<"div"> & {
    value: number;
    min?: number;
    max?: number;
    format?: Intl.NumberFormatOptions;
    getAriaValueText?: (formattedValue: string, value: number) => string;
    locale?: Intl.LocalesArgument;
  },
  "style"
> & { style?: CSSProperties & RangeKnobStyle };
export type MeterTrackProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & RangeKnobStyle };
export type MeterIndicatorProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & RangeKnobStyle };
export type MeterLabelProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & RangeKnobStyle };
export type MeterValueProps = Omit<
  Omit<ComponentProps<"span">, "children"> & {
    children?: ((formattedValue: string, value: number) => ReactNode) | null;
  },
  "style"
> & { style?: CSSProperties & RangeKnobStyle };
export type CheckboxGroupProps = Omit<ComponentProps<"div">, "defaultValue" | "onChange"> &
  ControlledMultiChoice & {
    allValues?: string[];
    disabled?: boolean;
    orientation?: "horizontal" | "vertical";
  };
export type AutocompleteProps<Value = string> = {
  children?: ReactNode;
  items?: readonly Value[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  mode?: "list" | "both" | "inline" | "none";
  autoHighlight?: boolean | "always";
  limit?: number;
  openOnInputClick?: boolean;
  filter?: ((itemValue: Value, query: string, itemToString?: (itemValue: Value) => string) => boolean) | null;
  itemToStringValue?: (itemValue: Value) => string;
};
export type AutocompleteInputProps = Omit<Omit<ComponentProps<"input">, "size">, "style"> & { style?: CSSProperties & FieldKnobStyle } & {
  size?: ControlSize;
};
export type AutocompleteClearProps = ComponentProps<"button"> & { style?: CSSProperties & FieldKnobStyle };
export type AutocompleteContentProps = Omit<
  ComponentProps<"div"> & {
    sideOffset?: number;
  },
  "style"
> & { style?: CSSProperties & PopupKnobStyle };
export type AutocompleteListProps<Value = unknown> = Omit<ComponentProps<"div">, "children"> & {
  children?: ReactNode | ((item: Value, index: number) => ReactNode);
} & { style?: CSSProperties & PopupKnobStyle };
export type AutocompleteItemProps<Value = unknown> = Omit<
  Omit<ComponentProps<"div">, "value"> & {
    value?: Value;
    disabled?: boolean;
  },
  "style"
> & { style?: CSSProperties & PopupKnobStyle };
export type AutocompleteEmptyProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type AutocompleteGroupProps = ComponentProps<"div"> & { style?: CSSProperties & FieldKnobStyle };
export type AutocompleteGroupLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ToolbarVariant = "default" | "inverse";
export type ToolbarLinkVariant = "default" | "track";
export type ToolbarProps = Omit<ComponentProps<"div">, "style"> & {
  orientation?: "horizontal" | "vertical";
  variant?: ToolbarVariant;
  style?: CSSProperties & ToolbarKnobStyle;
};
export type ToolbarButtonProps = Omit<ComponentProps<"button">, "style"> & {
  iconOnly?: boolean;
  style?: CSSProperties & ToolbarKnobStyle;
};
export type ToolbarLinkProps = Omit<ComponentProps<"a">, "style"> & {
  variant?: ToolbarLinkVariant;
  style?: CSSProperties & ToolbarKnobStyle;
};
export type ToolbarGroupProps = ComponentProps<"div"> & { style?: CSSProperties & ToolbarKnobStyle };
export type ToolbarSeparatorProps = Omit<ComponentProps<"div">, "style"> & {
  orientation?: "horizontal" | "vertical";
  style?: CSSProperties & ToolbarKnobStyle;
};
export type ToolbarInputProps = Omit<ComponentProps<"input">, "style"> & {
  style?: CSSProperties & ToolbarKnobStyle;
};
export type DockablePanelPlacement = "left" | "right";
export type DockablePanelProps = Omit<ComponentProps<"aside">, "onChange" | "ref" | "style"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: DockablePanelPlacement;
  defaultPlacement?: DockablePanelPlacement;
  onPlacementChange?: (placement: DockablePanelPlacement) => void;
  style?: CSSProperties & DockablePanelKnobStyle;
};
export type DockablePanelHeaderProps = Omit<ComponentProps<"div">, "style"> & {
  style?: CSSProperties & DockablePanelKnobStyle;
};
export type DockablePanelDragHandleProps = Omit<ComponentProps<"button">, "style"> & {
  style?: CSSProperties & DockablePanelKnobStyle;
};
export type DockablePanelTitleProps = Omit<ComponentProps<"h2">, "style"> & {
  style?: CSSProperties & DockablePanelKnobStyle;
};
export type DockablePanelActionsProps = ComponentProps<"div"> & { style?: CSSProperties & DockablePanelKnobStyle };
export type DockablePanelToggleProps = Omit<Omit<ComponentProps<"button">, "children"> & { children?: ReactNode }, "style"> & {
  style?: CSSProperties & ButtonKnobStyle;
};
export type DockablePanelDockProps = Omit<
  Omit<ComponentProps<"button">, "children"> & {
    placement: DockablePanelPlacement;
    children?: ReactNode;
  },
  "style"
> & { style?: CSSProperties & ButtonKnobStyle };
export type DockablePanelCloseProps = Omit<Omit<ComponentProps<"button">, "children"> & { children?: ReactNode }, "style"> & {
  style?: CSSProperties & ButtonKnobStyle;
};
export type DockablePanelContentPadding = "default" | "none";
export type DockablePanelContentProps = ComponentProps<"div"> & {
  padding?: DockablePanelContentPadding;
  style?: CSSProperties & DockablePanelKnobStyle;
};
export type InfiniteCanvasTransform = { x: number; y: number; scale: number };
export type InfiniteCanvasMoveReason = "pointer" | "wheel" | "keyboard" | "control";
export type InfiniteCanvasMoveDetails = { reason: InfiniteCanvasMoveReason };
export type InfiniteCanvasProps = Omit<ComponentProps<"section">, "onChange" | "onWheel" | "ref" | "style"> & {
  transform?: InfiniteCanvasTransform;
  defaultTransform?: InfiniteCanvasTransform;
  onTransformChange?: (transform: InfiniteCanvasTransform, details: InfiniteCanvasMoveDetails) => void;
  minScale?: number;
  maxScale?: number;
  onWheel?: (event: WheelEvent) => void;
  style?: CSSProperties & InfiniteCanvasKnobStyle;
};
export type InfiniteCanvasContentProps = ComponentProps<"div"> & { style?: CSSProperties & InfiniteCanvasKnobStyle };
export type InfiniteCanvasControlsProps = Omit<ComponentProps<"div">, "children" | "style"> & {
  style?: CSSProperties & InfiniteCanvasKnobStyle;
};
export const drawerSides = ["bottom", "top", "right", "left"] as const;
export type DrawerSide = (typeof drawerSides)[number];
export const drawerContentPaddings = ["default", "none"] as const;
export type DrawerContentPadding = (typeof drawerContentPaddings)[number];
export const drawerContentSurfaces = ["background", "card"] as const;
export type DrawerContentSurface = (typeof drawerContentSurfaces)[number];
export const drawerContentVariants = ["edge", "floating"] as const;
export type DrawerContentVariant = (typeof drawerContentVariants)[number];
export type NumberFieldChangeReason =
  | "input-change"
  | "input-clear"
  | "input-blur"
  | "input-paste"
  | "keyboard"
  | "increment-press"
  | "decrement-press"
  | "wheel"
  | "scrub"
  | "none";
export type NumberFieldChangeEventDetails = {
  reason: NumberFieldChangeReason;
  event: Event;
  cancel?: () => void;
  allowPropagation?: () => void;
  isCanceled?: boolean;
  isPropagationAllowed?: boolean;
  trigger?: Element | undefined;
};
export type NumberFieldProps = {
  size?: ControlSize;
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (value: number | null, eventDetails: NumberFieldChangeEventDetails) => void;
  onValueCommitted?: (value: number | null, eventDetails: NumberFieldChangeEventDetails) => void;
  min?: number;
  max?: number;
  step?: number;
  smallStep?: number;
  largeStep?: number;
  snapOnStep?: boolean;
  allowOutOfRange?: boolean;
  allowWheelScrub?: boolean;
  format?: Intl.NumberFormatOptions;
  locale?: Intl.LocalesArgument;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  name?: string;
  form?: string;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
  style?: CSSProperties & FieldKnobStyle;
  children?: ReactNode;
};
export type NumberFieldGroupProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type NumberFieldInputProps = Omit<ComponentProps<"input">, "style"> & { style?: CSSProperties & FieldKnobStyle };
export type NumberFieldIncrementProps = ComponentProps<"button"> & { nativeButton?: boolean } & { style?: CSSProperties & FieldKnobStyle };
export type NumberFieldDecrementProps = ComponentProps<"button"> & { nativeButton?: boolean } & { style?: CSSProperties & FieldKnobStyle };
export type NumberFieldScrubAreaProps = ComponentProps<"span"> & {
  direction?: "horizontal" | "vertical";
  pixelSensitivity?: number;
  teleportDistance?: number;
} & { style?: CSSProperties & FieldKnobStyle };
export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch";
export type ColorPickerProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  format?: ColorFormat;
  defaultFormat?: ColorFormat;
  onFormatChange?: (format: ColorFormat) => void;
  alpha?: boolean;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  children?: ReactNode;
};
export type ColorPickerTriggerProps = Omit<ComponentProps<"button">, "style"> & { style?: CSSProperties & ColorPickerKnobStyle };
export type ColorPickerContentProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle } & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
};
export type ColorPickerPanelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ColorPickerAreaProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ColorPickerKnobStyle };
export type ColorPickerAreaThumbProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ColorPickerKnobStyle };
export type ColorPickerHueProps = Omit<Pick<ComponentProps<"div">, "className" | "aria-label" | "aria-labelledby" | "style">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
};
export type ColorPickerAlphaProps = Omit<Pick<ComponentProps<"div">, "className" | "aria-label" | "aria-labelledby" | "style">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
};
export type ColorPickerWheelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & ColorPickerKnobStyle };
export type ColorPickerEyeDropperProps = Omit<Omit<ComponentProps<"button">, "onError">, "style"> & {
  style?: CSSProperties & ButtonKnobStyle;
};
export type ColorPickerInputProps = Omit<Omit<ComponentProps<"input">, "value" | "defaultValue" | "onChange" | "size">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
} & {
  size?: ControlSize;
};
export type ColorPickerFormatSelectProps = {
  formats?: ColorFormat[];
  size?: ControlSize;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  style?: CSSProperties & ButtonKnobStyle;
};
export type ColorPickerChannelsProps = ComponentProps<"div"> & { style?: CSSProperties & ColorPickerKnobStyle };
export type ColorPickerChannelProps = Omit<Omit<ComponentProps<"div">, "children" | "aria-label">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
} & {
  channel: "r" | "g" | "b" | "h" | "s" | "l" | "okl" | "okc" | "okh" | "a";
  label?: ReactNode;
  "aria-label"?: string;
};
export type ColorPickerSwatchesProps = ComponentProps<"div"> & {
  colors?: string[];
  label?: ReactNode;
} & { style?: CSSProperties & ColorPickerKnobStyle };
export type ColorPickerSwatchProps = Omit<Omit<ComponentProps<"button">, "color">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
} & {
  color: string;
};
export type ColorPickerSwatchAddProps = Omit<Omit<ComponentProps<"button">, "onClick">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
} & {
  onAdd?: (value: string) => void;
};
export type ColorPickerContrastProps = Omit<Omit<ComponentProps<"div">, "children">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
} & {
  background?: string;
};
export type ColorPickerOutputProps = Omit<Omit<ComponentProps<"div">, "children">, "style"> & {
  style?: CSSProperties & ColorPickerKnobStyle;
} & {
  children?: ReactNode;
  renderValue?: (state: { value: string }) => ReactNode;
};
export type GradientType = "linear" | "radial" | "conic";
export type GradientStop = { id: string; position: number; color: string };
export type GradientEditorProps = Omit<ComponentProps<"div">, "onChange" | "defaultValue"> & {
  value?: string;
  defaultStops?: GradientStop[];
  defaultType?: GradientType;
  defaultAngle?: number;
  onValueChange?: (value: string) => void;
} & { style?: CSSProperties & GradientEditorKnobStyle };
export type GradientEditorPreviewProps = Omit<ComponentProps<"div">, "style"> & {
  style?: CSSProperties & GradientEditorKnobStyle;
};
export type GradientEditorTrackProps = Omit<ComponentProps<"fieldset">, "style"> & {
  style?: CSSProperties & GradientEditorKnobStyle;
};
export type GradientEditorStopProps = Omit<ComponentProps<"button">, "style"> & {
  stop: GradientStop;
  style?: CSSProperties & GradientEditorKnobStyle;
};
export type GradientEditorStopAddProps = Omit<ComponentProps<"button">, "onClick" | "style"> & {
  style?: CSSProperties & GradientEditorKnobStyle;
};
export type GradientEditorTypeSelectProps = {
  size?: ControlSize;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};
export type TriggerMenuItemData = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  keywords?: readonly string[];
  disabled?: boolean;
  kind?: string;
  image?: string;
};
export type MentionItem = { id: string; label: string; kind: string };
export type TriggerSelectContext = { char: string; query: string };
export type TriggerConfig<Item extends TriggerMenuItemData = TriggerMenuItemData> = {
  char: string;
  items: readonly Item[] | ((query: string) => readonly Item[]);
  filter?: (item: Item, query: string) => boolean;
  insert?: "replace" | "none";
  insertText?: (item: Item) => string;
  onSelect?: (item: Item, ctx: TriggerSelectContext) => void;
};
export type TriggerMenuProps = {
  open: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  anchorRect: DOMRect | null;
  side?: "top" | "bottom";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
  children?: ReactNode;
} & { style?: CSSProperties & PopupKnobStyle };
export type TriggerMenuListProps = ComponentProps<"div"> & { style?: CSSProperties & PopupKnobStyle };
export type TriggerMenuItemProps = Omit<
  Omit<ComponentProps<"div">, "onSelect"> & {
    active?: boolean;
    disabled?: boolean;
  },
  "style"
> & { style?: CSSProperties & PopupKnobStyle };
export type TriggerMenuEmptyProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type TriggerMenuGroupProps = ComponentProps<"div"> & { style?: CSSProperties & PopupKnobStyle };
export type TriggerMenuGroupLabelProps = Omit<ComponentProps<"div">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type TriggerMenuIconProps = Omit<ComponentProps<"span">, "style"> & { style?: CSSProperties & PopupKnobStyle };
export type ResizableLayout = { [panelId: string]: number };
export type ResizablePanelGroupVariant = "framed" | "nested";
export type ResizableHandleVariant = "solid" | "hover";
export type ResizablePanelGroupProps = Omit<ComponentProps<"div">, "style"> & {
  orientation?: "horizontal" | "vertical";
  variant?: ResizablePanelGroupVariant;
  defaultLayout?: ResizableLayout;
  disableCursor?: boolean;
  disabled?: boolean;
  onLayoutChange?: (layout: ResizableLayout) => void;
  onLayoutChanged?: (layout: ResizableLayout, meta: { isUserInteraction: boolean }) => void;
  style?: CSSProperties & ResizableKnobStyle;
};
export type ResizablePanelSize = { asPercentage: number; inPixels: number };
export interface ResizablePanelHandle {
  collapse: () => void;
  expand: () => void;
  getSize: () => ResizablePanelSize;
  isCollapsed: () => boolean;
  resize: (size: number | string) => void;
}
export type ResizablePanelProps = Omit<ComponentProps<"div">, "onResize"> & {
  defaultSize?: number | string;
  minSize?: number | string;
  maxSize?: number | string;
  collapsible?: boolean;
  collapsedSize?: number | string;
  groupResizeBehavior?: "preserve-relative-size" | "preserve-pixel-size";
  disabled?: boolean;
  panelRef?: Ref<ResizablePanelHandle>;
  onResize?: (size: ResizablePanelSize, id: string | number | undefined, prevSize: ResizablePanelSize | undefined) => void;
} & { style?: CSSProperties & ResizableKnobStyle };
export type ResizableHandleProps = Omit<ComponentProps<"div">, "role" | "tabIndex" | "style"> & {
  variant?: ResizableHandleVariant;
  withHandle?: boolean;
  disabled?: boolean;
  disableDoubleClick?: boolean;
  style?: CSSProperties & ResizableKnobStyle;
};
export type CodeOverflow = "wrap" | "scroll";
export type CodeHighlight = "auto" | "none";
export type CodeDensity = "default" | "compact";
export type CodeChrome = "standalone" | "embedded";
export type DiffStyle = "unified" | "split";
export type CodeDiffLineType = "add" | "del" | "context";
export type DiffIndicators = "classic" | "bars" | "none";
export type DiffLineKind = "word" | "char" | "none";
export type MarkdownProps = Omit<ComponentProps<"div">, "children" | "style"> & {
  content: string;
  style?: CSSProperties & MarkdownKnobStyle;
};
export type DynamicNotificationVariant = "surface" | "glass" | "liquid";
export type DynamicNotificationState = "collapsed" | "thinking" | "expanded";
export type DynamicNotificationReplyPayload = {
  value: string;
  clear: () => void;
};
export type DynamicNotificationProps = Omit<ComponentProps<"div">, "onChange" | "style"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, eventDetails: OpenChangeEventDetails) => void;
  loading?: boolean;
  replyValue?: string;
  defaultReplyValue?: string;
  onReplyValueChange?: (value: string) => void;
  onReply?: (payload: DynamicNotificationReplyPayload) => void | Promise<void>;
  variant?: DynamicNotificationVariant;
  disabled?: boolean;
  style?: CSSProperties & DynamicNotificationKnobStyle;
};
