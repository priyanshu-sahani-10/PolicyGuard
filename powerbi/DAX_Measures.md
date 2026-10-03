# PolicyGuard — Power BI DAX Measures

Table name assumed throughout: **`Claims`** (imported from `ml/data/insurance_claims.csv`).
Target column: `Claims[claim_status]` — `1` = Claim, `0` = No Claim.

All measures calculate dynamically from the dataset. Nothing is hardcoded.

---

## 1. KPI measures

```dax
Total Policies =
COUNTROWS ( Claims )
```

```dax
Total Claims =
CALCULATE (
    COUNTROWS ( Claims ),
    Claims[claim_status] = 1
)
```

```dax
No Claims =
CALCULATE (
    COUNTROWS ( Claims ),
    Claims[claim_status] = 0
)
```

```dax
Claim Rate =
DIVIDE ( [Total Claims], [Total Policies] )
```

```dax
No Claim Rate =
DIVIDE ( [No Claims], [Total Policies] )
```

> Format `Claim Rate` and `No Claim Rate` as **Percentage** (2 decimals) in Power BI.
> `DIVIDE` is used instead of `/` so empty filter contexts return blank instead of an error.

---

## 2. Supporting measure (counts the policies in the current filter context)

Useful for tooltips on every claim-rate chart:

```dax
Policies in Context =
COUNTROWS ( Claims )
```

---

## 3. Calculated columns (create once per row, then use as Axis/Legend)

### 3.1 Claim status label (donut legend)

```dax
Claim Status Label =
IF ( Claims[claim_status] = 1, "Claim", "No Claim" )
```

### 3.2 Vehicle Age Group

Bins chosen from the actual data (`vehicle_age` range 0–20, ~73% of policies at 0–2 years).
These match the web Analytics dashboard bins.

```dax
Vehicle Age Group =
SWITCH (
    TRUE (),
    Claims[vehicle_age] <= 2, "0-2",
    Claims[vehicle_age] <= 5, "2-5",
    Claims[vehicle_age] <= 10, "5-10",
    "10+"
)
```

```dax
Vehicle Age Group Sort =
SWITCH (
    TRUE (),
    Claims[vehicle_age] <= 2, 1,
    Claims[vehicle_age] <= 5, 2,
    Claims[vehicle_age] <= 10, 3,
    4
)
```

### 3.3 Customer Age Group

Bins adapted to the actual data (`customer_age` range 35–75, so no under-35 bin exists).
These match the web Analytics dashboard bins.

```dax
Customer Age Group =
SWITCH (
    TRUE (),
    Claims[customer_age] <= 40, "35-40",
    Claims[customer_age] <= 45, "41-45",
    Claims[customer_age] <= 50, "46-50",
    Claims[customer_age] <= 60, "51-60",
    "60+"
)
```

```dax
Customer Age Group Sort =
SWITCH (
    TRUE (),
    Claims[customer_age] <= 40, 1,
    Claims[customer_age] <= 45, 2,
    Claims[customer_age] <= 50, 3,
    Claims[customer_age] <= 60, 4,
    5
)
```

### 3.4 Subscription Length Group

```dax
Subscription Length Group =
SWITCH (
    TRUE (),
    Claims[subscription_length] <= 2, "0-2 yrs",
    Claims[subscription_length] <= 5, "2-5 yrs",
    Claims[subscription_length] <= 10, "5-10 yrs",
    "10+ yrs"
)
```

```dax
Subscription Length Group Sort =
SWITCH (
    TRUE (),
    Claims[subscription_length] <= 2, 1,
    Claims[subscription_length] <= 5, 2,
    Claims[subscription_length] <= 10, 3,
    4
)
```

---

## 4. Sort-order setup (required for logical bin ordering)

For each `... Group` column, select the column in Data view, then
**Column tools → Sort by column** and pick the matching `... Group Sort` column.
Without this, Power BI sorts bins alphabetically (`10+` before `2-5`).

| Column | Sort by column |
|---|---|
| Vehicle Age Group | Vehicle Age Group Sort |
| Customer Age Group | Customer Age Group Sort |
| Subscription Length Group | Subscription Length Group Sort |

---

## 5. Verification values (dataset-level, for checking your measures)

Calculated from `ml/data/insurance_claims.csv` on 2026-10-03. These are
**verification values only** — the measures above must reproduce them dynamically:

| Measure | Expected value |
|---|---|
| Total Policies | 58,592 |
| Total Claims | 3,748 |
| No Claims | 54,844 |
| Claim Rate | 6.40% (0.06397) |
| No Claim Rate | 93.60% |

Spot-checks per breakdown (unfiltered):

| Breakdown | Highest observed claim rate |
|---|---|
| Segment | B2 · 6.86% |
| Fuel Type | Petrol · 6.64% |
| Vehicle Age Group | 0-2 · 6.74% |
| Customer Age Group | 60+ · 8.37% |
| Subscription Length Group | 10+ yrs · 8.40% |
| Region | C18 · 10.74% (only 242 policies — small-sample, see interpretation rules) |

If any measure disagrees with these values on the unfiltered dataset, check the
`claim_status` import (must be Whole Number, values 0/1) before changing the DAX.
