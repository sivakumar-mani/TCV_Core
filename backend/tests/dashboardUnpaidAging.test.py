"""Pipe JSON containing unpaidSql('CATV') and unpaidSql('NET') into this test."""
import json
import sqlite3
import sys
import unittest

QUERIES = json.load(sys.stdin)


class UnpaidAging(unittest.TestCase):
    def test_distinct_customers_and_age_buckets_for_both_services(self):
        for service, query in QUERIES.items():
            with self.subTest(service=service):
                db = sqlite3.connect(':memory:')
                catv = service == 'CATV'
                table = 'cable_subscriptions' if catv else 'internet_subscriptions'
                customer_table = 'cable_tv_customers' if catv else 'internet_customers'
                key = 'cable_customer_id' if catv else 'internet_customer_id'
                db.execute(f'CREATE TABLE {customer_table} ({key} INTEGER, approval_status TEXT, customer_type TEXT)')
                db.execute(f'CREATE TABLE {table} ({key} INTEGER, approval_status TEXT, payment_status TEXT, amount REAL, paid_amount REAL, subscription_month INTEGER, subscription_year INTEGER)')
                for customer in range(1, 11):
                    db.execute(f'INSERT INTO {customer_table} VALUES (?, ?, ?)', (customer, 'PENDING' if customer == 9 else 'APPROVED', 'FREE' if customer == 10 else 'REGULAR'))
                rows = [
                    (1,'APPROVED','PENDING',200,0,11,2026),
                    (1,'APPROVED','PENDING',100,0,11,2026),  # Multiple packages: one customer.
                    (2,'APPROVED','PARTIAL',200,50,10,2026),
                    (2,'APPROVED','PENDING',200,0,11,2026),  # Oldest wins: not current bucket.
                    (3,'APPROVED','PENDING',200,0,9,2026),
                    (4,'APPROVED','PENDING',200,0,12,2025),  # Year boundary.
                    (5,'APPROVED','PENDING',200,0,12,2026),  # Future excluded.
                    (6,'APPROVED','PAID',200,200,11,2026),
                    (7,'PENDING','PENDING',200,0,11,2026),  # Approval pending excluded.
                    (8,'APPROVED','PENDING',200,200,11,2026),  # No actual debt.
                    (9,'APPROVED','PENDING',200,0,11,2026),  # Customer approval pending.
                    (10,'APPROVED','PENDING',200,0,11,2026), # Free CATV is excluded.
                ]
                db.executemany(f'INSERT INTO {table} VALUES (?,?,?,?,?,?,?)', rows)
                # Preserve SQL aggregation/filtering, replacing only the server clock.
                sql = query.replace('YEAR(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)', '2026').replace('MONTH(UTC_TIMESTAMP() + INTERVAL 330 MINUTE)', '11')
                self.assertEqual(db.execute(sql).fetchone(), (1 if catv else 2, 1, 2))
                db.close()


if __name__ == '__main__':
    unittest.main()
