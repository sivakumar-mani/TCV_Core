// Only first-enrolment rows belong to the initial account. Renewals stay independent.
const findCatvEnrollmentGroup = async (db, customerId, month, year, subscriptionId = null) => {
  const [[account]] = await db.query(`SELECT a.approval_group_id
    FROM cable_tv_customers c
    JOIN cable_approval_groups g ON g.approval_group_id=c.approval_group_id AND g.group_type='NEW_CUSTOMER_ONBOARDING'
    JOIN cable_customer_accounts a ON a.approval_group_id=g.approval_group_id AND a.cable_customer_id=c.cable_customer_id
    WHERE c.cable_customer_id=? AND a.account_status IN ('PENDING','PARTIAL','NA')
      AND a.approval_status<>'REJECTED' AND g.approval_status<>'REJECTED'
      AND MONTH(COALESCE((SELECT MIN(x.connection_date) FROM cable_connections x WHERE x.approval_group_id=g.approval_group_id),c.created_at))=?
      AND YEAR(COALESCE((SELECT MIN(x.connection_date) FROM cable_connections x WHERE x.approval_group_id=g.approval_group_id),c.created_at))=?
      AND NOT EXISTS(SELECT 1 FROM cable_subscriptions s WHERE s.cable_customer_id=c.cable_customer_id AND (? IS NULL OR s.subscription_id<>?))
    ORDER BY a.account_id LIMIT 1 FOR UPDATE`,[customerId,month,year,subscriptionId,subscriptionId]);
  return account?.approval_group_id || null;
};
const findNetEnrollmentAccount = async (db, customerId, month, year, subscriptionId = null) => {
  const [[account]] = await db.query(`SELECT a.internet_account_id
    FROM internet_customers c JOIN internet_customer_accounts a ON a.internet_customer_id=c.internet_customer_id
    WHERE c.internet_customer_id=? AND NULLIF(TRIM(c.legacy_customer_no),'') IS NULL
      AND a.account_source='CONNECTION' AND a.account_status IN ('PENDING','PARTIAL') AND a.approval_status<>'REJECTED'
      AND MONTH(c.installed_date)=? AND YEAR(c.installed_date)=?
      AND a.internet_account_id=(SELECT MIN(x.internet_account_id) FROM internet_customer_accounts x WHERE x.internet_customer_id=c.internet_customer_id)
      AND NOT EXISTS(SELECT 1 FROM internet_subscriptions s WHERE s.internet_customer_id=c.internet_customer_id AND (? IS NULL OR s.internet_subscription_id<>?))
    LIMIT 1 FOR UPDATE`,[customerId,month,year,subscriptionId,subscriptionId]);
  return account?.internet_account_id || null;
};
const syncNetEnrollmentAccount = async (db, accountId, removedComponent = null) => {
  if (!accountId) return;
  const [[a]]=await db.query(`SELECT * FROM internet_customer_accounts WHERE internet_account_id=? AND account_source='CONNECTION' AND account_status IN ('PENDING','PARTIAL') AND approval_status<>'REJECTED' FOR UPDATE`,[accountId]);
  if (!a) return;
  const [[totals]]=await db.query(`SELECT
    (SELECT SUM(amount) FROM internet_subscriptions WHERE initial_account_id=?) subscriptions,
    (SELECT SUM(amount) FROM internet_customer_routers WHERE initial_account_id=?) routers,
    (SELECT SUM(connection_charge-connection_discount+labour_service_charge) FROM internet_connections WHERE initial_account_id=?) connections,
    (SELECT SUM(connection_charge) FROM internet_connections WHERE initial_account_id=?) connection_amount,
    (SELECT SUM(labour_service_charge) FROM internet_connections WHERE initial_account_id=?) labor_amount,
    (SELECT SUM(amount+COALESCE(discount,0)) FROM internet_connection_materials WHERE initial_account_id=?) materials`,Array(6).fill(accountId));
  // Null totals preserve historical components whose original detail rows are not linked.
  const number=v=>Number(v)||0,round=v=>Math.round(v);
  const subscription=totals.subscriptions===null&&removedComponent!=='subscriptions'?number(a.subscription_amount):number(totals.subscriptions);
  const routers=totals.routers===null&&removedComponent!=='routers'?number(a.router_amount):number(totals.routers);
  const material=totals.materials===null?number(a.material_cost):number(totals.materials);
  const connection=totals.connection_amount===null?number(a.connection_amount):number(totals.connection_amount);
  const labor=totals.labor_amount===null?number(a.labor_amount):number(totals.labor_amount);
  // Preserve the original connection discount when only a subscription is newly linked.
  const oldOther=number(a.grand_total)-number(a.subscription_amount)-number(a.router_amount)-number(a.material_cost);
  const other=totals.connections===null?oldOther:number(totals.connections)-number(a.material_discount)-number(a.overall_discount);
  const grand=Math.max(round(subscription+routers+material+other),0),received=number(a.office_received_amount);
  await db.query(`UPDATE internet_customer_accounts SET subscription_amount=?,router_amount=?,connection_amount=?,labor_amount=?,material_cost=?,grand_total=?,balance_amount=?,office_balance_amount=?,account_status=? WHERE internet_account_id=?`,[subscription,routers,connection,labor,material,grand,Math.max(round(grand-number(a.customer_paid_amount)),0),Math.max(round(grand-received),0),grand<=0?'PENDING':received>=grand?'PAID':received>0?'PARTIAL':'PENDING',accountId]);
};
module.exports={findCatvEnrollmentGroup,findNetEnrollmentAccount,syncNetEnrollmentAccount};
