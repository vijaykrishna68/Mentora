import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // One shared real Postgres database, truncated between tests — avoid
    // concurrent test files racing on the same tables.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
