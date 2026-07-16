#!/usr/bin/env python3
"""
Convert a WordPress WXR export of the greatbritishtalent.com roster into a
CSV the GBT Admin Import screen accepts (spec 003 column synonyms).

Usage: python3 scripts/convert-wp-export.py <export.xml> <output.csv>

Mapping:
  Talent ID  ← wp:post_id                (published `news` posts only)
  Full Name  ← <title>
  Headline   ← first bullet of key_information meta, fallback rank_math_description
  Bio        ← about_speaker (+ more_about_speaker), HTML stripped
  Topics     ← <category domain="category"> values, ';'-joined
  Photo URL  ← _thumbnail_id resolved through the attachment map
  Day Rate / Location / Email / Phone — not present in the export (expected gaps)
"""
import csv
import html
import re
import sys


def meta(item: str, key: str):
    m = re.search(
        r'<wp:meta_key><!\[CDATA\[' + re.escape(key) + r'\]\]></wp:meta_key>\s*'
        r'<wp:meta_value><!\[CDATA\[(.*?)\]\]></wp:meta_value>',
        item,
        re.S,
    )
    return m.group(1) if m else None


def strip_html(value: str) -> str:
    value = re.sub(r'\[/?[a-zA-Z_]+[^\]]*\]', ' ', value)  # shortcodes
    value = re.sub(r'<br\s*/?>|</p>|</li>', '\n', value, flags=re.I)
    value = re.sub(r'<[^>]+>', ' ', value)
    value = html.unescape(value)
    value = re.sub(r'[ \t]+', ' ', value)
    value = re.sub(r'\n\s*\n\s*\n+', '\n\n', value)
    return value.strip()


def first_bullet(key_information):
    if not key_information:
        return None
    bullets = re.findall(r'<li>(.*?)</li>', key_information, re.S)
    for b in bullets:
        text = strip_html(b)
        if text:
            return text[:200]
    return None


def main(xml_path: str, csv_path: str) -> None:
    with open(xml_path, encoding='utf-8', errors='replace') as f:
        text = f.read()

    items = re.findall(r'<item>(.*?)</item>', text, re.S)

    attachments = {}
    for item in items:
        if '<wp:post_type><![CDATA[attachment]]>' not in item:
            continue
        pid = re.search(r'<wp:post_id>(\d+)</wp:post_id>', item)
        url = re.search(r'<wp:attachment_url><!\[CDATA\[(.*?)\]\]>', item)
        if pid and url:
            attachments[pid.group(1)] = url.group(1).replace('//uploads', '/uploads')

    rows = []
    skipped = 0
    for item in items:
        if '<wp:post_type><![CDATA[news]]>' not in item or '<wp:status><![CDATA[publish]]>' not in item:
            continue
        pid = re.search(r'<wp:post_id>(\d+)</wp:post_id>', item)
        title = re.search(r'<title><!\[CDATA\[(.*?)\]\]></title>', item, re.S)
        if not pid or not title or not strip_html(title.group(1)):
            skipped += 1
            continue

        name = strip_html(title.group(1))[:200]
        about = meta(item, 'about_speaker') or ''
        more = meta(item, 'more_about_speaker') or ''
        bio = strip_html(about + ('\n\n' + more if more else ''))

        headline = first_bullet(meta(item, 'key_information'))
        if not headline:
            desc = meta(item, 'rank_math_description')
            if desc:
                headline = strip_html(desc)[:200]

        cats = re.findall(
            r'<category domain="category" nicename="[^"]*"><!\[CDATA\[(.*?)\]\]></category>', item
        )
        topics = '; '.join(dict.fromkeys(html.unescape(c).strip() for c in cats if c.strip()))

        thumb = meta(item, '_thumbnail_id')
        photo = attachments.get(thumb or '', '')

        rows.append(
            {
                'Talent ID': f'WP-{pid.group(1)}',
                'Full Name': name,
                'Headline': headline or '',
                'Bio': bio,
                'Topics': topics,
                'Day Rate (GBP)': '',
                'Location': '',
                'Email': '',
                'Phone': '',
                'Photo URL': photo,
            }
        )

    rows.sort(key=lambda r: r['Full Name'].lower())
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    with_photo = sum(1 for r in rows if r['Photo URL'])
    with_topics = sum(1 for r in rows if r['Topics'])
    with_bio = sum(1 for r in rows if r['Bio'])
    print(f'wrote {len(rows)} profiles to {csv_path} (skipped {skipped} unusable)')
    print(f'  with bio: {with_bio} · with topics: {with_topics} · with photo: {with_photo}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
