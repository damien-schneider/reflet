"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { LayoutGroup, motion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const TabsVariantContext = createContext<"default" | "line">("default");

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      data-orientation={orientation}
      data-slot="tabs"
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-full p-1 text-muted-foreground data-[variant=line]:rounded-none data-[variant=line]:p-0 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "gap-1 bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const layoutId = useId();
  return (
    <TabsVariantContext.Provider value={variant ?? "default"}>
      <LayoutGroup id={layoutId}>
        <TabsPrimitive.List
          className={cn(tabsListVariants({ variant }), className)}
          data-slot="tabs-list"
          data-variant={variant}
          {...props}
        />
      </LayoutGroup>
    </TabsVariantContext.Provider>
  );
}

function TabsIndicator() {
  return (
    <motion.span
      className="absolute inset-0 rounded-full bg-background shadow-sm"
      layoutId="tabs-indicator"
      transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
    />
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: TabsPrimitive.Tab.Props & { children?: ReactNode }) {
  const variant = useContext(TabsVariantContext);
  const [isActive, setIsActive] = useState(false);
  const [ref, setRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref) {
      return;
    }

    const observer = new MutationObserver(() => {
      setIsActive(ref.hasAttribute("data-active"));
    });

    setIsActive(ref.hasAttribute("data-active"));

    observer.observe(ref, {
      attributes: true,
      attributeFilter: ["data-active"],
    });

    return () => observer.disconnect();
  }, [ref]);

  const showAnimatedIndicator = variant === "default" && isActive;

  return (
    <TabsPrimitive.Tab
      className={cn(
        "group/trigger relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-3 py-0.5 font-medium text-foreground/60 text-sm transition-colors hover:text-foreground focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start dark:text-muted-foreground dark:hover:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "data-active:text-foreground dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      data-slot="tabs-trigger"
      ref={setRef}
      {...props}
    >
      {showAnimatedIndicator && <TabsIndicator />}
      <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
        {children}
      </span>
    </TabsPrimitive.Tab>
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("min-w-0 flex-1 p-4 text-sm outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
