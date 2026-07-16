Display & data primitives.

```jsx
<Badge tone="available" dot>Available</Badge>
<Badge tone="booked" dot>Booked</Badge>
<Tag onRemove={...}>Leadership</Tag>
<Avatar name="Jane Smith" status="available" size={40} />
<StatCard label="Active speakers" value="1,284" delta="+4.2% MoM" deltaTone="up" accent="red" />
<Card title="Upcoming events" actions={<Button size="sm">Add</Button>}>…</Card>
```

Badge tones map to the booking vocabulary: available (green), booked (blue), hold (amber), danger/red, navy, neutral. StatCard accents pull from the Union Jack palette.
