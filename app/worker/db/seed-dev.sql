-- Dev seed: 1 brand, 12 topics, 20 talent with varied statuses/rates/publication.
-- Idempotent-ish: clears data tables first (dev only — never run against production).
DELETE FROM publication;
DELETE FROM change_record;
DELETE FROM talent_topic;
DELETE FROM talent_photo;
DELETE FROM talent;
DELETE FROM topic;
DELETE FROM brand;

INSERT INTO brand (id, slug, name, created_at) VALUES
  (1, 'great-british-speakers', 'Great British Speakers', '2026-07-16T09:00:00Z');

INSERT INTO topic (id, name, created_at, created_by) VALUES
  (1, 'Leadership', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (2, 'AI', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (3, 'Sport', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (4, 'Motivation', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (5, 'Business growth', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (6, 'Sustainability', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (7, 'Diversity and inclusion', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (8, 'Wellbeing', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (9, 'Technology', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (10, 'Finance', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (11, 'Adventure', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online'),
  (12, 'Broadcasting', '2026-07-16T09:00:00Z', 'seed@greatbritishtalent.online');

INSERT INTO talent (id, reference, name, headline, biography, day_rate_pence, location, email, phone, status, archived_at, version, created_at, created_by, updated_at, updated_by) VALUES
  (1, 'TAL-0001', 'Raj Patel', 'Former England cricketer turned leadership speaker', 'Raj captained county cricket for a decade before moving into leadership development.', 450000, 'Leeds, UK', 'raj@example.com', '+44 7700 900001', 'available', NULL, 1, '2026-07-16T09:01:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:01:00Z', 'seed@greatbritishtalent.online'),
  (2, 'TAL-0002', 'Amelia Clarke', 'AI researcher and broadcaster', 'Amelia leads a university AI lab and presents technology documentaries.', 800000, 'Cambridge, UK', 'amelia@example.com', NULL, 'booked', NULL, 1, '2026-07-16T09:02:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:02:00Z', 'seed@greatbritishtalent.online'),
  (3, 'TAL-0003', 'Tom Okafor', 'Polar expedition leader', 'Tom has led four polar expeditions and speaks on resilience under pressure.', 300000, 'Bristol, UK', NULL, NULL, 'on_hold', NULL, 1, '2026-07-16T09:03:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:03:00Z', 'seed@greatbritishtalent.online'),
  (4, 'TAL-0004', 'Sophie Nguyen', 'Fintech founder', 'Sophie built and sold a payments startup; she speaks on scale-ups and finance.', 550000, 'London, UK', 'sophie@example.com', '+44 7700 900004', 'available', NULL, 1, '2026-07-16T09:04:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:04:00Z', 'seed@greatbritishtalent.online'),
  (5, 'TAL-0005', 'Marcus Webb', 'Olympic rower', 'Two-time Olympic medallist speaking on teamwork and marginal gains.', 950000, 'Henley, UK', NULL, NULL, 'confirmed', NULL, 1, '2026-07-16T09:05:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:05:00Z', 'seed@greatbritishtalent.online'),
  (6, 'TAL-0006', 'Priya Sharma', 'Sustainability strategist', 'Priya advises FTSE boards on net-zero transitions.', 400000, 'Manchester, UK', 'priya@example.com', NULL, 'available', NULL, 1, '2026-07-16T09:06:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:06:00Z', 'seed@greatbritishtalent.online'),
  (7, 'TAL-0007', 'Danny Hughes', 'Comedian and awards host', 'Danny hosts corporate awards nights and after-dinner sessions.', 250000, 'Liverpool, UK', NULL, '+44 7700 900007', 'available', NULL, 1, '2026-07-16T09:07:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:07:00Z', 'seed@greatbritishtalent.online'),
  (8, 'TAL-0008', 'Grace Adeyemi', 'NHS surgeon and wellbeing advocate', 'Grace speaks on high-stakes decision-making and clinician wellbeing.', NULL, 'Birmingham, UK', 'grace@example.com', NULL, 'available', NULL, 1, '2026-07-16T09:08:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:08:00Z', 'seed@greatbritishtalent.online'),
  (9, 'TAL-0009', 'Oliver Fraser', 'Economist', 'Former Bank of England economist on markets and policy.', 700000, 'Edinburgh, UK', NULL, NULL, 'cancelled', NULL, 1, '2026-07-16T09:09:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:09:00Z', 'seed@greatbritishtalent.online'),
  (10, 'TAL-0010', 'Hannah Doyle', 'Paralympic swimmer', 'Hannah speaks on adversity, adaptation and elite performance.', 350000, 'Cardiff, UK', 'hannah@example.com', NULL, 'available', NULL, 1, '2026-07-16T09:10:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:10:00Z', 'seed@greatbritishtalent.online'),
  (11, 'TAL-0011', 'James Whitfield', 'Cybersecurity expert', 'James ran national cyber defence programmes.', 600000, 'Cheltenham, UK', NULL, NULL, 'on_hold', NULL, 1, '2026-07-16T09:11:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:11:00Z', 'seed@greatbritishtalent.online'),
  (12, 'TAL-0012', 'Leila Haddad', 'Broadcaster and journalist', 'Leila anchors business news and moderates panels.', 480000, 'London, UK', 'leila@example.com', '+44 7700 900012', 'available', NULL, 1, '2026-07-16T09:12:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:12:00Z', 'seed@greatbritishtalent.online'),
  (13, 'TAL-0013', 'Ben Carver', 'Everest mountaineer', 'Ben has summited Everest three times and speaks on risk.', 90000, 'Sheffield, UK', NULL, NULL, 'available', NULL, 1, '2026-07-16T09:13:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:13:00Z', 'seed@greatbritishtalent.online'),
  (14, 'TAL-0014', 'Chloe Barnes', 'Retail CEO', 'Chloe turned around a national high-street chain.', 1200000, 'London, UK', 'chloe@example.com', NULL, 'booked', NULL, 1, '2026-07-16T09:14:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:14:00Z', 'seed@greatbritishtalent.online'),
  (15, 'TAL-0015', 'Idris Mensah', 'Motivational speaker', 'Idris works with schools and sports academies on mindset.', 150000, 'Nottingham, UK', NULL, NULL, 'available', NULL, 1, '2026-07-16T09:15:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:15:00Z', 'seed@greatbritishtalent.online'),
  (16, 'TAL-0016', 'Victoria Lane', 'Diversity and inclusion consultant', 'Victoria builds inclusive-leadership programmes for global firms.', 380000, 'Glasgow, UK', 'victoria@example.com', NULL, 'available', NULL, 1, '2026-07-16T09:16:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:16:00Z', 'seed@greatbritishtalent.online'),
  (17, 'TAL-0017', 'Sam Porter', 'Rugby world cup winner', 'Sam speaks on leadership under pressure and team culture.', 850000, 'Bath, UK', NULL, '+44 7700 900017', 'confirmed', NULL, 1, '2026-07-16T09:17:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:17:00Z', 'seed@greatbritishtalent.online'),
  (18, 'TAL-0018', 'Nina Kowalski', 'Space scientist', 'Nina works on satellite climate monitoring and speaks on space tech.', 420000, 'Oxford, UK', 'nina@example.com', NULL, 'available', NULL, 1, '2026-07-16T09:18:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:18:00Z', 'seed@greatbritishtalent.online'),
  (19, 'TAL-0019', 'George Ellison', 'Wine expert and host', 'George runs tastings and hosts gala dinners.', NULL, 'York, UK', NULL, NULL, 'available', NULL, 1, '2026-07-16T09:19:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:19:00Z', 'seed@greatbritishtalent.online'),
  (20, 'TAL-0020', 'Fatima Begum', 'Social entrepreneur', 'Fatima founded a national youth-employment charity. Archived example record.', 200000, 'Bradford, UK', NULL, NULL, 'available', '2026-07-10T12:00:00Z', 1, '2026-07-16T09:20:00Z', 'seed@greatbritishtalent.online', '2026-07-16T09:20:00Z', 'seed@greatbritishtalent.online');

INSERT INTO talent_topic (talent_id, topic_id) VALUES
  (1,1),(1,3),(2,2),(2,9),(2,12),(3,11),(3,4),(4,10),(4,5),(5,3),(5,1),(6,6),(7,12),(8,8),(8,7),
  (9,10),(10,3),(10,4),(11,9),(11,2),(12,12),(12,5),(13,11),(14,5),(14,1),(15,4),(16,7),(16,1),
  (17,3),(17,1),(18,9),(18,6),(19,12),(20,7),(20,4);

INSERT INTO publication (talent_id, brand_id, published_at, published_by) VALUES
  (1, 1, '2026-07-16T09:30:00Z', 'seed@greatbritishtalent.online'),
  (2, 1, '2026-07-16T09:30:00Z', 'seed@greatbritishtalent.online'),
  (5, 1, '2026-07-16T09:30:00Z', 'seed@greatbritishtalent.online');

INSERT INTO change_record (talent_id, actor, action, field, old_value, new_value, at)
SELECT id, 'seed@greatbritishtalent.online', 'created', NULL, NULL, reference, created_at FROM talent;

UPDATE ref_counter SET next_number = 21 WHERE id = 1;
