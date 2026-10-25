import type { KeyboardEvent, ReactNode } from "react";

export interface TabListOption<T extends string> {
  content: ReactNode;
  value: T;
}

const KEY_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowRight: (index, count) => (index + 1) % count,
  End: (_index, count) => count - 1,
  Home: () => 0,
};

export function TabList<T extends string>({
  onSelect,
  options,
  selected,
}: {
  onSelect: (value: T) => void;
  options: TabListOption<T>[];
  selected: T;
}) {
  const moveFrom = (index: number, event: KeyboardEvent<HTMLElement>) => {
    const step = KEY_STEP[event.key];
    if (!step) {
      return;
    }
    const nextIndex = step(index, options.length);
    const next = options[nextIndex];
    const target = event.currentTarget.parentElement?.children[nextIndex];
    if (!(next && target instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    onSelect(next.value);
    target.focus();
  };

  return (
    <div className="dt-tabs" role="tablist">
      {options.map((option, index) => (
        <button
          aria-selected={option.value === selected}
          className="dt-tab"
          key={option.value}
          onClick={() => onSelect(option.value)}
          onKeyDown={(event) => moveFrom(index, event)}
          role="tab"
          tabIndex={option.value === selected ? 0 : -1}
          type="button"
        >
          {option.content}
        </button>
      ))}
    </div>
  );
}
