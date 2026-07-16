-- Idempotent: ensures the Great British Speakers brand exists (e2e + fresh envs).
INSERT INTO brand (slug, name, created_at)
SELECT 'great-british-speakers', 'Great British Speakers', '2026-07-16T09:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-speakers');
