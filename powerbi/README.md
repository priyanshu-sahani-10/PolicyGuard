# PolicyGuard — Power BI Analytics Layer

Professional Power BI dashboard preparation for the PolicyGuard insurance claims
dataset. **This folder changes nothing in the existing project** — no model files,
no backend/frontend code, and no prediction behavior are touched. It only documents
how to build the dashboard in Power BI Desktop from `ml/data/insurance_claims.csv`.

Companion files:

- `DAX_Measures.md` — complete DAX measures + calculated columns + verification values
- `Dashboard_Layout.md` — exact visual/field/slicer/layout plan

---

## 1. How to import `insurance_claims.csv` into Power BI

1. Open **Power BI Desktop** → **Home → Get data → Text/CSV**.
2. Select `ml/data/insurance_claims.csv` (58,592 rows) and click **Load**.
   (Use **Transform Data** first only if a column imports with the wrong type.)
3. In **Data view**, rename the table to **`Claims`**.
   All DAX in `DAX_Measures.md` assumes the table is called `Claims`.
4. Verify column types:
   - `claim_status` → **Whole Number** (values must be exactly `0` / `1`)
   - `vehicle_age`, `subscription_length` → **Decimal Number**
   - `customer_age`, `region_density`, `displacement`, `gross_weight`, `ncap_rating` → **Whole Number**
   - `segment`, `fuel_type`, `region_code`, all `is_*` columns → **Text**

> No processed CSV is provided on purpose: binning is done with DAX calculated
> columns (§3 below), so duplicating the 58k-row file would add maintenance cost
> with zero analytical benefit. The CSV is the single source of truth.

---

## 2. Which DAX measures to create

**Home → New measure** for each (paste from `DAX_Measures.md`):

| # | Measure | Used in |
|---|---|---|
| 1 | `Total Policies` | KPI K1, donut M1 |
| 2 | `Total Claims` | KPI K2, all tooltips |
| 3 | `No Claims` | KPI K3 |
| 4 | `Claim Rate` | KPI K4, every column/bar chart (M2, M3, B1–B4) |
| 5 | `No Claim Rate` | Donut M1 verification / optional tooltip |
| 6 | `Policies in Context` | Tooltips (policies under current slicers) |

Then create the **calculated columns** (**Home → New column**):

- `Claim Status Label` — donut legend ("Claim" / "No Claim")
- `Vehicle Age Group` + `Vehicle Age Group Sort`
- `Customer Age Group` + `Customer Age Group Sort`
- `Subscription Length Group` + `Subscription Length Group Sort`

Finally set each `... Group` column to **Sort by column → its `... Sort` column**
(Data view → select column → Column tools → Sort by column).

---

## 3. Which visuals to create

Build exactly **4 KPI cards + 7 visuals** per `Dashboard_Layout.md`:

- Top: K1–K4 (Card visuals)
- Middle: M1 Donut (Claim vs No Claim), M2 columns (Segment), M3 columns (Fuel Type)
- Bottom: B1 columns (Vehicle Age), B2 columns (Customer Age), B3 horizontal bars (Region), B4 columns (Subscription Length)

---

## 4. Which slicers to add

One Slicer visual each for `segment`, `fuel_type`, `region_code` (dropdown, 22 values),
`Vehicle Age Group`, and `Customer Age Group`. Keep default cross-filtering so every
KPI and chart responds to selections.

---

## 5. Recommended dashboard layout

Single report page — see the layout sketch in `Dashboard_Layout.md`:
title + subtitle header, KPI row, middle row (donut + 2 column charts), bottom row
(4 charts), slicers in a side column. Add the two small-sample notes under visuals
B1 (10+ vehicle-age group) and B3 (small regions).

---

## 6. How to refresh the data

1. Replace `ml/data/insurance_claims.csv` with the new extract (same column names).
2. In Power BI: **Home → Refresh**. All measures recalculate automatically because
   nothing is hardcoded — new totals, rates, and bins flow through.
3. Re-check the KPI cards against a quick row count of the new CSV
   (`Total Policies` must equal the CSV row count).
4. If new `segment` / `fuel_type` / `region_code` values appear, they show up in
   visuals and slicers automatically. If `customer_age` extends below 35 or
   `vehicle_age` beyond 20, review the bin edges in the `SWITCH` columns.

---

## 7. Analytical interpretation rules (important)

All dashboard statements must be **descriptive statistics, not causal conclusions**:

- ✅ "Observed Claim Rate by Region"
- ✅ "Segment B2 shows the highest observed claim rate (6.86%)"
- ✅ "Observed difference between age groups"
- ❌ "Region causes claims" / "Vehicle age causes claims" / "High-risk regions"

Two mandatory caveats to display on the report:

1. **Small samples are noisy** — regions C18 (242 policies), C22 (207), C20 (109)
   and the 10+ vehicle-age group (6 policies) can show extreme observed rates by chance.
2. **Rates describe the training portfolio** — they do not predict any individual
   policy and are independent of the CatBoost production model.

---

## 8. Dataset-level KPI values (verification only)

Calculated directly from `ml/data/insurance_claims.csv`:

| KPI | Value |
|---|---|
| Total Policies | 58,592 |
| Total Claims | 3,748 |
| No Claims | 54,844 |
| Claim Rate | 6.40% |

After building the dashboard with no slicers applied, the four KPI cards must show
exactly these values. Per-breakdown spot-checks are listed in `DAX_Measures.md` §5.
