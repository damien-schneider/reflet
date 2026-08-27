"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";
import { skinAdornment } from "@/components/control-ui/adornments";
import type { ButtonLabelProps, ButtonLinkProps, ButtonProps, ControlSize } from "@/components/control-ui/contracts";
import { controlSize } from "@/components/control-ui/control-variants";
import { cn } from "@/components/control-ui/lib/cn";

const buttonStructureClasses = "relative isolate inline-flex shrink-0 items-center justify-center overflow-visible whitespace-nowrap";

export const buttonContentClasses = "relative z-[1] inline-flex min-w-0 items-center justify-center gap-[inherit]";

export function buttonRecipeClasses(size: ControlSize): string {
  return cn(buttonStructureClasses, controlSize({ size }));
}

function ButtonContent({ children }: { children: ReactNode }) {
  return (
    <span data-control-ui="button" data-control-family="button" data-slot="content" className={buttonContentClasses}>
      {children}
    </span>
  );
}

// composition flows through Base UI Button's `render` prop
export function Button({
  variant = "quiet",
  size = "sm",
  tone = "neutral",
  active = false,
  iconOnly = false,
  shape = "default",
  type = "button",
  disabled,
  render,
  nativeButton,
  className,
  children,
  color: _color,
  ...props
}: ButtonProps) {
  const classes = cn(buttonRecipeClasses(size), iconOnly && "aspect-square px-0", className);
  const isNativeButton = nativeButton !== false;
  const layer = skinAdornment("button", "layer", { variant, tone });
  const content = render ? children : <ButtonContent>{children}</ButtonContent>;

  return (
    <BaseButton
      {...(isNativeButton ? { type } : {})}
      disabled={disabled}
      data-control-ui="button"
      data-control-family="button"
      data-slot="root"
      data-control="true"
      data-active={active ? "true" : undefined}
      data-icon-only={iconOnly ? "true" : undefined}
      data-shape={shape}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      className={classes}
      render={render}
      nativeButton={nativeButton}
      {...props}
    >
      {layer}
      {content}
    </BaseButton>
  );
}

export function ButtonLink({
  variant = "quiet",
  size = "sm",
  tone = "neutral",
  active = false,
  iconOnly = false,
  shape = "default",
  render,
  className,
  children,
  color: _color,
  ...props
}: ButtonLinkProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-control-ui": "button",
      "data-control-family": "button",
      "data-slot": "root",
      "data-control": "true",
      "data-active": active ? "true" : undefined,
      "data-icon-only": iconOnly ? "true" : undefined,
      "data-shape": shape,
      "data-variant": variant,
      "data-tone": tone,
      "data-size": size,
      className: cn(buttonRecipeClasses(size), iconOnly && "aspect-square px-0", className),
      children: (
        <>
          {skinAdornment("button", "layer", { variant, tone })}
          <ButtonContent>{children}</ButtonContent>
        </>
      ),
    },
  });
}

export function ButtonLabel({
  variant = "quiet",
  size = "sm",
  tone = "neutral",
  active = false,
  iconOnly = false,
  shape = "default",
  className,
  children,
  color: _color,
  ...props
}: ButtonLabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The wrapped file input is supplied through children.
    <label
      {...props}
      data-control-ui="button"
      data-control-family="button"
      data-slot="root"
      data-control="true"
      data-active={active ? "true" : undefined}
      data-icon-only={iconOnly ? "true" : undefined}
      data-shape={shape}
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      className={cn(buttonRecipeClasses(size), iconOnly && "aspect-square px-0", className)}
    >
      {skinAdornment("button", "layer", { variant, tone })}
      <ButtonContent>{children}</ButtonContent>
    </label>
  );
}
