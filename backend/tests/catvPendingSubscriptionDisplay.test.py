"""Exercise the detail query's CASE calculations using an in-memory SQL fixture."""
import calendar
from pathlib import Path
import re
import sqlite3
import unittest

SOURCE = (Path(__file__).resolve().parents[1] / 'controller/cableTvController.js').read_text()
DETAIL = SOURCE[SOURCE.index('const getCableCustomerById ='):]
QUERY = re.search(r'const \[subscriptions\] = await db.query\(\s*`([^`]+)`', DETAIL).group(1)


class PendingSubscriptionDisplay(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.row_factory = sqlite3.Row
        self.db.create_function('GREATEST', -1, max)
        self.db.create_function('CONCAT_WS', -1, lambda sep, *args: sep.join(str(v) for v in args if v is not None))
        # MySQL '/' uses decimal division, unlike SQLite's integer division.
        self.db.create_function('DAY', 1, lambda value: float(value[-2:]))
        self.db.create_function('LAST_DAY', 1, lambda value: value[:8] + str(calendar.monthrange(int(value[:4]), int(value[5:7]))[1]))
        self.db.executescript('''
          CREATE TABLE cable_subscriptions (subscription_id INTEGER, cable_customer_id INTEGER,
            customer_package_id INTEGER, subscription_year INTEGER, subscription_month INTEGER,
            payment_status TEXT, approval_status TEXT, amount REAL, balance_amount REAL,
            paid_amount REAL, billing_basis TEXT, number_of_days_or_months INTEGER,
            received_count INTEGER, start_date TEXT, collected_by_employee_id INTEGER,
            payment_mapped_employee_id INTEGER);
          CREATE TABLE cable_customer_packages (customer_package_id INTEGER, cable_customer_id INTEGER,
            package_id INTEGER, package_price REAL, is_active INTEGER, approval_status TEXT);
          CREATE TABLE cable_package_master (package_id INTEGER, package_name TEXT, package_type TEXT, price REAL);
          CREATE TABLE employees (employee_id INTEGER, first_name TEXT, last_name TEXT, employee_code TEXT);
          INSERT INTO cable_customer_packages VALUES (1,9516,1,300,1,'PENDING');
          INSERT INTO cable_package_master VALUES (1,'Basic','ADDON',300);
          INSERT INTO cable_subscriptions VALUES
            (1,9516,1,2026,11,'PENDING','PENDING',200,200,0,'DAY',20,1,'2026-11-14',NULL,NULL);
        ''')

    def tearDown(self):
        self.db.close()

    def row(self):
        # SELECT sub.* repeats amount aliases; use the final calculated column.
        cursor = self.db.execute(QUERY, [9516])
        values = cursor.fetchone()
        return dict(zip([column[0] for column in cursor.description], values))

    def test_pending_package_displays_saved_twenty_day_amount(self):
        row = self.row()
        self.assertEqual(row['amount'], 200)
        self.assertEqual(row['balance_amount'], 200)
        self.assertEqual(row['approval_status'], 'PENDING')

    def test_approved_subscription_keeps_active_approved_package_total(self):
        self.db.execute("UPDATE cable_customer_packages SET approval_status='APPROVED'")
        self.db.execute("INSERT INTO cable_customer_packages VALUES (2,9516,1,150,1,'APPROVED')")
        self.db.execute("INSERT INTO cable_customer_packages VALUES (3,9516,1,900,1,'PENDING')")
        self.db.execute("UPDATE cable_subscriptions SET approval_status='APPROVED'")
        self.assertEqual(self.row()['amount'], 300)
        self.assertEqual(self.row()['balance_amount'], 300)

    def test_paid_history_is_unchanged(self):
        self.db.execute("UPDATE cable_subscriptions SET payment_status='PAID', paid_amount=200")
        self.assertEqual(self.row()['amount'], 200)
        self.assertEqual(self.row()['balance_amount'], 0)

    def test_partial_history_is_unchanged(self):
        self.db.execute("UPDATE cable_subscriptions SET payment_status='PARTIAL', paid_amount=50, balance_amount=150")
        self.assertEqual(self.row()['amount'], 200)
        self.assertEqual(self.row()['balance_amount'], 150)


if __name__ == '__main__':
    unittest.main()
