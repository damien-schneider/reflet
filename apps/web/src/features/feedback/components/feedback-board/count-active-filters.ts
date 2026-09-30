interface ActiveFilterState {
  hideCompleted: boolean;
  selectedStatusIds: string[];
  selectedTagIds: string[];
}

export function countActiveFilters({
  selectedStatusIds,
  selectedTagIds,
  hideCompleted,
}: ActiveFilterState): number {
  return (
    selectedStatusIds.length + selectedTagIds.length + (hideCompleted ? 0 : 1)
  );
}
