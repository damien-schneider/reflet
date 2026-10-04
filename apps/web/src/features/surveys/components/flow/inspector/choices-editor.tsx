"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { ArrowDown, ArrowUp, Plus, X } from "@phosphor-icons/react";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { useAutosavedText } from "@/features/surveys/components/flow/inspector/autosaved-field";

interface ChoicesEditorProps {
  allowOther: boolean;
  choices: readonly string[];
  onAllowOtherChange: (allowOther: boolean) => void;
  onChoicesChange: (
    choices: string[],
    renamed?: { from: string; to: string }
  ) => void;
}

export function ChoicesEditor({
  allowOther,
  choices,
  onAllowOtherChange,
  onChoicesChange,
}: ChoicesEditorProps) {
  const otherId = useId();
  const lastIndex = choices.length - 1;

  const move = (index: number, offset: -1 | 1) => {
    const reordered = [...choices];
    const [moved] = reordered.splice(index, 1);
    if (moved !== undefined) {
      reordered.splice(index + offset, 0, moved);
      onChoicesChange(reordered);
    }
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 font-medium text-sm">Options</legend>
      <ol className="flex flex-col gap-1.5">
        {choices.map((choice, index) => (
          <ChoiceRow
            canMoveDown={index < lastIndex}
            canMoveUp={index > 0}
            choice={choice}
            index={index}
            // biome-ignore lint/suspicious/noArrayIndexKey: options are positional; keying by text would remount the input while it is being renamed
            key={index}
            onMove={(offset) => move(index, offset)}
            onRemove={() =>
              onChoicesChange(
                choices.filter((_, position) => position !== index)
              )
            }
            onRename={(text) =>
              onChoicesChange(
                choices.map((candidate, position) =>
                  position === index ? text : candidate
                ),
                { from: choice, to: text }
              )
            }
          />
        ))}
      </ol>
      <Button
        className="self-start"
        onClick={() =>
          onChoicesChange([...choices, `Option ${choices.length + 1}`])
        }
        size="sm"
        variant="ghost"
      >
        <Plus aria-hidden />
        Add option
      </Button>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={otherId}>
          Let people type their own “Other” answer
        </Label>
        <Switch
          checked={allowOther}
          id={otherId}
          onCheckedChange={onAllowOtherChange}
        />
      </div>
    </fieldset>
  );
}

interface ChoiceRowProps {
  canMoveDown: boolean;
  canMoveUp: boolean;
  choice: string;
  index: number;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  onRename: (text: string) => void;
}

function ChoiceRow({
  canMoveDown,
  canMoveUp,
  choice,
  index,
  onMove,
  onRemove,
  onRename,
}: ChoiceRowProps) {
  const text = useAutosavedText(choice, onRename);
  const name = choice.trim() ? `“${choice}”` : `option ${index + 1}`;
  return (
    <li className="flex items-center gap-1">
      <Input
        aria-label={`Option ${index + 1}`}
        className="min-w-0 flex-1"
        onBlur={text.onBlur}
        onChange={(event) => text.onChange(event.target.value)}
        size="sm"
        value={text.value}
      />
      <Button
        aria-label={`Move ${name} up`}
        disabled={!canMoveUp}
        iconOnly
        onClick={() => onMove(-1)}
        size="xs"
        variant="ghost"
      >
        <ArrowUp aria-hidden />
      </Button>
      <Button
        aria-label={`Move ${name} down`}
        disabled={!canMoveDown}
        iconOnly
        onClick={() => onMove(1)}
        size="xs"
        variant="ghost"
      >
        <ArrowDown aria-hidden />
      </Button>
      <Button
        aria-label={`Remove ${name}`}
        iconOnly
        onClick={onRemove}
        size="xs"
        variant="ghost"
      >
        <X aria-hidden />
      </Button>
    </li>
  );
}
