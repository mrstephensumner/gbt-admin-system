import path from 'node:path'
import { defineConfig } from 'vitest/config'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'

/** Canned model output for the outbound stub; asserted on by the enrichment tests. */
export const STUB_BIO = 'A distinct, audience-tailored biography grounded in the speaker facts for this site.'

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, 'drizzle'))
  return {
    plugins: [
      cloudflareTest({
        main: './worker/index.ts',
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations, OWNER_EMAIL: 'test@greatbritishtalent.online' },
          // Stub every outbound request (the only one is the Anthropic Messages
          // API in spec 013) with a canned bio so integration tests run offline.
          outboundService(request: Request) {
            if (request.url.includes('api.anthropic.com')) {
              return new Response(
                JSON.stringify({ content: [{ type: 'text', text: STUB_BIO }] }),
                { headers: { 'content-type': 'application/json' } },
              )
            }
            return new Response('blocked outbound request', { status: 403 })
          },
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
