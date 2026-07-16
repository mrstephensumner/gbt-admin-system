import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'drizzle'))
  return {
    plugins: [
      cloudflareTest({
        main: './worker/index.ts',
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations, OWNER_EMAIL: 'test@greatbritishtalent.online' },
        },
      }),
    ],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, 'shared'),
        '@': path.resolve(__dirname, 'src'),
      },
    },
    test: {
      include: ['tests/integration/**/*.test.ts'],
      setupFiles: ['tests/integration/apply-migrations.ts'],
    },
  }
})
