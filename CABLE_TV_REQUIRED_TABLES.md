# Cable TV Module - Required Tables

**Project:** TCV Core  
**Module:** Cable TV Customer Management  
**Prepared Date:** 2026-07-01  
**SQL Script:** `CABLE_TV_REQUIRED_TABLES.sql`

---

## Table Creation File

Run this file after the existing ERP core tables are available:

```text
CABLE_TV_REQUIRED_TABLES.sql
```

The script creates only Cable TV-specific tables. It reuses existing ERP tables such as `users`, `employees`, `products`, `material_master`, `stock_master`, `stock_ledger`, `workflow_approvals`, `role_permissions`, and `audit_log`.

---

## New Tables

| No | Table | Type | Purpose |
|---:|---|---|---|
| 1 | `cable_network_master` | Master | Network names: TCV, PAMMAL, MURUGAN, SVN |
| 2 | `cable_locations` | Master | Location master |
| 3 | `cable_areas` | Master | Area master mapped to location |
| 4 | `cable_streets` | Master | Street master mapped to area |
| 5 | `cable_connection_sources` | Master | Source of connection master |
| 6 | `cable_mso_master` | Master | MSO/operator master for STB and exchange tracking |
| 7 | `cable_package_master` | Master | Package name, type, and price |
| 8 | `cable_approval_groups` | Workflow | Groups related Cable TV rows into one approval request |
| 9 | `cable_tv_customers` | Main | Combined customer table for all cable networks |
| 10 | `cable_customer_stbs` | Transaction | Customer STB details, image, and exchange history |
| 11 | `cable_connections` | Transaction | Connection, disconnection, shifted, transferred history |
| 12 | `cable_connection_materials` | Transaction | Materials used under a cable connection |
| 13 | `cable_customer_packages` | Transaction | Customer package assignment |
| 14 | `cable_subscriptions` | Transaction | Monthly/yearly subscription billing and collection |

---

## Approval Fields Added

The following transaction tables include approval workflow fields:

| Table | Approval Columns |
|---|---|
| `cable_approval_groups` | `group_type`, `approval_status`, `requested_by_user_id`, `approved_by_user_id`, `approved_at`, `rejected_reason` |
| `cable_tv_customers` | `approval_group_id`, `approval_status`, `approved_by_user_id`, `approved_at`, `rejected_reason` |
| `cable_customer_stbs` | `approval_group_id`, `approval_status`, `approved_by_user_id`, `approved_at`, `rejected_reason` |
| `cable_connections` | `approval_group_id`, `approval_status`, `approved_by_user_id`, `approved_at`, `rejected_reason` |
| `cable_connection_materials` | `approval_group_id`, `approval_status`, `approved_by_user_id`, `approved_at`, `rejected_reason` |
| `cable_customer_packages` | `approval_group_id`, `approval_status`, `approved_by_user_id`, `approved_at`, `rejected_reason` |
| `cable_subscriptions` | `approval_group_id`, `approval_status`, `approved_by_user_id`, `approved_at`, `rejected_reason` |

Default rule:

- Non-admin entries should be saved as `PENDING`.
- Admin-approved entries should become `APPROVED`.
- Default customer list should show only `APPROVED` customers.

---

## Approval Group Rule

For a new customer entry, create one row in `cable_approval_groups` with:

```text
group_type = NEW_CUSTOMER_ONBOARDING
approval_status = PENDING
```

Use the same `approval_group_id` in all initial onboarding rows:

- `cable_tv_customers`
- `cable_customer_stbs`
- `cable_connections`
- `cable_connection_materials`
- `cable_customer_packages`
- `cable_subscriptions`

When the workflow module approves this single group, all linked rows become approved together.

For later updates, create a separate approval group for only the changed detail:

| Later Change | Approval Group Type |
|---|---|
| Customer detail update | `CUSTOMER_UPDATE` |
| STB detail update | `STB_UPDATE` |
| Connection detail update | `CONNECTION_UPDATE` |
| Material detail update | `MATERIAL_UPDATE` |
| Package detail update | `PACKAGE_UPDATE` |
| Subscription detail update | `SUBSCRIPTION_UPDATE` |

This means the first customer entry is approved as one complete bundle, but each future module update can be approved separately.

---

## Key Design Points

- One combined customer table is used for all networks.
- Legacy customer numbers are preserved with network-wise uniqueness.
- Connection and material details are combined.
- Used materials fetch from existing `products`, with optional `material_master` mapping.
- STB image path is stored in `cable_customer_stbs.stb_image_path`.
- Subscription supports partial collection using `paid_amount` and `balance_amount`.
- Subscription period is stored using `start_date` and `expiry_date`.
