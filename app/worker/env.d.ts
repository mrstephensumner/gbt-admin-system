/**
 * `Env` comes from the generated worker-configuration.d.ts (run
 * `npx wrangler types` after changing wrangler.jsonc). This alias exists so
 * worker code imports one stable name; TEST_MIGRATIONS is injected only by
 * the vitest-pool-workers config.
 */
export type Env = Cloudflare.Env

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS?: import('@cloudflare/vitest-pool-workers').D1Migration[]
    }
  }
}
