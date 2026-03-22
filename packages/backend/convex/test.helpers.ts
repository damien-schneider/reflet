/// <reference types="vite/client" />

// Shared module glob for convex-test.
// Must live at the convex/ root so Vite includes all domain directories.
// Tests in __tests__/ subdirectories cannot use ../../**/*.ts because
// Vite excludes the test file's ancestor directory from glob results.
export const modules = import.meta.glob("./**/*.*s");
