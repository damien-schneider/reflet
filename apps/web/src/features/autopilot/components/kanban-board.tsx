"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface KanbanColumn<T> {
  color: string;
  id: string;
  items: T[];
  label: string;
}

function KanbanColumns<T extends { id: string }>({
  columns,
  itemComponent: ItemComponent,
  renderDraggable,
}: {
  columns: KanbanColumn<T>[];
  itemComponent: ComponentType<{ item: T }>;
  renderDraggable: boolean;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div
          className="flex min-w-64 flex-1 flex-col rounded-lg border bg-muted/30"
          key={column.id}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className={cn("size-2 rounded-full", column.color)} />
            <span className="font-medium text-sm">{column.label}</span>
            <span className="text-muted-foreground text-xs">
              {column.items.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 p-2">
            {renderDraggable ? (
              <SortableContext
                items={column.items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {column.items.map((item) => (
                  <SortableItem id={item.id} key={item.id}>
                    <ItemComponent item={item} />
                  </SortableItem>
                ))}
              </SortableContext>
            ) : (
              column.items.map((item) => (
                <ItemComponent item={item} key={item.id} />
              ))
            )}
            {column.items.length === 0 && (
              <div className="flex h-16 items-center justify-center text-muted-foreground text-xs">
                No items
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={cn(isDragging && "opacity-50")}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  itemComponent,
  onMove,
}: {
  columns: KanbanColumn<T>[];
  itemComponent: ComponentType<{ item: T }>;
  onMove?: (itemId: string, fromColumn: string, toColumn: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!onMove) {
    return (
      <KanbanColumns
        columns={columns}
        itemComponent={itemComponent}
        renderDraggable={false}
      />
    );
  }

  const moveItem = onMove;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const fromColumn = columns.find((col) =>
      col.items.some((item) => item.id === String(active.id))
    );
    const toColumn = columns.find(
      (col) =>
        col.id === String(over.id) ||
        col.items.some((item) => item.id === String(over.id))
    );

    if (fromColumn && toColumn && fromColumn.id !== toColumn.id) {
      moveItem(String(active.id), fromColumn.id, toColumn.id);
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <KanbanColumns
        columns={columns}
        itemComponent={itemComponent}
        renderDraggable
      />
    </DndContext>
  );
}
