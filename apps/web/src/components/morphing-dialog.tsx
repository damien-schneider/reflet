"use client";

import { XIcon } from "lucide-react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Transition,
  type Variant,
} from "motion/react";
import React, {
  type ReactNode,
  use,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import useClickOutside from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";

export interface MorphingDialogContextType {
  isOpen: boolean;
  setIsOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  uniqueId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const MorphingDialogContext =
  React.createContext<MorphingDialogContextType | null>(null);

function useMorphingDialog() {
  const context = use(MorphingDialogContext);
  if (!context) {
    throw new Error(
      "useMorphingDialog must be used within a MorphingDialogProvider"
    );
  }
  return context;
}

export interface MorphingDialogProviderProps {
  children: ReactNode;
  transition?: Transition;
}

function MorphingDialogProvider({
  children,
  transition,
}: MorphingDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const contextValue: MorphingDialogContextType = {
    isOpen,
    setIsOpen,
    uniqueId,
    triggerRef,
  };

  return (
    <MorphingDialogContext.Provider value={contextValue}>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </MorphingDialogContext.Provider>
  );
}

export interface MorphingDialogProps {
  children: ReactNode;
  transition?: Transition;
}

export function MorphingDialog({ children, transition }: MorphingDialogProps) {
  return (
    <MorphingDialogProvider>
      <MotionConfig transition={transition}>{children}</MotionConfig>
    </MorphingDialogProvider>
  );
}

export interface MorphingDialogTriggerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function MorphingDialogTrigger({
  children,
  className,
  style,
  triggerRef: externalTriggerRef,
}: MorphingDialogTriggerProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog();
  const buttonRef = externalTriggerRef || triggerRef;

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <motion.button
      aria-controls={`motion-ui-morphing-dialog-content-${uniqueId}`}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={`Open dialog ${uniqueId}`}
      className={cn("relative cursor-pointer", className)}
      layoutId={`dialog-${uniqueId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={buttonRef}
      style={style}
    >
      {children}
    </motion.button>
  );
}

export interface MorphingDialogContentProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogContent({
  children,
  className,
  style,
}: MorphingDialogContentProps) {
  const { setIsOpen, isOpen, uniqueId, triggerRef } = useMorphingDialog();
  const containerRef = useRef<HTMLDivElement>(null);
  const [firstFocusableElement, setFirstFocusableElement] =
    useState<HTMLElement | null>(null);
  const [lastFocusableElement, setLastFocusableElement] =
    useState<HTMLElement | null>(null);

  useClickOutside(containerRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleTabNavigation = (event: KeyboardEvent) => {
      if (
        event.key !== "Tab" ||
        !(firstFocusableElement && lastFocusableElement)
      ) {
        return;
      }

      const isShiftTab = event.shiftKey;
      const isAtFirst = document.activeElement === firstFocusableElement;
      const isAtLast = document.activeElement === lastFocusableElement;

      if (isShiftTab && isAtFirst) {
        event.preventDefault();
        lastFocusableElement.focus();
      } else if (!isShiftTab && isAtLast) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      handleEscape(event);
      handleTabNavigation(event);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [setIsOpen, firstFocusableElement, lastFocusableElement]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
      const focusableElements = containerRef.current?.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      if (focusableElements && focusableElements.length > 0) {
        setFirstFocusableElement(focusableElements[0] as HTMLElement);
        setLastFocusableElement(focusableElements.at(-1) as HTMLElement);
        (focusableElements[0] as HTMLElement).focus();
      }
    } else {
      document.body.classList.remove("overflow-hidden");
      triggerRef.current?.focus();
    }
  }, [isOpen, triggerRef]);

  return (
    <motion.div
      aria-describedby={`motion-ui-morphing-dialog-description-${uniqueId}`}
      aria-labelledby={`motion-ui-morphing-dialog-title-${uniqueId}`}
      aria-modal="true"
      className={cn("overflow-hidden", className)}
      layoutId={`dialog-${uniqueId}`}
      ref={containerRef}
      role="dialog"
      style={style}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogContainer({
  children,
}: MorphingDialogContainerProps) {
  const { isOpen, uniqueId } = useMorphingDialog();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence initial={false} mode="sync">
      {isOpen && (
        <>
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 h-full w-full bg-white/40 backdrop-blur-xs dark:bg-black/40"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={`backdrop-${uniqueId}`}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {children}
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

export interface MorphingDialogTitleProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogTitle({
  children,
  className,
  style,
}: MorphingDialogTitleProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      className={className}
      layout
      layoutId={`dialog-title-container-${uniqueId}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogSubtitleProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function MorphingDialogSubtitle({
  children,
  className,
  style,
}: MorphingDialogSubtitleProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      className={className}
      layoutId={`dialog-subtitle-container-${uniqueId}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogDescriptionProps {
  children: ReactNode;
  className?: string;
  disableLayoutAnimation?: boolean;
  variants?: {
    initial: Variant;
    animate: Variant;
    exit: Variant;
  };
}

export function MorphingDialogDescription({
  children,
  className,
  variants,
  disableLayoutAnimation,
}: MorphingDialogDescriptionProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    <motion.div
      animate="animate"
      className={className}
      exit="exit"
      id={`dialog-description-${uniqueId}`}
      initial="initial"
      key={`dialog-description-${uniqueId}`}
      layoutId={
        disableLayoutAnimation
          ? undefined
          : `dialog-description-content-${uniqueId}`
      }
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

export interface MorphingDialogImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

export function MorphingDialogImage({
  src,
  alt,
  className,
  style,
  width = 800,
  height = 600,
}: MorphingDialogImageProps) {
  const { uniqueId } = useMorphingDialog();

  return (
    // biome-ignore lint/performance/noImgElement: motion.img is required for layout animations
    <motion.img
      alt={alt}
      className={cn(className)}
      height={height}
      layoutId={`dialog-img-${uniqueId}`}
      src={src}
      style={style}
      width={width}
    />
  );
}

export interface MorphingDialogCloseProps {
  children?: ReactNode;
  className?: string;
  variants?: {
    initial: Variant;
    animate: Variant;
    exit: Variant;
  };
}

export function MorphingDialogClose({
  children,
  className,
  variants,
}: MorphingDialogCloseProps) {
  const { setIsOpen, uniqueId } = useMorphingDialog();

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <motion.button
      animate="animate"
      aria-label="Close dialog"
      className={cn("absolute top-6 right-6", className)}
      exit="exit"
      initial="initial"
      key={`dialog-close-${uniqueId}`}
      onClick={handleClose}
      type="button"
      variants={variants}
    >
      {children || <XIcon size={24} />}
    </motion.button>
  );
}
