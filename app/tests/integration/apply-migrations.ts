import { beforeEach } from 'vitest'
import { applyD1Migrations, env } from 'cloudflare:test'

// Runs once per test file: brings the isolated D1 instance to current schema.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS ?? [])

// Clean slate per test — the pool shares storage within a file.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM talent_showreel'),
    env.DB.prepare('DELETE FROM talent_seo'),
    env.DB.prepare('DELETE FROM talent_social_link'),
    env.DB.prepare('DELETE FROM talent_press_mention'),
    env.DB.prepare('DELETE FROM talent_note'),
    env.DB.prepare('DELETE FROM talent_onboarding_step'),
    env.DB.prepare('DELETE FROM import_candidate'),
    env.DB.prepare('DELETE FROM import_run'),
    env.DB.prepare('DELETE FROM operator_grant'),
    env.DB.prepare('DELETE FROM operator_audit'),
    env.DB.prepare('DELETE FROM operator'),
    env.DB.prepare('DELETE FROM publication'),
    env.DB.prepare('DELETE FROM change_record'),
    env.DB.prepare('DELETE FROM talent_topic'),
    env.DB.prepare('DELETE FROM talent_photo'),
    env.DB.prepare('DELETE FROM talent'),
    env.DB.prepare('DELETE FROM topic'),
    env.DB.prepare('DELETE FROM brand'),
    env.DB.prepare('UPDATE ref_counter SET next_number = 1 WHERE id = 1'),
  ])
})
