export const accordionKnobs = [
  "--accordion-item-border-color",
  "--accordion-trigger-foreground",
  "--accordion-trigger-hover-foreground",
  "--accordion-icon-foreground",
] as const;
export type AccordionKnobStyle = Partial<Record<(typeof accordionKnobs)[number], string>>;
export const actionBarKnobs = [] as const;
export type ActionBarKnobStyle = Partial<Record<(typeof actionBarKnobs)[number], string>>;
export const activityKnobs = [
  "--activity-row-foreground",
  "--activity-trigger-radius",
  "--activity-trigger-hover-background",
  "--activity-code-background",
] as const;
export type ActivityKnobStyle = Partial<Record<(typeof activityKnobs)[number], string>>;
export const alertKnobs = ["--alert-radius", "--alert-background", "--alert-border-color", "--alert-shadow"] as const;
export type AlertKnobStyle = Partial<Record<(typeof alertKnobs)[number], string>>;
export const audioRecorderKnobs = [
  "--audio-recorder-foreground",
  "--audio-recorder-active-foreground",
  "--audio-recorder-recording-ring-color",
  "--audio-recorder-error-foreground",
] as const;
export type AudioRecorderKnobStyle = Partial<Record<(typeof audioRecorderKnobs)[number], string>>;
export const audioVisualizerKnobs = [
  "--audio-visualizer-radius",
  "--audio-visualizer-bar-background",
  "--audio-visualizer-line-fill",
  "--audio-visualizer-line-stroke",
] as const;
export type AudioVisualizerKnobStyle = Partial<Record<(typeof audioVisualizerKnobs)[number], string>>;
export const avatarKnobs = [
  "--avatar-radius",
  "--avatar-group-ring-color",
  "--avatar-fallback-background",
  "--avatar-fallback-foreground",
] as const;
export type AvatarKnobStyle = Partial<Record<(typeof avatarKnobs)[number], string>>;
export const badgeKnobs = ["--badge-radius", "--badge-background", "--badge-foreground", "--badge-border-color"] as const;
export type BadgeKnobStyle = Partial<Record<(typeof badgeKnobs)[number], string>>;
export const breadcrumbKnobs = ["--breadcrumb-list-foreground", "--breadcrumb-page-foreground"] as const;
export type BreadcrumbKnobStyle = Partial<Record<(typeof breadcrumbKnobs)[number], string>>;
export const buttonKnobs = [
  "--button-radius",
  "--button-bg",
  "--button-foreground",
  "--button-hover-bg",
  "--button-hover-foreground",
  "--button-press-bg",
  "--button-press-scale",
  "--button-active-bg",
  "--button-active-foreground",
  "--button-active-hover-bg",
  "--button-shadow",
  "--button-active-shadow",
  "--button-focus-shadow",
] as const;
export type ButtonKnobStyle = Partial<Record<(typeof buttonKnobs)[number], string>>;
export const buttonGroupKnobs = [
  "--button-group-text-radius",
  "--button-group-text-background",
  "--button-group-text-foreground",
  "--button-group-separator-background",
] as const;
export type ButtonGroupKnobStyle = Partial<Record<(typeof buttonGroupKnobs)[number], string>>;
export const calendarKnobs = [
  "--calendar-day-radius",
  "--calendar-today-background",
  "--calendar-selected-background",
  "--calendar-selected-foreground",
  "--calendar-range-background",
] as const;
export type CalendarKnobStyle = Partial<Record<(typeof calendarKnobs)[number], string>>;
export const cardKnobs = [
  "--card-radius",
  "--card-background",
  "--card-border-color",
  "--card-border-width",
  "--card-shadow",
  "--card-backdrop-filter",
] as const;
export type CardKnobStyle = Partial<Record<(typeof cardKnobs)[number], string>>;
export const chatComposerKnobs = [
  "--chat-composer-root-background",
  "--chat-composer-shell-radius",
  "--chat-composer-shell-background",
  "--chat-composer-shell-background-image",
  "--chat-composer-shell-backdrop-filter",
  "--chat-composer-shell-border-color",
  "--chat-composer-shell-shadow",
  "--chat-composer-input-foreground",
  "--chat-composer-input-placeholder-foreground",
  "--chat-composer-mention-background",
  "--chat-composer-mention-radius",
  "--chat-composer-mention-border-color",
  "--chat-composer-mention-border-width",
] as const;
export type ChatComposerKnobStyle = Partial<Record<(typeof chatComposerKnobs)[number], string>>;
export const chatComposerAttachmentKnobs = [
  "--chat-composer-attachment-radius",
  "--chat-composer-attachment-background",
  "--chat-composer-attachment-border-color",
  "--chat-composer-attachment-shadow",
  "--chat-composer-attachment-progress-background",
  "--chat-composer-attachment-progress-foreground",
] as const;
export type ChatComposerAttachmentKnobStyle = Partial<Record<(typeof chatComposerAttachmentKnobs)[number], string>>;
export const chatLayoutKnobs = [
  "--chat-layout-radius",
  "--chat-layout-background",
  "--chat-layout-border-color",
  "--chat-layout-shadow",
  "--chat-layout-thought-foreground",
  "--chat-layout-thought-hover-background",
] as const;
export type ChatLayoutKnobStyle = Partial<Record<(typeof chatLayoutKnobs)[number], string>>;
export const chatMessageKnobs = [
  "--chat-message-avatar-radius",
  "--chat-message-avatar-background",
  "--chat-message-avatar-border-color",
  "--chat-message-avatar-border-width",
  "--chat-message-radius",
  "--chat-message-corner-radius",
  "--chat-message-background",
  "--chat-message-background-image",
  "--chat-message-foreground",
  "--chat-message-border-color",
  "--chat-message-border-width",
  "--chat-message-shadow",
] as const;
export type ChatMessageKnobStyle = Partial<Record<(typeof chatMessageKnobs)[number], string>>;
export const choiceKnobs = [
  "--choice-radius",
  "--choice-border-color",
  "--choice-checked-background",
  "--choice-checked-border-color",
] as const;
export type ChoiceKnobStyle = Partial<Record<(typeof choiceKnobs)[number], string>>;
export const codeKnobs = [
  "--code-radius",
  "--code-background",
  "--code-border-color",
  "--code-shadow",
  "--code-title-foreground",
  "--code-text-foreground",
] as const;
export type CodeKnobStyle = Partial<Record<(typeof codeKnobs)[number], string>>;
export const codeBlockEditorKnobs = [
  "--code-block-editor-radius",
  "--code-block-editor-background",
  "--code-block-editor-border-color",
  "--code-block-editor-shadow",
  "--code-block-editor-title-foreground",
  "--code-block-editor-code-background",
] as const;
export type CodeBlockEditorKnobStyle = Partial<Record<(typeof codeBlockEditorKnobs)[number], string>>;
export const codeDiffKnobs = [
  "--code-diff-radius",
  "--code-diff-background",
  "--code-diff-border-color",
  "--code-diff-foreground",
  "--code-diff-add-background",
  "--code-diff-del-background",
] as const;
export type CodeDiffKnobStyle = Partial<Record<(typeof codeDiffKnobs)[number], string>>;
export const collapsibleKnobs = [] as const;
export type CollapsibleKnobStyle = Partial<Record<(typeof collapsibleKnobs)[number], string>>;
export const colorPickerKnobs = [
  "--color-picker-output-swatch-radius",
  "--color-picker-swatch-radius",
  "--color-picker-area-radius",
  "--color-picker-trigger-radius",
  "--color-picker-trigger-shadow",
  "--color-picker-slider-thumb-radius",
  "--color-picker-slider-thumb-background",
] as const;
export type ColorPickerKnobStyle = Partial<Record<(typeof colorPickerKnobs)[number], string>>;
export const contextKnobs = [
  "--context-graph-radius",
  "--context-track-fill",
  "--context-segment-tool-fill",
  "--context-segment-message-fill",
  "--context-segment-source-fill",
  "--context-segment-reasoning-fill",
  "--context-overage-fill",
  "--context-limit-marker-color",
] as const;
export type ContextKnobStyle = Partial<Record<(typeof contextKnobs)[number], string>>;
export const dockablePanelKnobs = [
  "--dockable-panel-radius",
  "--dockable-panel-background",
  "--dockable-panel-foreground",
  "--dockable-panel-border-color",
  "--dockable-panel-shadow",
  "--dockable-panel-drop-zone-active-background",
  "--dockable-panel-drop-zone-active-border-color",
] as const;
export type DockablePanelKnobStyle = Partial<Record<(typeof dockablePanelKnobs)[number], string>>;
export const drawerKnobs = [
  "--drawer-backdrop-background",
  "--drawer-content-radius",
  "--drawer-content-background",
  "--drawer-content-foreground",
  "--drawer-content-border-color",
  "--drawer-content-shadow",
] as const;
export type DrawerKnobStyle = Partial<Record<(typeof drawerKnobs)[number], string>>;
export const dropzoneKnobs = [
  "--dropzone-surface-radius",
  "--dropzone-surface-foreground",
  "--dropzone-surface-border-color",
  "--dropzone-accept-border-color",
  "--dropzone-reject-border-color",
  "--dropzone-overlay-background",
] as const;
export type DropzoneKnobStyle = Partial<Record<(typeof dropzoneKnobs)[number], string>>;
export const dynamicNotificationKnobs = [
  "--dynamic-notification-content-easing",
  "--dynamic-notification-expanded-radius",
  "--dynamic-notification-morph-easing",
  "--dynamic-notification-glass-foreground",
  "--dynamic-notification-glass-ring-color",
  "--dynamic-notification-liquid-foreground",
  "--dynamic-notification-surface-background",
  "--dynamic-notification-surface-foreground",
  "--dynamic-notification-surface-ring-color",
  "--dynamic-notification-surface-shadow",
  "--dynamic-notification-indicator-end",
  "--dynamic-notification-indicator-middle",
  "--dynamic-notification-indicator-start",
] as const;
export type DynamicNotificationKnobStyle = Partial<Record<(typeof dynamicNotificationKnobs)[number], string>>;
export const emptyKnobs = [
  "--empty-radius",
  "--empty-background",
  "--empty-border-color",
  "--empty-border-width",
  "--empty-border-style",
  "--empty-media-radius",
  "--empty-media-background",
] as const;
export type EmptyKnobStyle = Partial<Record<(typeof emptyKnobs)[number], string>>;
export const environmentVariablesKnobs = [
  "--environment-variables-title-foreground",
  "--environment-variables-meta-foreground",
  "--environment-variables-error-foreground",
  "--environment-variables-message-background",
  "--environment-variables-message-foreground",
  "--environment-variables-message-border-color",
] as const;
export type EnvironmentVariablesKnobStyle = Partial<Record<(typeof environmentVariablesKnobs)[number], string>>;
export const fieldKnobs = [
  "--field-radius",
  "--field-background",
  "--field-foreground",
  "--field-border-color",
  "--field-border-width",
  "--field-shadow",
  "--field-backdrop-filter",
  "--field-focus-border-color",
  "--field-focus-ring-color",
  "--field-focus-ring-width",
] as const;
export type FieldKnobStyle = Partial<Record<(typeof fieldKnobs)[number], string>>;
export const gradientEditorKnobs = [
  "--gradient-editor-preview-radius",
  "--gradient-editor-preview-ring-color",
  "--gradient-editor-track-radius",
  "--gradient-editor-stop-radius",
  "--gradient-editor-stop-border-color",
  "--gradient-editor-stop-shadow",
  "--gradient-editor-add-radius",
  "--gradient-editor-add-border-color",
] as const;
export type GradientEditorKnobStyle = Partial<Record<(typeof gradientEditorKnobs)[number], string>>;
export const infiniteCanvasKnobs = [
  "--infinite-canvas-radius",
  "--infinite-canvas-background",
  "--infinite-canvas-grid-dot-color",
  "--infinite-canvas-border-color",
  "--infinite-canvas-controls-radius",
  "--infinite-canvas-controls-background",
  "--infinite-canvas-controls-border-color",
  "--infinite-canvas-controls-shadow",
] as const;
export type InfiniteCanvasKnobStyle = Partial<Record<(typeof infiniteCanvasKnobs)[number], string>>;
export const inlineAttachmentKnobs = [
  "--inline-attachment-radius",
  "--inline-attachment-background",
  "--inline-attachment-ring-color",
  "--inline-attachment-shadow",
  "--inline-attachment-hover-shadow",
  "--inline-attachment-content-radius",
  "--inline-attachment-content-background",
  "--inline-attachment-content-foreground",
  "--inline-attachment-content-shadow",
] as const;
export type InlineAttachmentKnobStyle = Partial<Record<(typeof inlineAttachmentKnobs)[number], string>>;
export const inlineCitationKnobs = [
  "--inline-citation-trigger-radius",
  "--inline-citation-trigger-background",
  "--inline-citation-trigger-foreground",
  "--inline-citation-trigger-border-color",
  "--inline-citation-trigger-hover-background",
  "--inline-citation-trigger-hover-foreground",
  "--inline-citation-navigation-background",
  "--inline-citation-quote-background",
  "--inline-citation-quote-radius",
] as const;
export type InlineCitationKnobStyle = Partial<Record<(typeof inlineCitationKnobs)[number], string>>;
export const itemKnobs = [
  "--item-radius",
  "--item-hover-background",
  "--item-hover-border-color",
  "--item-border-width",
  "--item-active-scale",
] as const;
export type ItemKnobStyle = Partial<Record<(typeof itemKnobs)[number], string>>;
export const kbdKnobs = ["--kbd-radius", "--kbd-background", "--kbd-foreground", "--kbd-border-color", "--kbd-shadow"] as const;
export type KbdKnobStyle = Partial<Record<(typeof kbdKnobs)[number], string>>;
export const labelKnobs = ["--label-root-foreground"] as const;
export type LabelKnobStyle = Partial<Record<(typeof labelKnobs)[number], string>>;
export const markdownKnobs = [
  "--markdown-foreground",
  "--markdown-blockquote-border-color",
  "--markdown-blockquote-foreground",
  "--markdown-inline-code-background",
  "--markdown-inline-code-foreground",
  "--markdown-inline-code-radius",
  "--markdown-link-foreground",
  "--markdown-table-cell-border-color",
  "--markdown-table-header-background",
] as const;
export type MarkdownKnobStyle = Partial<Record<(typeof markdownKnobs)[number], string>>;
export const markdownBlockKnobs = [
  "--markdown-block-radius",
  "--markdown-block-background",
  "--markdown-block-border-color",
  "--markdown-block-shadow",
  "--markdown-block-header-border-color",
  "--markdown-block-icon-background",
] as const;
export type MarkdownBlockKnobStyle = Partial<Record<(typeof markdownBlockKnobs)[number], string>>;
export const morphingPanelKnobs = [
  "--morphing-panel-radius",
  "--morphing-panel-background",
  "--morphing-panel-foreground",
  "--morphing-panel-border-color",
  "--morphing-panel-shadow",
  "--morphing-panel-trigger-hover-background",
] as const;
export type MorphingPanelKnobStyle = Partial<Record<(typeof morphingPanelKnobs)[number], string>>;
export const paginationKnobs = [
  "--pagination-link-radius",
  "--pagination-link-background",
  "--pagination-link-hover-background",
  "--pagination-link-foreground",
  "--pagination-link-shadow",
] as const;
export type PaginationKnobStyle = Partial<Record<(typeof paginationKnobs)[number], string>>;
export const phoneInputKnobs = [
  "--phone-input-country-border-color",
  "--phone-input-trigger-hover-background",
  "--phone-input-trigger-focus-background",
  "--phone-input-metadata-foreground",
  "--phone-input-chevron-foreground",
] as const;
export type PhoneInputKnobStyle = Partial<Record<(typeof phoneInputKnobs)[number], string>>;
export const popupKnobs = [
  "--popup-radius",
  "--popup-background",
  "--popup-foreground",
  "--popup-border-color",
  "--popup-border-width",
  "--popup-shadow",
  "--popup-backdrop-blur",
  "--popup-item-radius",
  "--popup-item-foreground",
  "--popup-item-highlight-background",
  "--popup-item-disabled-opacity",
  "--popup-separator-color",
  "--popup-shortcut-foreground",
] as const;
export type PopupKnobStyle = Partial<Record<(typeof popupKnobs)[number], string>>;
export const rangeKnobs = [
  "--range-track-radius",
  "--range-track-background",
  "--range-indicator-radius",
  "--range-indicator-background",
  "--range-thumb-radius",
  "--range-thumb-background",
  "--range-thumb-border-color",
  "--range-thumb-shadow",
] as const;
export type RangeKnobStyle = Partial<Record<(typeof rangeKnobs)[number], string>>;
export const resizableKnobs = [
  "--resizable-group-background",
  "--resizable-group-radius",
  "--resizable-group-border-color",
  "--resizable-handle-color",
  "--resizable-handle-hover-background",
  "--resizable-handle-active-background",
  "--resizable-grip-radius",
  "--resizable-grip-background",
  "--resizable-grip-foreground",
] as const;
export type ResizableKnobStyle = Partial<Record<(typeof resizableKnobs)[number], string>>;
export const richTooltipKnobs = [
  "--rich-tooltip-content-background",
  "--rich-tooltip-content-foreground",
  "--rich-tooltip-content-radius",
  "--rich-tooltip-content-shadow",
  "--rich-tooltip-dot-background",
  "--rich-tooltip-action-radius",
  "--rich-tooltip-action-background",
  "--rich-tooltip-action-foreground",
] as const;
export type RichTooltipKnobStyle = Partial<Record<(typeof richTooltipKnobs)[number], string>>;
export const scrollAreaKnobs = ["--scroll-area-thumb-radius", "--scroll-area-thumb-background", "--scroll-area-corner-background"] as const;
export type ScrollAreaKnobStyle = Partial<Record<(typeof scrollAreaKnobs)[number], string>>;
export const separatorKnobs = ["--separator-root-background"] as const;
export type SeparatorKnobStyle = Partial<Record<(typeof separatorKnobs)[number], string>>;
export const sidebarKnobs = [
  "--sidebar-rail-divider-background",
  "--sidebar-wrapper-background",
  "--sidebar-wrapper-background-image",
  "--sidebar-menu-button-radius",
  "--sidebar-inner-background",
  "--sidebar-inner-border-color",
  "--sidebar-inner-background-image",
  "--sidebar-inner-border-width",
  "--sidebar-inner-radius",
  "--sidebar-inner-shadow",
  "--sidebar-inset-background",
  "--sidebar-inset-background-image",
  "--sidebar-inset-shadow",
  "--sidebar-group-label-foreground",
  "--sidebar-menu-button-foreground",
  "--sidebar-menu-button-hover-background",
  "--sidebar-menu-button-hover-foreground",
  "--sidebar-menu-button-hover-shadow",
  "--sidebar-menu-button-active-background",
  "--sidebar-menu-button-active-foreground",
  "--sidebar-menu-button-active-shadow",
] as const;
export type SidebarKnobStyle = Partial<Record<(typeof sidebarKnobs)[number], string>>;
export const skeletonKnobs = ["--skeleton-radius", "--skeleton-background"] as const;
export type SkeletonKnobStyle = Partial<Record<(typeof skeletonKnobs)[number], string>>;
export const sourceBadgeKnobs = [
  "--source-badge-background",
  "--source-badge-foreground",
  "--source-badge-hover-background",
  "--source-badge-hover-foreground",
  "--source-badge-favicon-background",
  "--source-badge-favicon-radius",
] as const;
export type SourceBadgeKnobStyle = Partial<Record<(typeof sourceBadgeKnobs)[number], string>>;
export const spinnerKnobs = ["--spinner-foreground"] as const;
export type SpinnerKnobStyle = Partial<Record<(typeof spinnerKnobs)[number], string>>;
export const stepperKnobs = [
  "--stepper-indicator-radius",
  "--stepper-indicator-background",
  "--stepper-indicator-foreground",
  "--stepper-indicator-border-color",
  "--stepper-separator-background",
  "--stepper-title-foreground",
] as const;
export type StepperKnobStyle = Partial<Record<(typeof stepperKnobs)[number], string>>;
export const switchKnobs = [
  "--switch-background",
  "--switch-hover-background",
  "--switch-checked-background",
  "--switch-checked-hover-background",
  "--switch-thumb-radius",
  "--switch-thumb-background",
] as const;
export type SwitchKnobStyle = Partial<Record<(typeof switchKnobs)[number], string>>;
export const tableKnobs = [
  "--table-background",
  "--table-foreground",
  "--table-border-color",
  "--table-row-hover-background",
  "--table-row-selected-background",
  "--table-header-foreground",
  "--table-footer-background",
] as const;
export type TableKnobStyle = Partial<Record<(typeof tableKnobs)[number], string>>;
export const tableOfContentsKnobs = [
  "--table-of-contents-rail-background",
  "--table-of-contents-highlight-radius",
  "--table-of-contents-highlight-background",
] as const;
export type TableOfContentsKnobStyle = Partial<Record<(typeof tableOfContentsKnobs)[number], string>>;
export const tabsKnobs = [
  "--tabs-trigger-radius",
  "--tabs-list-padding",
  "--tabs-list-radius",
  "--tabs-list-background",
  "--tabs-list-backdrop-filter",
  "--tabs-indicator-background",
  "--tabs-active-foreground",
  "--tabs-indicator-shadow",
  "--tabs-trigger-focus-shadow",
  "--tabs-line-border-color",
  "--tabs-line-indicator-background",
] as const;
export type TabsKnobStyle = Partial<Record<(typeof tabsKnobs)[number], string>>;
export const taskListKnobs = [
  "--task-list-radius",
  "--task-list-background",
  "--task-list-foreground",
  "--task-list-border-color",
  "--task-list-shadow",
  "--task-list-item-foreground",
  "--task-list-item-pending-foreground",
  "--task-list-indicator-foreground",
  "--task-list-indicator-active-foreground",
] as const;
export type TaskListKnobStyle = Partial<Record<(typeof taskListKnobs)[number], string>>;
export const threadRailKnobs = [
  "--thread-rail-item-radius",
  "--thread-rail-item-background",
  "--thread-rail-line-radius",
  "--thread-rail-popover-radius",
  "--thread-rail-popover-background",
  "--thread-rail-popover-border-color",
  "--thread-rail-popover-border-width",
  "--thread-rail-popover-shadow",
  "--thread-rail-popover-backdrop-blur",
] as const;
export type ThreadRailKnobStyle = Partial<Record<(typeof threadRailKnobs)[number], string>>;
export const timelineKnobs = [
  "--timeline-indicator-background",
  "--timeline-indicator-foreground",
  "--timeline-running-foreground",
  "--timeline-success-foreground",
  "--timeline-error-foreground",
  "--timeline-separator-background",
  "--timeline-title-foreground",
] as const;
export type TimelineKnobStyle = Partial<Record<(typeof timelineKnobs)[number], string>>;
export const toastKnobs = [
  "--toast-radius",
  "--toast-background",
  "--toast-border-color",
  "--toast-border-width",
  "--toast-shadow",
] as const;
export type ToastKnobStyle = Partial<Record<(typeof toastKnobs)[number], string>>;
export const toolbarKnobs = [
  "--toolbar-radius",
  "--toolbar-padding",
  "--toolbar-background",
  "--toolbar-foreground",
  "--toolbar-border-color",
  "--toolbar-shadow",
  "--toolbar-item-foreground",
  "--toolbar-item-hover-background",
  "--toolbar-item-hover-foreground",
  "--toolbar-item-active-background",
  "--toolbar-item-active-foreground",
  "--toolbar-separator-background",
] as const;
export type ToolbarKnobStyle = Partial<Record<(typeof toolbarKnobs)[number], string>>;
export const trackHighlightKnobs = [
  "--track-highlight-radius",
  "--track-highlight-background",
  "--track-highlight-hover-background",
  "--track-highlight-ring-color",
  "--track-highlight-shadow",
  "--track-highlight-transition-duration",
] as const;
export type TrackHighlightKnobStyle = Partial<Record<(typeof trackHighlightKnobs)[number], string>>;
export const transcriptDividerKnobs = [
  "--transcript-divider-foreground",
  "--transcript-divider-line-color",
  "--transcript-divider-danger-foreground",
] as const;
export type TranscriptDividerKnobStyle = Partial<Record<(typeof transcriptDividerKnobs)[number], string>>;
export const treeKnobs = [
  "--tree-item-trigger-radius",
  "--tree-item-trigger-foreground",
  "--tree-item-trigger-hover-background",
  "--tree-item-trigger-hover-foreground",
  "--tree-item-trigger-selected-background",
  "--tree-item-trigger-selected-foreground",
  "--tree-item-trigger-font-size",
  "--tree-item-trigger-selected-font-weight",
] as const;
export type TreeKnobStyle = Partial<Record<(typeof treeKnobs)[number], string>>;
export const userAskKnobs = [
  "--user-ask-radius",
  "--user-ask-background",
  "--user-ask-foreground",
  "--user-ask-border-color",
  "--user-ask-shadow",
  "--user-ask-option-radius",
  "--user-ask-option-hover-background",
  "--user-ask-option-selected-background",
  "--user-ask-indicator-background",
  "--user-ask-indicator-foreground",
  "--user-ask-input-background",
  "--user-ask-input-foreground",
] as const;
export type UserAskKnobStyle = Partial<Record<(typeof userAskKnobs)[number], string>>;
export const controlKnobContracts = {
  accordion: accordionKnobs,
  "action-bar": actionBarKnobs,
  activity: activityKnobs,
  alert: alertKnobs,
  "audio-recorder": audioRecorderKnobs,
  "audio-visualizer": audioVisualizerKnobs,
  avatar: avatarKnobs,
  badge: badgeKnobs,
  breadcrumb: breadcrumbKnobs,
  button: buttonKnobs,
  "button-group": buttonGroupKnobs,
  calendar: calendarKnobs,
  card: cardKnobs,
  "chat-composer": chatComposerKnobs,
  "chat-composer-attachment": chatComposerAttachmentKnobs,
  "chat-layout": chatLayoutKnobs,
  "chat-message": chatMessageKnobs,
  choice: choiceKnobs,
  code: codeKnobs,
  "code-block-editor": codeBlockEditorKnobs,
  "code-diff": codeDiffKnobs,
  collapsible: collapsibleKnobs,
  "color-picker": colorPickerKnobs,
  context: contextKnobs,
  "dockable-panel": dockablePanelKnobs,
  drawer: drawerKnobs,
  dropzone: dropzoneKnobs,
  "dynamic-notification": dynamicNotificationKnobs,
  empty: emptyKnobs,
  "environment-variables": environmentVariablesKnobs,
  field: fieldKnobs,
  "gradient-editor": gradientEditorKnobs,
  "infinite-canvas": infiniteCanvasKnobs,
  "inline-attachment": inlineAttachmentKnobs,
  "inline-citation": inlineCitationKnobs,
  item: itemKnobs,
  kbd: kbdKnobs,
  label: labelKnobs,
  markdown: markdownKnobs,
  "markdown-block": markdownBlockKnobs,
  "morphing-panel": morphingPanelKnobs,
  pagination: paginationKnobs,
  "phone-input": phoneInputKnobs,
  popup: popupKnobs,
  range: rangeKnobs,
  resizable: resizableKnobs,
  "rich-tooltip": richTooltipKnobs,
  "scroll-area": scrollAreaKnobs,
  separator: separatorKnobs,
  sidebar: sidebarKnobs,
  skeleton: skeletonKnobs,
  "source-badge": sourceBadgeKnobs,
  spinner: spinnerKnobs,
  stepper: stepperKnobs,
  switch: switchKnobs,
  table: tableKnobs,
  "table-of-contents": tableOfContentsKnobs,
  tabs: tabsKnobs,
  "task-list": taskListKnobs,
  "thread-rail": threadRailKnobs,
  timeline: timelineKnobs,
  toast: toastKnobs,
  toolbar: toolbarKnobs,
  "track-highlight": trackHighlightKnobs,
  "transcript-divider": transcriptDividerKnobs,
  tree: treeKnobs,
  "user-ask": userAskKnobs,
} as const;
