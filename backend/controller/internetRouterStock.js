// Shared by the Internet lookup and new-enrollment validation (aliases p/c).
// An Internet category alone is not evidence that a product is a router.
const routerProductSql = `(
  LOWER(TRIM(c.category_name)) IN ('router', 'routers')
  OR LOWER(COALESCE(c.slug, '')) REGEXP '(^|-)routers?(-|$)'
)`;

// Source links live separately so existing router rows and stock accounting stay intact.
const ensureRouterIssues = db => db.query(`CREATE TABLE IF NOT EXISTS internet_router_material_issues (
  internet_router_id BIGINT NOT NULL PRIMARY KEY,
  material_movement_id BIGINT NOT NULL,
  qty DECIMAL(10,2) NOT NULL,
  INDEX idx_router_material_issue (material_movement_id)
) ENGINE=InnoDB`);
const allocatedRouterQty = alias => `(SELECT COALESCE(SUM(ri.qty),0) FROM internet_router_material_issues ri
  JOIN internet_customer_routers ir ON ir.internet_router_id=ri.internet_router_id
  WHERE ri.material_movement_id=${alias}.material_movement_id)`;
const availableRouterIssueQty = `GREATEST(m.qty -
  (SELECT COALESCE(SUM(a.qty),0) FROM technician_material_sale_adjustments a WHERE a.material_movement_id=m.material_movement_id)
  - ${allocatedRouterQty('m')},0)`;

module.exports = { routerProductSql, ensureRouterIssues, allocatedRouterQty, availableRouterIssueQty };
