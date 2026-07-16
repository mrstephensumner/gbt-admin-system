Data table for admin lists — speakers, bookings, enquiries. Column `render` returns any node so you can drop in Badges, Avatars, IconButtons.

```jsx
<Table
  selectable selected={sel} onToggle={toggle} onToggleAll={toggleAll} rowKey="id"
  columns={[
    { key: "name", header: "Speaker", render: r => <><Avatar name={r.name} size={28}/> {r.name}</> },
    { key: "fee", header: "Fee", align: "right" },
    { key: "status", header: "Status", render: r => <Badge tone={r.tone} dot>{r.status}</Badge> },
  ]}
  rows={speakers}
/>
```
