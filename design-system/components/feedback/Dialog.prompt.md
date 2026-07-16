Feedback — modal dialog, toast, tooltip.

```jsx
<Dialog open title="Delete speaker?" subtitle="This cannot be undone"
  onClose={close}
  footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="danger">Delete</Button></>}>
  Removing <b>Dr Jane Smith</b> will unpublish their profile.
</Dialog>

<Toast tone="success" title="Saved" message="Speaker profile updated." onClose={...} />
<Tooltip label="Export as CSV"><IconButton label="Export">…</IconButton></Tooltip>
```
