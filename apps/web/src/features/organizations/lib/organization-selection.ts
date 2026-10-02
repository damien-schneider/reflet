import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { z } from "zod";

const selectionSchema = z
  .object({
    organizationId: z.string().min(1),
    userId: z.string().min(1),
  })
  .nullable();

type OrganizationSelection = z.infer<typeof selectionSchema>;

function parseOrganizationSelection(value: unknown) {
  const result = selectionSchema.safeParse(value);
  return result.success ? result.data : null;
}

const jsonStorage = createJSONStorage<unknown>();
const selectionStorage = {
  getItem(key: string) {
    try {
      return parseOrganizationSelection(jsonStorage.getItem(key, null));
    } catch (error) {
      console.warn("Unable to restore the selected organization", error);
      return null;
    }
  },
  removeItem(key: string) {
    try {
      jsonStorage.removeItem(key);
    } catch (error) {
      console.warn("Unable to clear the selected organization", error);
    }
  },
  setItem(key: string, selection: OrganizationSelection) {
    try {
      jsonStorage.setItem(key, selection);
    } catch (error) {
      console.warn("Unable to remember the selected organization", error);
    }
  },
  subscribe(key: string, onChange: (selection: OrganizationSelection) => void) {
    return jsonStorage.subscribe?.(
      key,
      (value) => onChange(parseOrganizationSelection(value)),
      null
    );
  },
};

export const organizationSelectionAtom = atomWithStorage<OrganizationSelection>(
  "reflet-organization-selection",
  null,
  selectionStorage
);
