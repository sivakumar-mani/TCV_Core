-- One-time production data correction requested for these two material movements.
-- The WHERE clause protects any record that was not changed to 03-09-2026.
START TRANSACTION;

UPDATE technician_material_movements
SET movement_date = '2026-07-31 00:00:00'
WHERE movement_no IN ('MAT-000006', 'MAT-000007')
  AND DATE(movement_date) = '2026-09-03';

SELECT movement_no, movement_date, sale_status
FROM technician_material_movements
WHERE movement_no IN ('MAT-000006', 'MAT-000007');

COMMIT;
