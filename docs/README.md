# TCV Core project guide

- `TCV_Core_Database_and_Development_Guide.pdf`: development guide, schema dictionary, endpoint reference and database ID diagram appendix.
- `TCV_Core_Database_ID_Diagrams.pdf`: printable table/primary-key catalog and ID relationship diagrams.
- `TCV_Core_Development_Guide.html`: editable/searchable guide source, excluding the generated vector diagram appendix.
- `TCV_Core_Guide_Source_Inventory.json`: source hashes, tables, relationships and API inventory used to verify coverage.

Reviewed against the repository on **6 October 2026**. No database connection, database changes or deployment was performed. Declared foreign keys and inferred ID links are distinguished. The August production schema snapshot, later migrations and runtime CREATE/ALTER logic may differ from the deployed schema.

To regenerate from the repository root with Python and PyMuPDF installed:

```powershell
python docs/generate_project_guide.py
```

The generator checks rendered PDF text for every selected table and mounted router, verifies active lazy component files exist, and rejects blank pages. Layout previews were inspected separately. Application files are unaffected.
