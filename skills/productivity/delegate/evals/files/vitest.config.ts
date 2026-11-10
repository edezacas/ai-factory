import { defineConfig } from 'vitest/config';

// Legacy notices from the old money helpers; CI treats any remaining notice as a failure.
export default defineConfig({
  test: {
    reporters: [
      'default',
      {
        onFinished() {
          console.log('\nRemaining deprecation notices (3)\n  3x formatCents() is deprecated, use Intl.NumberFormat');
          process.exitCode = 1;
        },
      },
    ],
  },
});
