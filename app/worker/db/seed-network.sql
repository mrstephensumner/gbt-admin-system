-- Publishing network (spec 009): the real Great British Talent syndication sites.
-- Idempotent — safe to re-run. Keyed on the immutable slug (ADR 0003).
-- Kept separate from seed-brand.sql so e2e/count-based tests stay deterministic.

-- Flagship already exists from seed-brand.sql; backfill its URL.
UPDATE brand SET url = 'https://greatbritishspeakers.co.uk/'
WHERE slug = 'great-british-speakers' AND (url IS NULL OR url = '');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-british-comedians', 'Great British Comedians', 'https://greatbritishcomedians.com/', 1, 1, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-comedians');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-british-moderators', 'Great British Moderators', 'https://greatbritishmoderators.com/', 1, 2, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-moderators');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-british-musicians', 'Great British Musicians', 'https://greatbritishmusicians.com/', 1, 3, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-musicians');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-british-presenters', 'Great British Presenters', 'https://greatbritishpresenters.co.uk/', 1, 4, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-presenters');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-british-voices', 'Great British Voices', 'https://greatbritishvoices.co.uk/', 1, 5, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-voices');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-business-speakers', 'Great Business Speakers', 'https://greatbusinessspeakers.com/', 1, 6, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-business-speakers');

INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-sports-speakers', 'Great Sports Speakers', 'https://greatsportsspeakers.com/', 1, 7, '2026-07-17T10:30:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-sports-speakers');

-- New-build pilot: the first site to be built natively inside this system
-- (greenfield, not a WordPress rebuild). See ADR 0003 / spec 010.
INSERT INTO brand (slug, name, url, active, sort_order, created_at)
SELECT 'great-british-influencers', 'Great British Influencers', 'https://greatbritishinfluencers.co.uk/', 1, 8, '2026-07-23T10:00:00Z'
WHERE NOT EXISTS (SELECT 1 FROM brand WHERE slug = 'great-british-influencers');
