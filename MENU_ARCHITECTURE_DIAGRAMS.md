# Menu System Architecture Diagram

## Complete System Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (Single Source of Truth)                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐                    │
│  │   Sku Table          │      │  ProductVariation    │                    │
│  │  ─────────────       │      │  ─────────────       │                    │
│  │  • id                │◄─────┤  • id                │                    │
│  │  • code              │  1:N │  • skuId (FK)        │                    │
│  │  • name              │      │  • name              │                    │
│  │  • category          │      │  • priceModifier     │                    │
│  │  • basePrice         │      │  • sortOrder         │                    │
│  │  • description       │      │  • isActive          │                    │
│  │  • status            │      └──────────────────────┘                    │
│  │  • isActive          │                                                   │
│  │  • orgId             │      ┌──────────────────────┐                    │
│  └──────────────────────┘      │  ProductAddon        │                    │
│           ▲                     │  ─────────────       │                    │
│           │                     │  • id                │                    │
│           └─────────────────────┤  • skuId (FK)        │                    │
│                             1:N │  • name              │                    │
│                                 │  • price             │                    │
│                                 │  • sortOrder         │                    │
│                                 │  • isActive          │                    │
│                                 └──────────────────────┘                    │
└────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │
                    ┌───────────────────┴──────────────────┐
                    │                                       │
                    ▼                                       ▼
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│       PUBLIC API LAYER             │  │      ADMIN API LAYER               │
├────────────────────────────────────┤  ├────────────────────────────────────┤
│                                    │  │                                    │
│  GET /api/menu                     │  │  GET /api/admin/menu              │
│  ─────────────                     │  │  ────────────────────             │
│  • Fetch active menu items         │  │  • List all menu items            │
│  • Include variations & addons     │  │  • Include variations & addons    │
│  • Group by category               │  │                                    │
│  • Public access                   │  │  PUT /api/admin/menu              │
│                                    │  │  ────────────────────             │
│  Example Response:                 │  │  • Update menu item               │
│  {                                 │  │  • Validation & duplicate check   │
│    "items": [...],                 │  │                                    │
│    "grouped": [                    │  │  DELETE /api/admin/menu           │
│      {                             │  │  ───────────────────────          │
│        "category": "Beverages",    │  │  • Soft delete (isActive=false)   │
│        "items": [...]              │  │                                    │
│      }                             │  │  GET /api/admin/product-options   │
│    ]                               │  │  ───────────────────────────────  │
│  }                                 │  │  • Fetch variations & addons      │
│                                    │  │                                    │
│  Used By: Order Portal             │  │  POST /api/admin/product-options  │
│                                    │  │  ────────────────────────────────  │
│                                    │  │  • Create variation or addon      │
│                                    │  │                                    │
│                                    │  │  PUT /api/admin/product-options   │
│                                    │  │  ───────────────────────────────  │
│                                    │  │  • Update variation or addon      │
│                                    │  │                                    │
│                                    │  │  DELETE /api/admin/product-options│
│                                    │  │  ──────────────────────────────── │
│                                    │  │  • Delete variation or addon      │
│                                    │  │                                    │
│                                    │  │  Used By: Menu Management         │
│                                    │  │  Requires: Admin/Manager role     │
└────────────────────────────────────┘  └────────────────────────────────────┘
                    │                                       │
                    │                                       │
                    ▼                                       ▼
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│      ORDER PORTAL (Public)         │  │    MENU MANAGEMENT (Admin)         │
├────────────────────────────────────┤  ├────────────────────────────────────┤
│  Route: /order                     │  │  Route: /dashboard/menu            │
│                                    │  │                                    │
│  Features:                         │  │  Features:                         │
│  • Browse menu by category         │  │  • View all menu items             │
│  • View item details               │  │  • Search & filter                 │
│  • Select variations (radio)       │  │  • Add new items                   │
│  • Select addons (checkbox)        │  │  • Edit items                      │
│  • Dynamic price calculation       │  │  • Delete items (soft)             │
│  • Add to cart                     │  │  • Manage variations               │
│  • Loading states                  │  │  • Manage addons                   │
│  • Error handling                  │  │  • Stats dashboard                 │
│  • Empty states                    │  │  • Real-time updates               │
│                                    │  │                                    │
│  UI Components:                    │  │  UI Components:                    │
│  • Category tabs                   │  │  • Stats cards                     │
│  • Menu item cards                 │  │  • Search bar                      │
│  • Variation selector              │  │  • Filter dropdowns                │
│  • Addon checkboxes                │  │  • Menu table                      │
│  • Price display                   │  │  • Add product dialog              │
│  • Cart summary                    │  │  • Edit item dialog                │
│                                    │  │  • Manage options dialog           │
│                                    │  │  • Action buttons                  │
│                                    │  │                                    │
│  Access: Public                    │  │  Access: Admin/Manager only        │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

## User Flow Diagrams

### Customer Order Flow

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Visit /order       │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐     ┌──────────────────┐
│  Page loads         │────>│  Fetch menu from │
│                     │     │  /api/menu       │
└──────┬──────────────┘     └────────┬─────────┘
       │                             │
       │<────────────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Show loading       │
│  spinner            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Menu loaded?       │
└──────┬──────────────┘
       │
       ├─ Yes ──────────────────────────┐
       │                                 │
       │                                 ▼
       │                        ┌─────────────────────┐
       │                        │  Display menu items │
       │                        │  grouped by category│
       │                        └──────┬──────────────┘
       │                               │
       │                               ▼
       │                        ┌─────────────────────┐
       │                        │  Customer browses   │
       │                        │  and selects item   │
       │                        └──────┬──────────────┘
       │                               │
       │                               ▼
       │                        ┌─────────────────────┐
       │                        │  Select variations? │
       │                        │  (radio buttons)    │
       │                        └──────┬──────────────┘
       │                               │
       │                               ▼
       │                        ┌─────────────────────┐
       │                        │  Select addons?     │
       │                        │  (checkboxes)       │
       │                        └──────┬──────────────┘
       │                               │
       │                               ▼
       │                        ┌─────────────────────┐
       │                        │  Price calculates   │
       │                        │  dynamically        │
       │                        └──────┬──────────────┘
       │                               │
       │                               ▼
       │                        ┌─────────────────────┐
       │                        │  Add to cart        │
       │                        └──────┬──────────────┘
       │                               │
       │                               ▼
       │                        ┌─────────────────────┐
       │                        │  Continue shopping  │
       │                        │  or checkout        │
       │                        └─────────────────────┘
       │
       └─ No (Error) ────────────────┐
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │  Show error banner  │
                            │  with retry button  │
                            └─────────────────────┘
```

### Admin Menu Management Flow

```
┌─────────────┐
│Admin/Manager│
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Login to dashboard │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Navigate to        │
│  /dashboard/menu    │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐     ┌──────────────────┐
│  Page loads         │────>│  Fetch menu from │
│                     │     │  /api/admin/menu │
└──────┬──────────────┘     └────────┬─────────┘
       │                             │
       │<────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Display menu management interface                      │
│  ┌────────┬────────┬────────┬────────┐                 │
│  │ Total  │ Active │  Avg   │Category│                 │
│  │ Items  │ Items  │ Price  │ Count  │                 │
│  └────────┴────────┴────────┴────────┘                 │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ Search: [          ]  Category: [▼] [Filter]│       │
│  └─────────────────────────────────────────────┘       │
│                                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │ Code │ Name │ Category │ Price │ Options │ ●│       │
│  ├──────┼──────┼──────────┼───────┼─────────┼──┤       │
│  │BEV-01│Latte │Beverages │ ₹150  │ 2 vars  │⚙│       │
│  │MAIN-1│Pasta │  Mains   │ ₹380  │ 1 addon │⚙│       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
       │
       ├─ Click "Add Product" ──────────────────────────┐
       │                                                 │
       ├─ Click "Edit" (pencil icon) ───────────────────┼─┐
       │                                                 │ │
       └─ Click "Settings" (gear icon) ─────────────────┼─┼─┐
                                                         │ │ │
                    ┌────────────────────────────────────┘ │ │
                    │                                       │ │
                    ▼                                       │ │
            ┌─────────────────┐                            │ │
            │ Add Product     │                            │ │
            │ Dialog          │                            │ │
            └────┬────────────┘                            │ │
                 │                                          │ │
                 ▼                                          │ │
            ┌─────────────────┐                            │ │
            │ Fill form:      │                            │ │
            │ • Code          │                            │ │
            │ • Name          │                            │ │
            │ • Category      │                            │ │
            │ • Price         │                            │ │
            │ • Description   │                            │ │
            └────┬────────────┘                            │ │
                 │                                          │ │
                 ▼                                          │ │
            ┌─────────────────┐                            │ │
            │ POST /api/admin/│                            │ │
            │     products    │                            │ │
            └────┬────────────┘                            │ │
                 │                                          │ │
                 ▼                                          │ │
            ┌─────────────────┐                            │ │
            │ Success toast   │                            │ │
            │ Refresh table   │                            │ │
            └─────────────────┘                            │ │
                                                            │ │
                     ┌──────────────────────────────────────┘ │
                     │                                         │
                     ▼                                         │
             ┌─────────────────┐                              │
             │ Edit Item Dialog│                              │
             └────┬────────────┘                              │
                  │                                            │
                  ▼                                            │
             ┌─────────────────┐                              │
             │ Update details  │                              │
             │ PUT /api/admin/ │                              │
             │      menu       │                              │
             └────┬────────────┘                              │
                  │                                            │
                  ▼                                            │
             ┌─────────────────┐                              │
             │ Success toast   │                              │
             │ Refresh table   │                              │
             └─────────────────┘                              │
                                                               │
                      ┌────────────────────────────────────────┘
                      │
                      ▼
              ┌─────────────────────────┐
              │ Manage Options Dialog   │
              ├─────────────────────────┤
              │ Variations:             │
              │  □ Regular (base)       │
              │  □ Hazelnut (+₹20) [✓]  │
              │  [+ Add Variation]      │
              │                         │
              │ Addons:                 │
              │  □ Chicken (₹80) [✓]    │
              │  [+ Add Addon]          │
              └────┬────────────────────┘
                   │
                   ├─ Add variation ────────────┐
                   │                             │
                   ├─ Edit variation ────────────┼─┐
                   │                             │ │
                   └─ Delete variation ──────────┼─┼─┐
                                                 │ │ │
                   ┌──────────────────────────────┘ │ │
                   │                                 │ │
                   ▼                                 │ │
           ┌──────────────────┐                     │ │
           │ POST /api/admin/ │                     │ │
           │ product-options  │                     │ │
           └────┬─────────────┘                     │ │
                │                                    │ │
                ▼                                    │ │
           ┌──────────────────┐                     │ │
           │ Success toast    │                     │ │
           │ Refresh options  │                     │ │
           └──────────────────┘                     │ │
                                                     │ │
            ┌────────────────────────────────────────┘ │
            │                                           │
            ▼                                           │
    ┌──────────────────┐                               │
    │ PUT /api/admin/  │                               │
    │ product-options  │                               │
    └────┬─────────────┘                               │
         │                                              │
         ▼                                              │
    ┌──────────────────┐                               │
    │ Success toast    │                               │
    │ Refresh options  │                               │
    └──────────────────┘                               │
                                                        │
            ┌───────────────────────────────────────────┘
            │
            ▼
    ┌──────────────────┐
    │ DELETE /api/     │
    │ admin/product-   │
    │ options          │
    └────┬─────────────┘
         │
         ▼
    ┌──────────────────┐
    │ Confirm dialog   │
    │ Success toast    │
    │ Refresh options  │
    └──────────────────┘
```

## Data Migration Flow

```
┌────────────────────┐
│  Developer runs:   │
│  npx ts-node       │
│  scripts/migrate-  │
│  menu-data.ts      │
│  <orgId>           │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Script validates  │
│  organization ID   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Read static file: │
│  data/menu-items.ts│
└────────┬───────────┘
         │
         ▼
┌────────────────────────────────────┐
│  For each menu item:               │
│  ┌──────────────────────────────┐ │
│  │ Check if SKU exists          │ │
│  │  Yes → Update                │ │
│  │  No  → Create new SKU        │ │
│  └────────┬─────────────────────┘ │
│           │                        │
│           ▼                        │
│  ┌──────────────────────────────┐ │
│  │ Create inventory records     │ │
│  │ for all locations            │ │
│  └────────┬─────────────────────┘ │
│           │                        │
│           ▼                        │
│  ┌──────────────────────────────┐ │
│  │ For each variation:          │ │
│  │  - Map name to price         │ │
│  │  - Create if not exists      │ │
│  └────────┬─────────────────────┘ │
│           │                        │
│           ▼                        │
│  ┌──────────────────────────────┐ │
│  │ For each addon:              │ │
│  │  - Map name to price         │ │
│  │  - Create if not exists      │ │
│  └────────┬─────────────────────┘ │
│           │                        │
│           ▼                        │
│  ┌──────────────────────────────┐ │
│  │ Log progress                 │ │
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
         │
         ▼
┌────────────────────┐
│  Generate summary  │
│  report:           │
│  • SKUs created    │
│  • SKUs updated    │
│  • Variations      │
│  • Addons          │
│  • Errors (if any) │
└────────────────────┘
```

## Price Calculation Example

```
Customer selects:
  Item: Cappucino (Base: ₹155)
  Variation: Hazelnut syrup (Modifier: +₹20)
  Addon: None

Final Price = ₹155 + ₹20 = ₹175

───────────────────────────────────

Customer selects:
  Item: Alfredo Pasta (Base: ₹380)
  Variation: None
  Addon: Chicken (Price: ₹80)

Final Price = ₹380 + ₹80 = ₹460

───────────────────────────────────

Customer selects:
  Item: Matcha Latte (Base: ₹195)
  Variation: Strawberry (Modifier: +₹30)
  Addon: None

Final Price = ₹195 + ₹30 = ₹225
```

## System State Transitions

```
Menu Item Lifecycle:

┌─────────┐     Create      ┌────────┐
│  Empty  │ ──────────────> │ Active │
└─────────┘                 └───┬────┘
                                │
                        Edit    │
                    ┌───────────┘
                    │
                    ▼
                ┌────────┐
                │ Active │
                └───┬────┘
                    │
                    │ Soft Delete
                    │
                    ▼
              ┌──────────┐
              │ Inactive │
              └──────────┘
              (isActive = false)
```

