Navigation — tabs, sidebar items, pagination. Active state uses the Union Jack red accent (underline on tabs, left-border on nav items).

```jsx
<Tabs tabs={[{value:"all",label:"All",count:1284},{value:"available",label:"Available"}]} value={tab} onChange={setTab} />
<NavItem icon={<i data-lucide="users" />} label="Speakers" badge="1.2k" active />
<Pagination page={3} pageCount={24} onChange={setPage} />
```
