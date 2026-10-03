# PolicyGuard — Power BI Dashboard Layout

Title: **PolicyGuard — Insurance Claims Analytics**
Subtitle: **Portfolio Overview & Claim Pattern Analysis**

Table: `Claims`. Full DAX definitions: see `DAX_Measures.md`.

---

## Top — KPI cards (4 × Card visual)

| # | Visual | Purpose | Values | Format |
|---|---|---|---|---|
| K1 | Card | Total policy count | `Total Policies` | Whole number, thousands separator |
| K2 | Card | Total claimed policies | `Total Claims` | Whole number, thousands separator |
| K3 | Card | Total non-claimed policies | `No Claims` | Whole number, thousands separator |
| K4 | Card | Share of policies with a claim | `Claim Rate` | Percentage, 2 decimals |

All four respond to slicers. K4 title must read **"Claim Rate"** (observed share), never
"Claim probability" or "Claim risk".

---

## Middle row

### M1 — Claim vs No Claim distribution

- Visual: **Donut chart**
- Purpose: Show how rare claims are in the portfolio (~6.4% vs ~93.6%)
- Legend: `Claim Status Label` (calculated column: "Claim" / "No Claim")
- Values: `Total Policies`
- Tooltip: `Total Claims`, `No Claims`, `Claim Rate`

### M2 — Claim Rate by Segment

- Visual: **Clustered column chart**
- Purpose: Compare observed claim rates across the 6 vehicle segments
- Axis (X-axis): `segment`
- Values (Y-axis): `Claim Rate`
- Tooltip: `Total Policies`, `Total Claims`
- Sort: Y-axis descending not required; keep segment order A, B1, B2, C1, C2, Utility or sort by rate — either is fine, state the choice in the visual title footnote

### M3 — Claim Rate by Fuel Type

- Visual: **Clustered column chart**
- Purpose: Compare observed claim rates across CNG / Diesel / Petrol
- Axis (X-axis): `fuel_type`
- Values (Y-axis): `Claim Rate`
- Tooltip: `Total Policies`, `Total Claims`

---

## Bottom row

### B1 — Claim Rate by Vehicle Age

- Visual: **Clustered column chart**
- Purpose: Show observed claim rate per vehicle-age band
- Axis (X-axis): `Vehicle Age Group` (calculated column: 0-2, 2-5, 5-10, 10+)
- Values (Y-axis): `Claim Rate`
- Tooltip: `Total Policies`, `Total Claims`
- Required: sort X-axis by `Vehicle Age Group Sort` (see `DAX_Measures.md` §4)
- Note under visual: *"10+ group has very few policies; its observed rate is noisy."*

### B2 — Claim Rate by Customer Age

- Visual: **Clustered column chart**
- Purpose: Show observed claim rate per customer-age band
- Axis (X-axis): `Customer Age Group` (calculated column: 35-40, 41-45, 46-50, 51-60, 60+)
- Values (Y-axis): `Claim Rate`
- Tooltip: `Total Policies`, `Total Claims`
- Required: sort X-axis by `Customer Age Group Sort`
- Note under visual: *"Dataset ages start at 35; no under-35 band exists."*

### B3 — Claim Rate by Region

- Visual: **Bar chart** (horizontal orientation — 22 region codes need vertical space)
- Purpose: Compare observed claim rates across all region codes
- Axis (Y-axis): `region_code`
- Values (X-axis): `Claim Rate`
- Tooltip: `Total Policies`, `Total Claims`
- Sort: by `Claim Rate` descending, so the highest observed region is on top
- Title must read **"Observed Claim Rate by Region"** — never "Regions causing claims"
- Note under visual: *"Small regions (e.g. C18, C22, C20) have few policies; treat their observed rates with caution."*

### B4 — Claim Rate by Subscription Length

- Visual: **Clustered column chart**
- Purpose: Show observed claim rate by how long the customer has been insured
- Axis (X-axis): `Subscription Length Group` (calculated column: 0-2 yrs, 2-5 yrs, 5-10 yrs, 10+ yrs)
- Values (Y-axis): `Claim Rate`
- Tooltip: `Total Policies`, `Total Claims`
- Required: sort X-axis by `Subscription Length Group Sort`

---

## Slicers (one Slicer visual each, left or top filter pane)

| Slicer | Field | Type |
|---|---|---|
| S1 | `segment` | Vertical multi-select |
| S2 | `fuel_type` | Vertical multi-select |
| S3 | `region_code` | Dropdown multi-select (22 values) |
| S4 | `Vehicle Age Group` | Vertical multi-select |
| S5 | `Customer Age Group` | Vertical multi-select |

All slicers filter all visuals (default Power BI interaction). Do **not** disable
cross-filtering — responding KPIs are the point of the dashboard.

---

## Page layout sketch (single report page, 16:9)

```
┌────────────────────────────────────────────────────────────┐
│ Title: PolicyGuard — Insurance Claims Analytics            │
│ Subtitle: Portfolio Overview & Claim Pattern Analysis      │
├──────────┬──────────┬──────────┬───────────┬───────────────┤
│ K1 Total │ K2 Total │ K3 No    │ K4 Claim  │ S1 Segment    │
│ Policies │ Claims   │ Claims   │ Rate      │ S2 Fuel Type  │
├──────────┴──────────┴──────────┴───────────┤ S3 Region     │
│ M1 Donut  │ M2 Segment columns │ M3 Fuel   │ S4 Vehicle Age│
│           │                    │ columns   │ S5 Cust. Age  │
├────────────────────────────────────────────┴───────────────┤
│ B1 Vehicle Age │ B2 Customer Age │ B3 Region bars │ B4 Sub. │
└────────────────────────────────────────────────────────────┘
```

Alternative accepted layout: slicers in a slim left sidebar instead of the right
column. Keep to **one report page** — 4 KPIs + 7 visuals + 5 slicers is the full scope.

---

## What NOT to build

- No pie chart with 22 regions; the horizontal bar chart (B3) is the readable choice.
- No trend/forecast lines — the CSV has no time column.
- No "key influencers" or decomposition-tree causal claims; all language stays descriptive.
- No extra charts beyond the 7 above (a card/tooltip with policy counts is fine; new chart types are not).
