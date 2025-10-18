# 📋 **COMPLETE REQUIREMENTS DOCUMENT**
## **Employee Management, Attendance & Payroll System**
### **For Furniture Manufacturing Company - Tanzania**

**Document Version**: 1.0
**Date**: 2025-10-18
**Status**: Requirements Gathering Complete - Ready for Implementation Planning

---

## **PART 1: ORGANIZATION & EMPLOYEE BASICS**

### **1.1 Company Size & Structure**
- **Total Employees**: 150-250 employees
- **Departments**: Multiple departments (production, admin, sales, etc.)
- **Locations**:
  - 3 fixed factory locations
  - Multiple project sites
  - Construction sites
  - Employees move between locations frequently

### **1.2 Organizational Hierarchy**
- Full organizational structure needed
- Department management
- Position/job title management
- Reporting lines (who reports to whom)

---

## **PART 2: EMPLOYEE INFORMATION & CATEGORIES**

### **2.1 Employment Types**
- **NO Permanent Contracts** - All temporary:
  - Short-term: 1-3 months
  - Medium-term: 1-2 years
  - Casual/daily workers
  - Part-time workers (for projects)
- **Probation Period**: 1-3 months (flexible, configurable per employee)

### **2.2 Employee Information to Track**
- Personal details (name, photo, contact, emergency contact)
- Job position and department
- Location assignment (can change frequently)
- Contract type and duration
- Start date, contract end date
- Probation period (if applicable)
- Employment status (active, on leave, terminated, etc.)
- NSSF number (mandatory for all employees)
- Bank account details
- **Preferred document language** (English or Swahili for payslips)

### **2.3 Document Management**
- Contract documents (upload PDFs/images)
- ID documents
- Certificates/qualifications
- For **Expatriates** (special documents):
  - Resident Permit (with expiry tracking)
  - Labor Permit (with expiry tracking)
  - Special Pass (with expiry tracking)
  - Visa documents (with expiry tracking)
  - Ticket documents (upload, track costs, reimbursements, return tickets)

---

## **PART 3: ATTENDANCE, SHIFTS & ZKTECO INTEGRATION**

### **3.1 Working Hours & Days**
- **Normal working hours**: 8 hours work + 1 hour lunch = **9 hours at workplace**
- **Full-time standard**: **196 hours per month** (Tanzania Labor Law: 45 hours/week maximum)
- **Working days**: Up to 7 days per week
- **Sunday work**: Attracts **1.5x overtime** (for locals) or **+1 day annual leave** (for expatriates if 9+ hours worked)

### **3.2 Shift Management**
- **ALL shifts are CONFIGURABLE** in payroll/attendance settings
- **NOT hardcoded** - Admin can add/edit/delete shifts
- Each shift has:
  - Shift name (e.g., Shift A, Shift B, Night Shift)
  - Start time and end time
  - Percentage bonus (configurable, e.g., 10%, 15%, 25%)
- **Employees can work different shifts on different days**
- **Shift assignment authority**: Configurable (Admin, Supervisor, or Manager)
- **Planning flexibility**: Daily, Weekly, or Monthly (configurable)

### **3.3 Overtime Rules**
- **Overtime starts**: After 9 hours per day (8 work + 1 lunch)
- **Overtime rates** (CONFIGURABLE in settings):
  - Weekday overtime: Default 1.5x (configurable)
  - Sunday overtime: Default 1.5x (configurable)
  - Public holiday overtime: Default 2x (configurable)
- **Overtime limit**: **50 hours per 4-week cycle** (system warns/blocks when exceeded)
- **Overtime approval workflows**:
  - **Pre-approval scenario**: Manager approves overtime BEFORE employee works
  - **Post-approval scenario**: Employee works overtime, then submits for approval
- **Overtime rejection policy**: ALL 3 options available, **Option B is default**:
  - Option A: Not paid, hours discarded
  - **Option B (Default)**: Paid but flagged for management review
  - Option C: Converted to compensatory time off

### **3.4 Expatriate Special Rules**
- **NO overtime pay** for expatriates
- **Sunday/Holiday work**: If full shift (9+ hours) → **Add +1 day to annual leave**
  - Only if NO compensatory day off was already taken
- **Annual leave**: Unlimited accumulation, no expiry, carry forward indefinitely
- **Must request annual leave** (for travel planning)
- **Ticket management**: Upload documents, track costs, reimbursements, return tickets

### **3.5 Clock In/Out Behavior**
- **4 clock events per day**:
  1. Clock In (start of day)
  2. Lunch Out (start of lunch break)
  3. Lunch In (end of lunch break)
  4. Clock Out (end of day)
- **Purpose**: Monitor lunch break compliance (should be ~1 hour)

### **3.6 Lateness & Grace Period**
- **Grace period**: **5 minutes** (configurable in settings)
- **Late deduction priority**:
  1. First deduct from accumulated overtime hours
  2. Then deduct from regular working hours
- **Warning letter trigger**: After **6 late occurrences in a month**

### **3.7 Manual Attendance Entry**
- **Who can submit**: Supervisor, HR, or Manager
- **Visual distinction**: Different color/marking for manual entries
- **Audit trail**: Full traceability (who edited, when, what changed, reason)
- **Approval required**: Manager or HR Manager must approve manual entries

### **3.8 Public Holidays**
- **Pre-populated** with Tanzania public holidays
- **Customizable**: Admin can add/edit/delete holidays
- **Yearly management**: Can edit for each year

### **3.9 ZKTeco S922 Biometric Integration**
- **Current setup**: 1 device now, planning for multiple devices
- **Connectivity**: 3G SIM card for real-time sync
- **Real-time attendance**: Live data sync from devices
- **Offline alerts**: Configurable recipients (email/SMS when device goes offline)
- **Multi-device support**: System should support multiple ZKTeco devices at different locations

---

## **PART 4: SALARY, ALLOWANCES & TANZANIA TAXES**

### **4.1 Salary Types**
- **Mixture of payment types** (configurable per employee):
  - Monthly salary
  - Daily rate
  - Hourly rate

### **4.2 Payment Timing**
- **Payment date**: **2nd or 3rd of next month**
- **All employees paid**: Same time

### **4.3 Allowances**
- **Housing Allowance**: Yes (for some employees)
- **Transport Allowance**: Yes (for some employees, not all)
- **Meal Allowance**: **Expatriates only**
- **Project Allowance**: Yes (for project assignments)

### **4.4 Per Diem**
- **Variable based on**:
  - Position/job level
  - Project type
  - Location (site/city)
- **Taxable** but maintained/tracked separately
- Need to record per diem assignments with dates and amounts

### **4.5 Tanzania Tax & Statutory Contributions**

#### **4.5.1 PAYE (Pay As You Earn) Tax** - Employee pays
**Progressive tax brackets** (must be configurable in settings):
- 0 - 270,000 TZS = **0%**
- 270,001 - 520,000 TZS = **8%**
- 520,001 - 760,000 TZS = **20%**
- 760,001 - 1,000,000 TZS = **25%**
- Above 1,000,000 TZS = **30%**

#### **4.5.2 NSSF (National Social Security Fund)**
- **Employee contribution**: **10%** of gross salary
- **Employer contribution**: **10%** of gross salary
- **Total**: 20% (must be configurable in settings)
- Each employee must have **NSSF number** stored

#### **4.5.3 SDL (Skills Development Levy)** - Employer pays
- **Rate**: **4%** of gross monthly emoluments
- **Paid by**: Employer (NOT deducted from employee)
- **Must be configurable** in settings

#### **4.5.4 WCF (Workers Compensation Fund)** - Employer pays
- **Rate**: **0.5%** of monthly gross earnings
- **Paid by**: Employer (NOT deducted from employee)
- **Must be configurable** in settings

#### **4.5.5 HESLB (Higher Education Students Loans Board)**
- **Status**: **NOT CURRENTLY USED**
- **Future**: Keep in system settings for potential future use
- **Rate** (if used): 15% of gross salary
- **Paid by**: Employee (deducted from salary)

#### **4.5.6 Other Pension Funds (PPF/LAPF/GEPF)**
- **Status**: **NOT USED** - Only NSSF for now

### **4.6 Company Loans to Employees**
- **Loans provided**: **Yes**, all types (emergency, housing, personal, etc.)
- **Interest rate**: **0%** (interest-free)
- **Maximum amount**: **Up to 2 months salary** (with room for exceptions/other options)
- **Repayment**: **Monthly automatic deduction** from salary
- **Skip payment option**: With approval, employee can skip a month and push to next month
- **Approval workflow**: **Finance Director** approves all loans
- **Tracking needed**:
  - Loan amount
  - Disbursement date
  - Monthly installment amount
  - Remaining balance
  - Repayment schedule
  - Skip payment requests and approvals

### **4.7 Salary Advances**
- **Allowed**: **Yes, but optional** feature
- **Maximum amount**: **Variable** (case-by-case decision)
- **Request frequency**: **No limitation**
- **Deduction method**: **Flexible** (next month or spread over multiple months - depends on case)
- **Approval**: **Finance Director** approves all salary advances

### **4.8 Other Deductions**
- ❌ **Uniform purchase**: NO deduction
- ⚠️ **Uniform replacement**: **Yes, sometimes** deducted
- ✅ **Tools/equipment damage/loss**: **Yes**, especially from a list of tools
- ❌ **Cash shortages**: NO
- ❌ **Late arrival penalties**: NO (beyond hour deductions)
- ❌ **Disciplinary fines**: NO
- ❌ **Union dues**: NO
- ❌ **Savings schemes**: NO

### **4.9 Expatriate Salary Reporting**
- **TWO salary amounts** for expatriates:
  1. **Payroll amount**: Partial salary (for PAYE tax calculation and statutory compliance)
  2. **Full salary**: Complete salary amount (for management reporting purposes)
- **Purpose**: Tax compliance while providing management visibility

### **4.10 Insurance (Expatriates)**
- **Company-paid** for expatriates
- **Track**:
  - Insurance provider
  - Policy number
  - Coverage details
  - Premium amount
  - Start date and expiry date
  - Policy documents (upload)

### **4.11 Medical Expenses (All Employees)**
- **Company pays** all medical expenses for expatriates and locals
- **Track**:
  - Employee name
  - Date of treatment
  - Hospital/clinic name
  - Medical issue/diagnosis
  - Amount paid
  - Receipt/invoice upload
  - Reimbursement tracking (if employee paid first)
- **Approval workflow**: Required (Manager or HR approves claims)

### **4.12 Payslips**
- **Format**: **PDF and Physical** (both)
- **Delivery**: Downloaded and sent by management
- **Language**: **Configurable per employee** (preferred document language set in employee page - English or Swahili)
- **Confidentiality**: **No password protection** (downloaded and sent by management)

**Details to show on payslip**:
- ✅ Basic salary, allowances breakdown, gross salary
- ✅ All deductions itemized (PAYE, NSSF, SDL, WCF, loans, advances, etc.)
- ✅ Overtime hours and payment
- ✅ Leave balance
- ✅ Year-to-date totals
- ✅ Bank details
- ✅ Company logo and employee photo

### **4.13 Bank Payments & Salary Transfer**
- **Current bank**: **CRDB** (but need option to change bank in settings)
- **Employee accounts**: Sometimes at different banks
- **File formats**: **Excel CSV, TXT, Bank-specific format** (all options)
- **Payment timing**: **All employees paid same day**
- **Auto-generate files**: **Yes**, automatically generate bank payment files from system
- **Split payments**:
  - **Yes** - Some employees full bank transfer
  - Some employees **cash or partial cash**
  - **Expatriates always cash**
- **Payment confirmation tracking**: **Not needed**

---

## **ADDITIONAL REQUIREMENTS**

### **System-Wide Features**

#### **Role-Based Access Control**
- **Admin**: Full system access
- **HR Manager**: Employee management, payroll, reports
- **Finance Director**: Loan/advance approvals, payroll review
- **Manager**: Department oversight, attendance approval, overtime approval
- **Supervisor**: Shift assignment, manual attendance entry
- **Employee**: Self-service portal (view payslip, leave balance, attendance)

#### **Configurable Settings**
**ALL the following MUST be in settings** (not hardcoded):
- All tax rates (PAYE brackets, NSSF %, SDL %, WCF %, HESLB %)
- All shift definitions (name, time, percentage bonus)
- Overtime rates (weekday, Sunday, holiday multipliers)
- Overtime limits (50 hours per 4-week cycle)
- Grace period for lateness (5 minutes default)
- Late occurrence threshold for warnings (6 per month)
- Bank details (current bank, can be changed)
- Public holidays (yearly management)
- Company information (logo, name, address)

#### **Audit Trail & Traceability**
- **Track all manual entries**: Who, when, what changed, reason
- **Track all approvals**: Loan approvals, advance approvals, overtime approvals, manual attendance approvals
- **Track all edits**: Attendance edits, employee data changes
- **Full history**: Keep complete audit log

#### **Approval Workflows**
- **Overtime approval**: Pre-approval and post-approval scenarios
- **Manual attendance**: Manager or HR Manager approval
- **Loans**: Finance Director approval
- **Salary advances**: Finance Director approval
- **Medical expenses**: Manager or HR approval
- **Skip loan payment**: Approval required

#### **Alerts & Notifications**
- **Overtime limit warning**: When employee approaches 50 hours per 4-week cycle
- **Overtime limit block**: Prevent exceeding 50 hours
- **Late occurrence warning**: After 6 late arrivals in a month
- **Device offline alert**: When ZKTeco device goes offline (configurable recipients)
- **Contract expiry alert**: Warn before employee contract expires
- **Document expiry alert**: Expatriate permits/visas expiring soon

#### **Reporting Requirements**
- **Attendance reports**: Daily, weekly, monthly by employee/department/location
- **Overtime reports**: By employee, department, period
- **Payroll reports**: Monthly payroll summary, tax reports, NSSF reports
- **Leave reports**: Leave balances, leave taken, leave requests
- **Loan reports**: Outstanding loans, repayment schedules
- **Medical expense reports**: By employee, department, period
- **Expatriate reports**: Full salary vs payroll salary comparison
- **Year-to-date reports**: For tax purposes

---

## **KEY DESIGN PRINCIPLES**

1. ✅ **Everything configurable** - All rates, percentages, shifts in settings (future-proof)
2. ✅ **Full audit trails** - Track who, when, what changed for all manual entries
3. ✅ **Dual expatriate reporting** - Protect tax compliance while providing management visibility
4. ✅ **Flexible approval workflows** - Support both planned and emergency scenarios
5. ✅ **Smart deduction priority** - Protect employee hours by deducting late time from overtime first
6. ✅ **Multi-location support** - Employees can move between locations
7. ✅ **Multi-device support** - Multiple ZKTeco devices at different locations
8. ✅ **Language flexibility** - English/Swahili configurable per employee
9. ✅ **Document management** - Upload, store, track expiry dates
10. ✅ **Tanzania Labor Law compliance** - 196 hours/month, 45 hours/week, statutory deductions

---

## **INTEGRATION POINTS**

1. **ZKTeco S922 Biometric Devices**
   - Real-time attendance sync via 3G
   - Multiple device support
   - Offline alert system

2. **Bank Payment Systems**
   - CRDB bank (current)
   - Generate payment files (CSV, TXT, bank-specific formats)
   - Support for multiple banks

3. **Existing System Integration**
   - Integrate with current warehouse/inventory system
   - Use existing Prisma ORM + PostgreSQL/Neon database
   - Use existing Fastify backend
   - Use existing React + Material-UI frontend
   - Leverage existing role-based authentication
   - Use existing file upload capabilities

---

## **OUT OF SCOPE (For Now)**

- ❌ HESLB loan deductions (keep in settings for future)
- ❌ Other pension funds beyond NSSF
- ❌ Union dues
- ❌ Savings schemes
- ❌ Payment confirmation tracking from banks
- ❌ Employee self-service mobile app (future consideration)

---

## **NEXT STEPS**

After approval of these requirements, the following will be created:

1. **Database Schema Design** - Complete ERD with all tables, relationships, indexes
2. **System Architecture Diagram** - Frontend, backend, integrations, modules
3. **Implementation Roadmap** - Phased approach (MVP → Phase 2 → Phase 3)
4. **Feature Priority Matrix** - Critical, High, Medium, Low priorities
5. **Technical Specifications** - API endpoints, data flows, validation rules
6. **Testing Strategy** - Unit tests, integration tests, UAT plan
7. **Deployment Plan** - Migration strategy, rollout approach

---

**Document Status**: ✅ Requirements Complete - Awaiting Approval for Implementation Planning

---

**Prepared by**: Claude Code
**Review Date**: 2025-10-18
**Approval Status**: Pending Review
