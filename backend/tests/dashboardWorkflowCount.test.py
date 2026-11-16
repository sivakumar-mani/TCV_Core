"""Execute dashboard count SQL against small, isolated in-memory fixtures."""
from pathlib import Path
import re
import sqlite3
import unittest

SOURCE = (Path(__file__).resolve().parents[1] / 'controller/dashboardController.js').read_text()
QUERY = re.search(r"widgetQuery\('workflow', `(SELECT\s.*?AS waiting_count)`\)", SOURCE, re.S).group(1)


class WorkflowCount(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.executescript('''
          CREATE TABLE workflow_approvals (module_name TEXT, reference_id INTEGER, workflow_status TEXT);
          CREATE TABLE work_orders (work_order_id INTEGER PRIMARY KEY, customer_id INTEGER);
          CREATE TABLE customers (customer_id INTEGER PRIMARY KEY);
          CREATE TABLE internet_customers (internet_customer_id INTEGER PRIMARY KEY);
          CREATE TABLE work_order_material_issues (work_order_id INTEGER, approval_status TEXT);
          CREATE TABLE purchase_master (supplier_id INTEGER, approval_status TEXT, purchase_status TEXT);
          CREATE TABLE suppliers (supplier_id INTEGER PRIMARY KEY);
          CREATE TABLE cable_approval_groups (approval_group_id INTEGER PRIMARY KEY, approval_status TEXT, group_type TEXT);
        ''')
        for table in ['cable_tv_customers', 'cable_connections', 'cable_customer_stbs',
                      'cable_customer_packages', 'cable_subscriptions', 'cable_customer_accounts']:
            self.db.execute(f'CREATE TABLE {table} (approval_group_id INTEGER, cable_customer_id INTEGER)')

    def tearDown(self):
        self.db.close()

    def count(self):
        return self.db.execute(QUERY).fetchone()[0]

    def test_single_visible_request_excludes_stale_and_unsupported_rows(self):
        self.db.executescript('''
          INSERT INTO internet_customers VALUES (7);
          INSERT INTO workflow_approvals VALUES ('INTERNET_CUSTOMER',7,'PENDING');
          INSERT INTO workflow_approvals VALUES ('INTERNET_CUSTOMER',99,'PENDING');
          INSERT INTO workflow_approvals VALUES ('SUPPLIER',99,'PENDING');
          INSERT INTO workflow_approvals VALUES ('INTERNET_CUSTOMER',7,'APPROVED');
        ''')
        self.assertEqual(self.count(), 1)

    def test_catv_requires_linked_customer_and_excludes_subscription_updates(self):
        self.db.executescript('''
          INSERT INTO cable_tv_customers VALUES (NULL,9516);
          INSERT INTO cable_connections VALUES (2074,9516);
          INSERT INTO cable_customer_accounts VALUES (2074,9516);
          INSERT INTO cable_approval_groups VALUES (2074,'PENDING','CONNECTION_UPDATE');
          INSERT INTO cable_approval_groups VALUES (2075,'PENDING','CONNECTION_UPDATE');
          INSERT INTO cable_approval_groups VALUES (2076,'PENDING','SUBSCRIPTION_UPDATE');
          INSERT INTO cable_subscriptions VALUES (2076,9516);
        ''')
        self.assertEqual(self.count(), 1)

    def test_work_orders_and_material_issues_require_visible_links(self):
        self.db.executescript('''
          INSERT INTO customers VALUES (1);
          INSERT INTO work_orders VALUES (10,1);
          INSERT INTO workflow_approvals VALUES ('WORK_ORDER',10,'PENDING');
          INSERT INTO workflow_approvals VALUES ('WORK_ORDER',99,'PENDING');
          INSERT INTO workflow_approvals VALUES ('MATERIAL_ISSUE',10,'PENDING');
        ''')
        self.assertEqual(self.count(), 1)
        self.db.execute("INSERT INTO work_order_material_issues VALUES (10,'PENDING')")
        self.assertEqual(self.count(), 2)

    def test_supplier_payments_require_supplier_and_pending_non_cancelled_purchase(self):
        self.db.executescript('''
          INSERT INTO suppliers VALUES (1);
          INSERT INTO purchase_master VALUES (1,'PENDING','OPEN');
          INSERT INTO purchase_master VALUES (99,'PENDING','OPEN');
          INSERT INTO purchase_master VALUES (1,'PENDING','CANCELLED');
          INSERT INTO purchase_master VALUES (1,'APPROVED','OPEN');
        ''')
        self.assertEqual(self.count(), 1)

    def test_quotation_left_join_and_cctv_visibility_are_preserved(self):
        self.db.executescript('''
          INSERT INTO workflow_approvals VALUES ('QUOTATION',99,'PENDING');
          INSERT INTO customers VALUES (1);
          INSERT INTO workflow_approvals VALUES ('CCTV_CUSTOMER',1,'PENDING');
          INSERT INTO workflow_approvals VALUES ('CCTV_CUSTOMER',99,'PENDING');
        ''')
        self.assertEqual(self.count(), 2)


if __name__ == '__main__':
    unittest.main()
