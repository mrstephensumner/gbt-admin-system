Form controls for the admin — dark inputs with blue focus ring, red/`danger` error state. All controlled.

```jsx
<Input label="Speaker name" placeholder="e.g. Dr Jane Smith" iconLeft={<i data-lucide="search" />} />
<Select label="Status" options={["Available","On hold","Booked"]} />
<Textarea label="Bio" rows={5} />
<Checkbox checked label="Feature on homepage" onChange={...} />
<Radio name="tier" value="a" checked label="A-list" onChange={...} />
<Switch checked label="Published" onChange={...} />
```

`Input` exposes `iconLeft`/`iconRight`, `hint`, `error`, sizes sm/md/lg. `FieldLabel`/`FieldMsg` are reusable sub-parts.
