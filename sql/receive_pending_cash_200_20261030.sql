-- Run in the application's MySQL database on the VPS, in ONE session.
-- Financial records only: does not execute service approvals, stock movements,
-- location changes, or customer/STB status synchronization from Save Payment.
-- This script COMMITs the eligible payment records when run successfully.
-- To preview without saving, replace the final COMMIT with ROLLBACK.
-- Date is current date in India at execution time (2026-11-01 if run today).
SET @payment_date = DATE(UTC_TIMESTAMP() + INTERVAL 330 MINUTE);
SET @receiver_id = (
 SELECT IF(COUNT(*) = 1, MIN(employee_id), NULL) FROM employees
 WHERE is_active = 1
 AND UPPER(TRIM(CONCAT_WS(' ', first_name, last_name))) = 'SIVAKUMAR M'
);
-- Use the receiver's unique active login for the required payment audit user.
-- If this is NULL, nothing is changed. Set to the actual operator's verified
-- users.user_id if the receiver has no unique login; never invent an ID.
SET @operator_user_id = (
 SELECT IF(COUNT(*) = 1, MIN(user_id), NULL) FROM users
 WHERE employee_id = @receiver_id AND is_active = 1
);
SELECT @payment_date AS payment_date, @receiver_id AS receiver_employee_id,
       @operator_user_id AS audit_user_id;
DROP TEMPORARY TABLE IF EXISTS requested_payment_customers;
CREATE TEMPORARY TABLE requested_payment_customers (
 new_cno VARCHAR(30) NOT NULL, old_cno VARCHAR(30) NOT NULL,
 PRIMARY KEY (new_cno, old_cno)
);
INSERT INTO requested_payment_customers VALUES
('1313','1137'),
('1311','1135'),
('4245','3965'),
('5303','5023'),
('4839','4559'),
('4537','4257'),
('4514','4234'),
('4385','4105'),
('5383','5103'),
('5056','4776'),
('5368','5088'),
('5164','4884'),
('3030','2854'),
('1432','1256'),
('4762','4482'),
('4729','4449'),
('4635','4355'),
('4366','4086'),
('4365','4085'),
('3708','3428'),
('4912','4632'),
('3324','3044'),
('5139','4859'),
('5168','4888'),
('3344','3064'),
('4897','4617'),
('3310','3030'),
('4868','4588'),
('4770','4490'),
('3849','3569'),
('3469','3189'),
('5141','4861'),
('3523','3243'),
('3516','3236'),
('4875','4595'),
('3506','3226'),
('3505','3225'),
('4905','4625'),
('4862','4582'),
('3642','3362'),
('3576','3296'),
('5184','4904'),
('4896','4616'),
('5281','5001'),
('5226','4946'),
('4142','3862'),
('5714','399'),
('5576','261'),
('5533','218'),
('5457','142'),
('5673','358'),
('5657','342'),
('5641','326'),
('5520','205'),
('5502','187'),
('3798','3518'),
('4048','3768'),
('3808','3528'),
('3807','3527'),
('3729','3449'),
('3962','3682'),
('3744','3464'),
('4106','3826')
;
DROP TEMPORARY TABLE IF EXISTS payment_targets;
CREATE TEMPORARY TABLE payment_targets (
 account_id BIGINT PRIMARY KEY
);
START TRANSACTION;
-- Lock all matched account rows before collecting eligible accounts.
-- Explicit unlimited LIMIT prevents phpMyAdmin adding LIMIT after FOR UPDATE.
SELECT ca.account_id, c.customer_code, c.legacy_customer_no,
       ca.account_status, ca.grand_total, ca.office_received_amount
FROM cable_customer_accounts ca
JOIN cable_tv_customers c ON c.cable_customer_id = ca.cable_customer_id
JOIN requested_payment_customers r
 ON c.customer_code = r.new_cno AND c.legacy_customer_no = r.old_cno
ORDER BY ca.account_id LIMIT 18446744073709551615 FOR UPDATE;

-- Require exactly one matching customer and one eligible pending account per pair.
-- An outstanding balance other than 200 is excluded, never forced to zero.
INSERT INTO payment_targets (account_id)
SELECT MIN(ca.account_id)
FROM requested_payment_customers r
JOIN cable_tv_customers c
 ON c.customer_code = r.new_cno AND c.legacy_customer_no = r.old_cno
JOIN cable_customer_accounts ca ON ca.cable_customer_id = c.cable_customer_id
WHERE ca.account_status <> 'NA'
 AND ca.grand_total = 200.00 AND COALESCE(ca.office_received_amount, 0) = 0.00
 AND @receiver_id IS NOT NULL
 AND EXISTS (SELECT 1 FROM users u WHERE u.user_id = @operator_user_id AND u.is_active = 1)
 AND (SELECT COUNT(*) FROM cable_tv_customers c2
      WHERE c2.customer_code = r.new_cno AND c2.legacy_customer_no = r.old_cno) = 1
GROUP BY r.new_cno, r.old_cno
HAVING COUNT(*) = 1;

-- Review every excluded pair (already paid, missing, ambiguous, or different balance).
SELECT r.new_cno, r.old_cno, c.full_name, ca.account_id,
       ca.account_status, ca.grand_total, ca.office_received_amount
FROM requested_payment_customers r
LEFT JOIN cable_tv_customers c
 ON c.customer_code = r.new_cno AND c.legacy_customer_no = r.old_cno
LEFT JOIN cable_customer_accounts ca ON ca.cable_customer_id = c.cable_customer_id
WHERE NOT EXISTS (
 SELECT 1 FROM payment_targets t
 JOIN cable_customer_accounts matched ON matched.account_id = t.account_id
 JOIN cable_tv_customers mc ON mc.cable_customer_id = matched.cable_customer_id
 WHERE mc.customer_code = r.new_cno AND mc.legacy_customer_no = r.old_cno
);
SELECT COUNT(*) AS accounts_to_pay, COUNT(*) * 200.00 AS total_cash
FROM payment_targets;

INSERT INTO cable_customer_account_payments (
 account_id, cash_amount, online_amount, received_amount, paid_date,
 received_date, due_date, balance_after_payment, payment_status,
 received_by_user_id, received_by_employee_id
)
SELECT account_id, 200.00, 0.00, 200.00, @payment_date,
 @payment_date, NULL, 0.00, 'PAID', @operator_user_id, @receiver_id
FROM payment_targets;

UPDATE cable_customer_accounts ca
JOIN payment_targets t ON t.account_id = ca.account_id
SET ca.office_received_amount = COALESCE(ca.office_received_amount, 0) + 200.00,
 ca.office_balance_amount = 0.00, ca.balance_amount = 0.00,
 ca.due_date = NULL, ca.account_status = 'PAID',
 ca.received_by_user_id = @operator_user_id,
 ca.received_by_employee_id = @receiver_id,
 ca.received_at = TIMESTAMP(@payment_date, TIME(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)),
 ca.updated_at = NOW();

SELECT c.customer_code AS new_cno, c.legacy_customer_no AS old_cno,
 ca.account_id, ca.account_status, ca.office_received_amount,
 ca.balance_amount, p.cash_amount, p.online_amount, p.paid_date, p.received_date
FROM payment_targets t
JOIN cable_customer_accounts ca ON ca.account_id = t.account_id
JOIN cable_tv_customers c ON c.cable_customer_id = ca.cable_customer_id
JOIN cable_customer_account_payments p ON p.account_id = ca.account_id
ORDER BY ca.account_id, p.payment_id;
-- Persist the payment history and account updates together.
COMMIT;



