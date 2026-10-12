import { expect, it } from "vitest";
import { describeStorageFailure } from "./indexed-db";

it("tells a full device apart from other storage failures", () => {
  expect(
    describeStorageFailure(
      new DOMException("The quota has been exceeded.", "QuotaExceededError")
    )
  ).toBe("This device is out of storage space. Free some up, then try again.");
});

it("says storage is blocked when the browser refuses it on this page", () => {
  expect(
    describeStorageFailure(
      new DOMException("The operation is insecure.", "SecurityError")
    )
  ).toBe(
    "This browser blocks storage on this page, often in a private window or by site settings."
  );
});

it("keeps the browser's own reason for any other failure", () => {
  expect(
    describeStorageFailure(
      new DOMException(
        "Error preparing Blob/File data to be stored in object store",
        "UnknownError"
      )
    )
  ).toBe("Error preparing Blob/File data to be stored in object store");
});

it("does not blame IndexedDB support when a save was cancelled without a reason", () => {
  expect(describeStorageFailure(null)).toBe(
    "The browser cancelled the save without giving a reason."
  );
});
