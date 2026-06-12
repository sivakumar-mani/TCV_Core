# Employee Module - Requirements Checklist

## Database Schema Status ✅

### Implemented Features:
- ✅ **1. Auto-generated Employee Code** - Using "TCV" prefix with sequential numbering
  - Method: `generateEmployeeCode()` in employeeController.js
  - Pattern: TCV1, TCV2, TCV3, etc.

- ✅ **2. Employee Name Fields** - Split into first_name and last_name
  - CONCAT_WS used in queries to display full name
  
- ✅ **3. Permanent & Temporary Addresses** - Captured with state, city, pincode
  - permanent_address, permanent_city_district, permanent_state, permanent_pincode
  - temporary_address, temporary_city_district, temporary_state, temporary_pincode

- ✅ **4. Photo Upload** - JPEG, JPG, PNG only, max 1MB
  - Multer configured with file validation
  - photo_file_name and photo_path fields in DB
  - Upload directory: `/backend/uploads/employees`

- ✅ **6. ID Proof Types Dropdown** - Indian acceptable proofs
  - ENUM values: AADHAAR, PAN, VOTER_ID, PASSPORT, DRIVING_LICENSE, RATION_CARD, NREGA_JOB_CARD, BANK_PASSBOOK, POST_OFFICE_PASSBOOK, GOVERNMENT_EMPLOYEE_ID, DEFENCE_ID, PENSIONER_CARD, BIRTH_CERTIFICATE, OTHER

- ✅ **8. Employee Salary in Separate Table** - REMOVED from employees table
  - Separate `employee_salary` table created
  - Separate `employee_salary_items` table for earnings/deductions

- ✅ **10. Phone/Alternate Phone Validation** - Max 10 digits, numeric only
  - Regex: `/^[0-9]{10}$/`
  - Applied to both phone and alternate_phone fields

- ✅ **11. Mandatory Fields Enforced**
  - Permanent address, DOB, Qualification, Spouse/parent Name, ID Proof Type, ID Proof Number
  - Validation in `validateEmployee()` function

- ✅ **12. Temporary Address NOT Mandatory** - No validation required

- ✅ **14. Alternate Phone NOT Mandatory** - Validation only if provided

- ✅ **15. Last Name MANDATORY** - In validation list

---

## Frontend Implementation Needed ❌

### Form Component Requirements:

#### 1. **Date Picker Fields** (Instead of text input)
   - [ ] Date of Birth - with date picker icon
   - [ ] Joining Date - with date picker icon
   - [ ] Should use Angular Material date picker

#### 2. **Phone Number Validation UI**
   - [ ] Phone field: max 10 digits, numeric only
   - [ ] Alternate phone: optional, max 10 digits, numeric only
   - [ ] Email validation with proper UI feedback

#### 3. **Dropdown Lists for State & District**
   - [ ] State dropdown (populated from state master)
   - [ ] District dropdown (dependent on selected state)
   - [ ] Both for permanent and temporary address

#### 4. **Photo Upload**
   - [ ] File input with preview
   - [ ] Accept only jpeg, jpg, png
   - [ ] Max 1MB validation on frontend
   - [ ] Display uploaded photo in view

#### 5. **ID Proof Type Dropdown**
   - [ ] Populate from ENUM: AADHAAR, PAN, VOTER_ID, PASSPORT, DRIVING_LICENSE, RATION_CARD, NREGA_JOB_CARD, BANK_PASSBOOK, POST_OFFICE_PASSBOOK, GOVERNMENT_EMPLOYEE_ID, DEFENCE_ID, PENSIONER_CARD, BIRTH_CERTIFICATE, OTHER

#### 6. **Address Sections**
   - [ ] Permanent Address section (MANDATORY)
   - [ ] Temporary Address section (OPTIONAL)
   - [ ] Each with: Address, City/District, State, Pincode

#### 7. **Employee Display**
   - [ ] Show uploaded photo
   - [ ] Display employee code
   - [ ] Show full name (first_name + last_name)
   - [ ] All other employee details

---

## Backend Implementation Status 📊

### Implemented:
- ✅ Photo upload with multer
- ✅ Phone validation regex
- ✅ Email validation regex  
- ✅ Required fields validation
- ✅ Auto-generation of employee code
- ✅ CRUD operations (GET, POST, PUT, DELETE)
- ✅ Photo handling (upload, storage, retrieval)

### TODO:
- [ ] API endpoint for fetching Indian states and districts
- [ ] Employee salary endpoints (get, add, update, delete)
- [ ] Photo retrieval endpoint (serve static files)
- [ ] ID proof types dropdown endpoint

---

## Additional Requirements ⚠️

### 5. Aadhar API Integration (Optional)
   - [ ] Research public API for Aadhar data fetch
   - [ ] Implement optional auto-fill from Aadhar number

### 7. City/District Naming
   - [ ] Create state_district_mapping table or master data

---

## Mandatory Fields Summary
1. First Name ✅
2. Last Name ✅
3. Phone (10 digits) ✅
4. Designation ✅
5. Department ✅
6. Joining Date ✅
7. Date of Birth ✅
8. Qualification ✅
9. Spouse/Parent Name ✅
10. ID Proof Type ✅
11. ID Proof Number ✅
12. Permanent Address ✅
13. Permanent City/District ✅
14. Permanent State ✅
15. Permanent Pincode ✅

---

## Optional Fields Summary
- Alternate Phone ✅
- Email ✅
- Temporary Address ✅
- Temporary City/District ✅
- Temporary State ✅
- Temporary Pincode ✅
- Photo ✅
- Relationship ✅
- Kids Details ✅

---

## Next Steps Priority:
1. **HIGH** - Create State & District master tables
2. **HIGH** - Implement date picker in frontend forms
3. **MEDIUM** - Create photo display endpoint
4. **MEDIUM** - Create salary management module
5. **LOW** - Integrate Aadhar API (if public API available)
