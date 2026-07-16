Buttons — primary actions in Union Jack red; use `navy`/`secondary` for supporting actions, `ghost` for low-emphasis, `danger` for destructive.

```jsx
<Button variant="primary">Add speaker</Button>
<Button variant="secondary" size="sm">Export</Button>
<Button variant="ghost" iconLeft={<i data-lucide="filter" />}>Filter</Button>
<IconButton label="Edit"><i data-lucide="pencil" /></IconButton>
```

Variants: primary, secondary, ghost, danger, navy, link. Sizes: sm (30), md (38), lg (46). `block` stretches full width. IconButton is a square action for toolbars/table rows.
