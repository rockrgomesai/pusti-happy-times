# Secondary Software Requirement Specification (SRS)
## Pusti ERP System - Complete Documentation

**Document Information:**
- **Title:** Software Requirement Specification (SRS)
- **Client:** TK Group
- **Vendor:** TechKnowGram Limited
- **Location:** 5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh
- **Contact:** Phone: +88 02 55008199 | Mobile: +88 01819250309
- **Website:** www.TechKnowGram.com
- **ISO Certifications:** ISO 9001 :: ISO 27001 :: ISO 14001

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Definitions & Abbreviations](#2-definitions--abbreviations)
3. [System Overview](#3-system-overview)
4. [Functional Requirements](#4-functional-requirements)
5. [Modules Overview](#5-modules-overview)
6. [Reports & Analytics](#6-reports--analytics)
7. [Technical Specifications](#7-technical-specifications)
8. [Non-Functional Requirements](#8-non-functional-requirements)

---

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to build an online system for TK Group that will manage:
- Different types of roles and their associated users
- Flow of products from factory to depot and then to distributor
- Finally distribution to targeted outlets
- Order management and delivery of products to outlets
- DSR (Distributor Sales Representative) tracking
- Different types of reports for different stakeholders

### 1.2 Scope

The project scope includes the development of the following components:

1. **Web Application** - For desktop/laptop users
2. **Android Application** - For mobile devices
3. **iOS Application** - For Apple mobile devices
4. **RESTful Web API Service** - Centralized backend service

**Key Features:**
- Centralized database system accessible only through RESTFul web API
- User management for authorized system operators
- Order management according to different routes
- User movement tracking from depot to outlets via distributor
- Sales, payment and recipient management
- Inventory and reporting system
- Various reports for authorized users and top management
- Administrative module for order approval/rejection
- Management of outlet lists and categories

### 1.3 Target Users

The Pusti project is directed toward:
- Owners of small to large outlets
- Stock managers responsible for maintaining sufficient goods in retail or manufacturing business
- Sales officers and field staff
- Area, Zonal, and Regional heads
- Distributors and their teams
- Management and administrative staff

---

## 2. Definitions & Abbreviations

| Term | Definition |
|------|------------|
| **DB** | Distributor - Partner of TK group (not a direct employee) |
| **AH** | Area Head - Monitors activities of SO |
| **ZH** | Zonal Head |
| **RH** | Regional Head |
| **SO/SR** | Sales Officer/Sales Representative - Direct employee under area, monitors distributors |
| **TMR** | This Month Revenue |
| **DSR** | Distributor Sales Representative |
| **DP** | Distributor Price |
| **TP** | Trade Price |
| **SRS** | Software Requirement Specification |
| **SD** | Super Distributor |
| **SIO** | Sales Information Office |
| **HOS** | Head Of Sales |
| **CCP** | Category Call Productivity |
| **LPC** | Line Per Call |
| **S/R** | Strike Rate |
| **CD** | Commission Distributor |
| **MT** | Metric Ton |
| **CTN** | Carton |
| **OTC** | Over The Counter - Irregular sales |
| **SKU** | Stock Keeping Unit - Individual product item |
| **POS** | Point of Sale - Retail outlet |

---

## 3. System Overview

### 3.1 Product Flow

The system manages the following product flow:

```
Factory → Depot → Distributor → Outlets/POS
```

### 3.2 System Architecture

The system consists of four main logical components:

1. **User & Role Management**
   - Different types of roles and associated user management
   - Role-based access control
   - Permission management

2. **Inventory Management**
   - Multi-level inventory tracking (Factory, Depot, Distributor)
   - Product availability checking
   - Stock management and transfers

3. **Order Processing**
   - SO places orders during outlet visits
   - DSR delivers products based on created orders
   - Order tracking and status management

4. **Reporting & Analytics**
   - Comprehensive reporting system
   - Real-time dashboards
   - Performance metrics and KPIs

### 3.3 Access Methods

- **Web Application** - Accessible by different roles with specific privileges
- **iOS Application** - Mobile access for field staff
- **Android Application** - Mobile access for field staff
- **Microservice-based Applications** - Backend services

---

## 4. Functional Requirements

### 4.1 Secondary Sales Order Processing

Secondary sales orders are orders placed by Sales Officers (SO) during their visits to outlets/POS.

#### General Steps:
1. SO physically visits the outlets
2. Records if any order is placed
3. Lists all required SKUs
4. Creates memos of the orders placed
5. At end of day, inputs summarized order data

#### Order Collection Process (2-Step):

**Step 1: Outlet Status & Coverage**
- Mark whether outlet is open or closed
- If open, perform outlet coverage:
  - Check which TK Group products are present
  - Mark available brands
  - Submit coverage data

**Step 2: Order Placement**
- Two options:
  - **YES**: Place an order
  - **NO**: No order required (select reasons)

### 4.2 Track Shop Status

- SO moves to associated screen
- Check if shop is open or not
- Submit opening status of the shop

### 4.3 Outlet Coverage

Outlet coverage tracks available TK Group product brands at visiting shops.

**Process:**
1. SO visits the shop by finding the outlet
2. System finds minimum distance based on latitude/longitude
3. When close enough, enables sales order button
4. System shows all TK Group products for the unit
5. User clicks on brands whose products are available
6. User submits the data
7. Coverage happens only if shop is open
8. Previous status can be modified if shop status changes

### 4.4 Order Activity

After outlet coverage, two options:

#### 4.4.1 No Order
- SO clicks on NO option
- Screen shows predefined reasons (from master settings)
- SO selects one or more reasons
- User submits

#### 4.4.2 Place Order

**Manual Order:**
- User creates paper-based memo with:
  - Line number (total SKUs)
  - Total categories
  - Total amount
- User inputs same information into system

**System-Based Order:**
- SO creates order directly in system
- Inputs:
  - SKU
  - Category
  - Quantity
  - Total price

**Offline Order:**
- User logs in via iOS/Android app
- Places order while offline
- Products retrieved from local DB (SQLite)
- Order data stored in local storage
- Background scheduler synchronizes to online storage
- Local data removed after sync

### 4.5 Order Amendment

SO or authorized users can modify secondary sales orders:
- Select the order for modification
- Change SKU-based items:
  - Number of items
  - Delivery date
  - Delete items
- Can modify by selected outlet/POS

### 4.6 Outlet Summary

Date range-wise information:
- Specific outlet sales order history (in Tk.)
- Specific outlet delivery history (in Tk.)
- SKU-wise sales order history (order qty, order amount)
- SKU-wise delivery history (delivery qty, delivery amount)

### 4.7 Order Placement (Summary Input)

If SO creates manual order, summary input is required:
- Line number/number of SKUs from memo
- Number of categories
- Total price
- Total number of memos
- Number of visited outlets
- Selected route

**System Calculations:**
- CCP = (No. of total categories / total number of memos)
- LPC = (Total SKUs / Total number of memos)

### 4.8 Product Delivery

DSR collects memos and order summary, loads vehicles, and delivers to outlets.

#### Update Inventory
After delivery, update:
- Number of products delivered
- Delivery date
- Who delivered
- Delivery narration

#### Delivery Confirmation (IMS Entry)
- Select date (default: current date)
- From/to date for intervals
- Delivery can be: partial, full, or remaining items
- Date-wise delivery summary reports
- Interval-based delivery data
- GD can place orders (logged)
- For intervals, put total count in single field
- Show total days based on selected date range
- DSR can update via mobile apps
- IMS/OTC summary includes:
  - Line number/SKU count
  - Number of categories
  - Total price
  - Total memos
  - Number of visited outlets
  - Selected route

#### Delete IMS
Admin can delete secondary sales:
- By selected SR and POS
- By selected date
- By SKU

#### Edit IMS
Admin can edit IMS:
- Select sales officer
- Select POS
- Modify products and items
- Submit

#### Create Order
If SO cannot create order, admin can:
- Select SO, route, and DSR
- Input SKU-wise:
  - Secondary sales quantity
  - Free products for DB (for adjustment)
  - Free product pieces
- Number of memos
- Number of line items

### 4.9 Product Return Management

#### Return Eligibility Criteria
Criteria for product returns:
- Damaged goods
- Defective products
- Dissatisfaction with product
- Managed via master settings

#### Return Product Process
1. Select eligible criteria for return
2. Set time frame
3. Maintain shipping and restocking costs
4. Define return activities
5. Remove products from retailers
6. Handle via mobile application only

#### Return and Adjustment

**Product Adjustment:**
- DB collects and returns to depot/inventory
- Update orders with defect products
- Track product replacements
- Notify higher authority
- Distributor replaces at shop/POS
- Send defective products to factory:
  - Raise approval via system
  - Audit team visits and verifies
  - If approved, collect damaged products to factory
  - Company decides: replace or provide equivalent money

**Financial Adjustment:**
- Finance department verifies root causes
- For eligible cases, adjust balances
- Notify shop owner
- Deposit amount to customer's ledger
- May ask distributor to sell products then adjust money

### 4.10 User Movement Tracking

#### Navigation
System tracks SO movement from POS to POS:
- Collects longitude and latitude
- User opens application
- System shows assigned SO positions
- Displays user position
- Renders graphical movement line as SO moves
- View position on iOS/Android screen

#### Using Website
For devices with built-in GPS:
- Website requests GPS access via browser's Geolocation API
- With user consent, retrieves latitude/longitude
- Stores information randomly
- Authorized users track users via changed lat/lon on map

### 4.11 TMR (This Month Report) / Month Closing Process

TMR closing freezes sales of selected month and calculates opening balance for next month. After closing, no modification is allowed.

#### Closing Operation
Authorized users can manipulate TMR data:
- Select product category
- Opening quantity of target month
- Product SKU
- Total received amount
- Total free quantity by SKU
- Adjustment of received products
- Adjust free amounts
- Free items not calculated in sold items
- Sold items on target month
- Free items offered during selling
- Cannot perform TMR for current month
- Can delete TMR closed data by:
  - Nationwide
  - Zone/division
  - Region
  - Area
  - Selected distributor
- Can modify TMR sales data if required
- Only applicable for DB's sales

#### Closing Area Options
- Nationwide
- By zone/division
- By region
- By area
- By selected distributor

### 4.12 Audit & Survey

#### Product Survey
Survey on different products from competitors:
1. Select area on specific date
2. Select route
3. Select POS
4. Form populates with all competitors' names for each SKU
5. Input available products' SKUs for all competitors
6. Conduct by POS in selected route

#### Price Survey
Price comparison with competitors:
1. Select area on specific date
2. Select route
3. Form populates with competitors for each SKU
4. Input prices of all competitors

#### Delivery Memo Audit
Information to cover:
- Price of selected TK Group products
- Outlet-wise category coverage audit
- Product category generally sold from outlet
- Competitors' category at outlet
- Product presence status
- Coverage summary for route
- Duration-based category coverage
- Coverage comparison and growth analysis
- Date range-based summary
- SR visiting status
- Category-wise coverage ratio for whole area

#### Distributor Audit

**Stock Survey:**
- Select dealer/distributor on specific date
- Input number of available products (physical vs system)
- Product-wise quantity

**Document Availability:**
Check available documents:
- ROI
- Attendance sheet
- Route chart
- Sales and stock register
- Managed via master settings (boolean data)

**Logistic Support:**
Audit items (managed via master settings):
- Smartphone (available/not)
- Laptop
- Printer
- Number of sales officers (numeric)
- Stock space sufficiency (boolean)
- Number of drivers

**Product Complaints:**
- Track SKU-wise:
  - Damaged items
  - Expired items
  - Other issues
- Track by date with comments/remarks

**Investment Status:**
For selected distributor on selected date:
- Investment amount for floor stock
- Undelivered quantity
- Payment in transit (cash, bank, market credit)
- Status managed via master settings

**Sales Officer Activity:**
Dynamic activities via master settings:
- Dress code maintenance
- Attitude (positive/negative)
- Physical violence involvement
- Loyalty
- Relationship maintenance
- Professional equipment

### 4.13 Stock Management

#### Stock Transfer
Transfer stocks between distributors:
- Select source distributor
- Select receiving DB
- Transfer schedule/date
- Reasons for transfer
- Can transfer by SKU, single item, or all

#### TMR Transfer
- Select source DB
- Select target DB
- Transfer TMR

#### Transfer Sales
- Select source SO
- Select target SO
- Transfer sales orders
- Full month or partial transfer

#### Modify Sales
- Select SO
- Select date interval
- Modify data
- Submit changes

#### Transfer Target
- Select source SO
- Select target SO
- Transfer sales targets

#### Target New SKU
- Select product item/SKU
- Add SKU to all targets

### 4.14 Attendance

Manage attendance for:
- SO
- ASM
- RSM
- Zonal/divisional head
- Administrator (head office employees)

**Process:**
- Login to system
- Move to associated screen
- Select employee
- System allows attendance for current date only
- Status options:
  - P: Present
  - A: Absent
  - L: Leave
  - R: Region

### 4.15 Payroll

#### Salary
HR generates payroll considering:
- Maximum allowed leave days for the month
- Allowed late presents (max 3 per month)
- Basic salary and all allowances

#### Allowance
Manage various allowances:
- PJP (Permanent Journey Plan) shared in advance
- Detail level traveling for 1st half (9am-12pm) and 2nd half (2pm-7pm)
- Information: DB name, Market, Serial number
- Accessible by all stakeholders
- Approval process required
- Revised journey plan facility
- Track total journey details:
  - Date of travel
  - From/To locations
  - Mode of transportation
  - Amount of money
  - Purpose
- Add multiple items at once
- Auto-calculate monthly totals
- Cross-check with Google Maps data
- Allowance categories:
  - Visit categories (Base/Ex-Base/Night Stay)
  - TA (Travel Allowance)
  - DA (Daily Allowance)
  - Entertainment
  - Hotel allowance
  - Fuel
  - Others

**For SO (National):**
- Zone, Region, Area
- SO ID, Name
- DB ID, Name
- Total Days of Month
- W/D, Leave, Absent, LWP
- Total Days of Payment
- Approved TA/DA
- Total Amount
- Miscellaneous Expense
- Payable Amount

### 4.16 User Feedback

End users can send feedback on:
- Product quality
- Policies
- Communication
- Delivery services
- Sales-related matters

Authorized users review feedback and make plans based on demand.

---

## 5. Modules Overview

### 5.1 Inventory Management
- Form management
- Data registration
- TMR entry
- Dealer received data
- Dealer product adjustment
- Zone-wise posting

### 5.2 Secondary Order Processing
- Order collection
- Place order
- Upload summary
- Outlet product delivery
- Update inventory
- Upload delivery
- Display summarized data

### 5.3 User Movement
- Website-based tracking
- Mobile application-based tracking

### 5.4 Order Collection
- Place order
- Upload summary

### 5.5 Outlet Product Delivery
- Update inventory
- Upload delivery
- Display summarized data

### 5.6 Master Settings
- Configure system parameters
- Manage master data

### 5.7 Product Delivery Tracking
- Real-time tracking
- Delivery status monitoring

---

## 6. Reports & Analytics

### 6.1 Dashboard

#### Current Status
- Sales TP
- Order TP
- Number of visited:
  - Routes
  - POS
  - Ordered outlets/POS
- Number of active manpower:
  - Zonal head
  - Regional head
  - Area head
  - Distributor
  - Sales officer (SO)
  - Distribution sales representatives (DSR)
- Number of active SKUs
- Total active POS
- Number of active routes

#### Secondary Sales Section
- Time pass % of current month
- Last 3 months bar chart (total secondary sales)
- Tabular representation:
  - Target DP
  - Sales DP
  - Achievement %
  - Distributor's sales gift quantity
  - Damage % (MT)
- Category-wise status:
  - Category name
  - Target DP
  - Sales DP
  - Achievement %

#### Primary Sales
- Target DP of month
- Sales DP
- Achievement %

#### Collection
- Target total
- Total month collection
- Achievement %
- Time pass %

#### Distribution Stock
Category-wise current month stock:
- Category name
- Stock in pieces
- Stock in MT
- Damage stock in MT

### 6.2 Sales Dashboard

Features:
- Secondary sales amount by date range
- Filter by: Zones, Regions, Areas, SO, DB
- Collections
- Primary sales
- Sales order
- Summary filter by DP or TP
- Upper management can view all subordinate data

### 6.3 Live Dashboard

By date range:
- Secondary sales amount
- Distribution collection
- Received product by distributor
- Voucher entry statistics
- Default: current date (can select date range)
- Upper management can view all subordinate data

### 6.4 App Link

Mobile application dashboard sections:

#### Target
**Daily Target:**
- Target sales amount
- Already sold amount of day

**Monthly Target:**
- Target sales for month
- Already sold amount

#### Today KPI
Cumulative SO data:
- Target POS
- Visited POS
- Visited outlet %
- Total memos
- Strike rate %
- Total lines/SKU
- LPC
- CCP
- Total lines
- Total DB
- Total SOs
- SO on duty
- Sales order via mobile app
- SO on leave
- Resigned SOs
- Absent SOs today

#### KPI By Route
- Select from/to date
- Select areas and distributor
- Generate reports showing:
  - Area, Distributor, SO, Route name
  - Number of outlets
  - Number of memos
  - Productive call % = (Memo/visited outlet) × 100
  - Visited/non-visited outlets
  - Working hours (via mobile app)
  - Order amount
- Time pass/sales update % for selected route

#### Monthly KPI
- Select target month
- Generate reports:
  - Total sales target in TP
  - Total sales amount in TP
  - Achievement %
  - Target/achieved productive call
  - LPC target
  - Total lines sold
  - Target/sold products
  - Achievement %
- Time pass %
- Filter by selected month/date range

#### Time Pass Report
By category:
- Category name
- Target amount TP
- Sold amount TP
- Achievement %
- Average calculated data
- Filter by selected date
- Generate in CTN and MT

### 6.5 Order Summary

For SO to review:
- Product information:
  - Category, SKU
  - Number of memos
  - Ordered SKUs
  - Ordered amount TP
- Check by date range
- Show summation at end
- PDF download

### 6.6 Delivery Summary

For SO:
- Product category
- SKU
- Delivered quantity
- Delivered amount (TP)
- Filter by dates
- Generate in CTN and MT

### 6.7 Damage Summary

For SO:
- Product category
- SKU
- Delivered quantity
- Delivered amount (TP)
- Filter by dates
- Generate in CTN, MT, and DP

### 6.8 POS Information (Search Outlet)

Display outlet/POS information:
- Outlet number, name
- Address details
- Owner information
- Status
- Operation date
- Market size

### 6.9 Order vs. Execution Report

Information:
- Category
- Target in TP (SR) / DP (distributor)
- Till date order
- Order achievement % = (Till date order/monthly target)
- Till date IMS
- Execution % = (Till date IMS/Till date order) × 100
- Monthly IMS = (Till date IMS/Monthly target) × 100
- Weight % (fixed value from product category)
- Weighted average achievement
- Yesterday ordered amount
- Today IMS
- Execution % = IMS/Last day order in TP
- Order target in TP today
- Today's order achievement
- Today's order achievement %
- Same reports in CTN and MT
- For distributor login: use DP
- Higher management can filter for all subordinates

### 6.10 Web Portal Access

- Web application in responsive mode
- Role-specific operations
- Auto-login capability

### 6.11 Manual Order & Delivery Summary

#### Orders by Route
Information:
- Division, Region, Zone, Distributor, Route name
- Routes visited
- Scheduled outlet
- Average visited outlet
- Average order memos
- Average failed orders
- Average non-visited outlets
- PC %/Visit (Order)
- Avg. Line Order/Visit
- Avg. Cat. Order/Visit
- Avg. LPC/Visit [Ordered]
- Avg. CCP/Visit [Ordered]
- Sales Order (TP/DP)
- Avg. Sales Order (TP/DP)
- Filter by date interval, all SO or selected
- Download capability
- Limited view in mobile, full view in web

#### Delivery By Route
Information:
- Division, Region, Zone, Distributor, Route
- Revenue in DP/TP
- Delivered: Memos, Lines, Categories, CCP, LPC
- Filter by date interval, SO
- Download capability
- Limited mobile view, full web view

#### Order by SKU
Information:
- Division, Region, Zone, Route, Category, Product ID
- SKU Name, Order Qty, Revenue[DP/TP]
- SO, SO Mobile
- Filter by date range, SO
- Excel/PDF download

#### Delivery by SKU
Information:
- Route, Category, Product ID, SKU Name
- Order Qty, Revenue[DP/TP], SO
- Filter by SO, date interval
- Excel download

#### Daily Order Summary
Information:
- Division, Region, Zone, DB Name
- SO/SR ID, Name, Route
- Visits/Route, Schedule Outlet
- Outlet Order Memo, Fail to make Order
- Non-visited Outlet
- PC %, Line Order/Visit, Cat. Order/Visit
- LPC/Visit, CCP/Visit
- Sales Order (TP/DP)
- Excel download

### 6.12 Productivity Report

Information (same as Daily Order Summary):
- Filter by selected date or all dates
- Excel download

### 6.13 Outlet Visit Status

Information:
- Division, Region, Zone, Distributor, SO Name
- Route, Outlet, Order Status
- Unvisited outlets report
- Filter by region, zone, area, route
- Interval-based reports

### 6.14 Commission Reports

#### SD Commission
Information:
- DB Code, Division, Region, Zone
- Super Distributor name
- Lifting amounts by product type
- Commission % and payable amounts
- Total lifting and commission
- Remarks
- Filter by product, in taka, in percentage
- Settings-based commission (category, product)

#### Sales Commission
Information:
- Division, Region, Zone, Distributor
- Employee ID, Name, Designation, Joining Date
- Contribution %
- Lifting amounts by product type
- Commission per lac
- Payable amounts
- Total lifting and commission
- Remarks

#### CD Commission
Information (similar to SD Commission):
- Filter by product, in taka, in percentage

### 6.15 Sales Order Reports

#### Order List
- Orders by route
- Filter by date range, day
- Customizable columns
- CSV download
- By SO/SR
- Route-wise orders
- DB and category-wise
- Region-wise
- Status-based (fully/partially/undelivered)
- Last 4 weeks by: SO, DB, Area, Route, Region, Zone
- Outlets without orders (with reasons)
- Outlet-wise SKU and category

#### SO Schedule
Download schedules by day of week:
- Sat, Sun, Mon, Tue, Wed, Thu, Fri

#### Order View and Memo
Summary information:
- Zone, Area, DB, Route, SR, Outlet Name
- Sales Order Amount-TP
- Filter by Route, Keyword, Date
- Detailed summary by Category, SKU, quantities, amounts

#### Summary by SKU
- SKU-based on specific date/interval
- Filter by region, area, zone, route, outlet
- Raw data download
- Filter by dates

#### Sales Order Summary and SKU Wise Report
Comprehensive information:
- Zone to Outlet details
- Order and delivery quantities/amounts
- Multiple filtering options
- Summary by Quantity vs. Category/Brand/SKU
- Date-wise SKU details

#### Raw Order Data
- Outlet-wise cumulative orders by SKU
- Date interval-based orders
- Sales officer-wise: Memos, quantities, values
- Target reports by outlet, amount, memo
- Delivery information
- Category coverage
- Date range filtering

### 6.16 Raw Data Sales/IMS

Delivery report types:
- Sales Type=1: OTC Sales
- Sales Type=0: Memo to memo sales/IMS input
- Distributor and SO wise sales (filter by dates)
- SKU-wise sales summary
- SO-wise raw data
- Current stock of distributor

### 6.17 Outlet Reports

- POS/outlet detailed information
- Route-wise outlet quantity
- Zone-wise outlet order/delivery reports
- Filter by Date, Category, SKU

### 6.18 Promotional Reports

- Product, Category
- Promotional details
- Filter by dates, routes

### 6.19 Top SKUs

- Top 10 SKUs
- SKU details with prices
- Filter by date range
- By routes, national, zone, region, area

### 6.20 SO Movement Report

Information:
- Outlet name, SO information
- Start/end time at outlet
- Duration to place order
- Location info (Division, Region, Area, Route)
- Excel download
- Route-wise or all routes
- Google map display with lat/lon
- Outlet details on map

### 6.21 Sales Order Summary Reports

#### Route Wise KPI
Comprehensive route performance data including:
- Zone to Route details
- Total outlets, visited, memo counts
- Call productivity, achievement %
- TEA memo and sales targets
- Winning status, LPPC
- Sales/Delivery amounts, variance

#### SO Wise KPI
Detailed SO performance metrics

#### DB Category Wise KPI
Category performance by distributor

#### Region Wise KPI
Regional performance summary

#### Area Wise KPI
Area performance summary

### 6.22 Delivery Status Report

- Interval based
- Order Date, Route, SR, Outlet details
- Quantities, amounts, variance
- Filter by: Pending, Hold, Delivered, Date, Route

### 6.23 Reason Summary

- Interval-based reasons for no sales
- Information: Zone, Region, Area, Distributor, Route, Reason, Outlet Qty
- Filter by dates, Region, Zone, Route

### 6.24 Outlet Wise SKU Category Order

- Date-wise report
- Filter by: Selected date, Region, National, Area, DB
- Information: Zone to Outlet, Category, Assumption vs Actual

### 6.25 MIS Report

#### Category Wise Update (Time Pass)
- Secondary sales on selected date
- For: Division, Region, Zone, Route, Distributor, SO, AH
- Interval based

#### Regular Report
Extensive reporting including:
- SR-wise daily secondary sales
- Secondary sales summary
- Category-wise achievement
- Primary/secondary sales with achievement
- SKU-wise monthly contribution
- Target vs sales summary
- Daily/distributor sales summary
- Stock reports
- Damaged/returned products
- Sales and collection summary

#### Daily Summary (DO, Secondary and Delivery)
Daily summary by category:
- Filter by: National, Zone, Region, Area, Date
- Information includes:
  - Target vs Secondary (Monthly target, Sales MT, Achievement %)
  - Secondary achievement (MTD, Time pass %, Revenue)
  - Delivery Achievement
  - SO Achievement
  - DB Closing Stock
  - Undelivered amounts
  - Revenue percentages
  - Weighted averages

#### Monthly Report (Day Wise)
- Monthly sales summary for DB, SDB, SO
- By SKU, Category, Route
- Daily sales for each day of month
- Filter by: Zone, Region, Area, Route, Dates
- Statistical reports by Area, TSO, SO, day-wise orders

### 6.26 Statistical Reports

#### Distribution
- Report for selected month
- Filter by: Zone, Region, Area, Distributor, SO

#### Distributor Details
- Date interval details
- Zone-wise summary
- Filter by: Area, Region, Zone, Route

#### Distributor Wise Product
Comprehensive distributor product reports including:
- Delivered orders summary
- SKU information
- Live data
- Distribution status (Posted/Not posted/Canceled)
- Account clearance
- Dashboard for Bank, Region, Territory

#### Outlet Information
- Filter by: Division, Region, Zone/Area, Route, Creation date
- Nationwide checking
- Excel/CSV download
- Filter by paid amount
- Distributor-wise outlets
- New outlets by duration

#### Voucher Summary
- Live data access
- Filter by date/range
- Sales orders, collection data, received products

#### Trade Program
- By program details
- Excel/CSV download

#### Distributor's Claimed Report
- Offer date range
- Sales date range

#### Drive Product
- By selected month
- Excel/CSV download

#### Competitor's Information
- By selected month
- By distributor or all
- Excel/CSV download

#### Package or Gift Booking
- Specific date interval

#### Assessment & Tour
- Date-wise for head office
- Assessment on selected dates/intervals
- User-wise tour reports
- SO assessment
- RSM assessment
- Territory SO reports

### 6.27 TMR Report

#### Product Wise Rate In Year-Month
- Product-wise monthly for specific year
- Information: Brand, Product ID, Name, TP, DP
- Filter by: TP, DP, Product/Category ID

#### Negative Check
- Secondary sales for negative stock check
- Information: Region, Territory, Dealer, Category, SKU
- Opening, Receive, Adjust, Stock, Sales, Floor Stock
- For specific month/year

#### National Report (Dealer wise details)
- Nationwide for selected dealers
- Month-specific for selected year
- Comprehensive stock information
- Filter by: DB, Region, Zone, Area, Months

#### National Report (SKU Wise Summary)
- Nationwide SKU summary for month
- Stock information by SKU
- Filter by: Month, Region, Zone, Area

#### Within Two Month Sales Comparison & Growth
- Two months comparison
- Quantity and value
- % Growth (Qty/Value)
- Filter by: Zone, Category, SKU, Territory
- Year to year SKU

#### Year to Year Sales Comparison - Total Value
- From/to year
- Nationwide, SKU wise
- Monthly breakdown (Jan-Dec) with totals

#### 6 Month SKU Sales
- SKU-based nationwide/regional/zonal/route
- Last 6 months from today
- Information: Product, Category, SKU, monthly data
- Filter by: Division, Region, Zone, Route (individually or all)

### 6.28 Target vs. Achievement Reports

#### Target Details
- SO-wise target details
- SKU details
- Filter by: area, zone, region, route
- Excel/CSV download
- TP or DP based
- Information: Zone, Area, Distributor, SR/SO, Status, Category, SKU, Qty, Amount

#### Area Based Target Details
- Area-based with SKUs
- TP and DP filtering
- Information: Zone, Area, Category, SKU, Qty, Amount(TP)

#### Target Summary & Achievement
- SO-wise report
- Filter by: area, region, zone
- Comprehensive data: Target/Sales amounts (EDP/ETP), PC, TLS, LPC, CCP

#### Target Summary By Distributor
- All or selected distributors
- Specific month/year
- Information: Zone, Area, Distributor, Amount-EDP

#### SKU Wise Target vs Achievement
- Distributor-wise
- SO target and achievement
- Filter by: Region, Zone, Area, Route, DB, Nationwide, Category, Date range
- Primary and secondary sales

#### SKU Summary
Detailed SKU information:
- Target/Sales quantities and amounts
- Various metrics (Pcs, CTN, MT, DP, TP, FREE)
- Variance, Achievement %, Contribution %

#### Category Summary
Category-wise summary with similar metrics as SKU

#### Brand Summary
Brand-wise summary with comprehensive metrics

#### Distributor SKU Wise Target vs Achievement - Landing Target
- Filter by: Category, Region, Zone, Area, Route, SKU, Territory
- Include distributors without targets
- Brand/SKU/Category summaries
- Landing target information

#### SKU Wise Target vs Achievement (SO)
- SO report by SKUs
- Filter by: Zone, Region, Route, Month
- Single/multiple products

#### Target Yet Not Set
- SOs without targets
- Month-specific
- Information: AH Name/Mobile, SR/SO Name, Area

#### Total Sales & Collection Summary
- By: SO, TSO, DSM
- Date range based

#### Distributor Target Primary
- Nationwide primary target
- Month-specific
- Information: Region, Area, Dealer, Products
- Total primary sales

#### Target Achievement By All Dealers
- Nationwide dealer achievement
- Filter by dealer
- For selected month

#### Target Achievement - Territory
- Selected month
- Primary achieved target
- Territory-wise

#### Target achievement - Region
- Selected month
- Primary achieved target
- Region-wise

### 6.29 Collection & Incentive Report

#### Distributor's Daily Collection
Information:
- Region
- Primary target
- Day-wise collection
- Monthly collection
- Achievement % (secondary/primary)
- Total target secondary sales
- Secondary sales EDP total
- Filter by: Division, Region, Area, Route
- Territory-wise summary
- Territory-based dealer summary

#### Nationwide Incentive
- All or selected dealers
- Selected month
- For: SO, TSO, RSM (selected or all)
- Salary or incentive month
- Salary range based

#### Yearly Achievement
- For SO
- By selected year

#### Yearly Achievement (Exclusive SR)
- For exclusive SOs with special criteria
- By selected year

### 6.30 Attendance & Payroll Reports

For: SO, DH, AH, ZH, RH
- Specific date or interval based

#### Attendance
- Daily by selected/all zones
- Specific date based
- Excel/CSV download
- Filter by: SO, Region, Zone, Area, Route
- Report periods: Daily, Weekly, Bi-weekly, Monthly, Selected interval
- Raw data based

#### Attendance Modification
- Modify, Delete reports
- Filter by: zone, region, area
- Specific or date range modification

#### Leave
- Daily, monthly, weekly, interval-based
- Designation-wise for selected/specific date
- Raw data

#### Leave Modification
- For inconsistent records
- Filter by designation
- Date-based modification

#### Distributor's Orders
Comprehensive distributor order reports with filtering and status tracking

---

## 7. Technical Specifications

### 7.1 External Interface Requirements

#### Software Interfaces

**Front-end:**
- Angular (TypeScript-based, free and open-source single-page web application framework)
- Latest version

**Backend:**
- Oracle database
- Microservice-based development
- Java Spring Boot

**Operating System:**
- Windows (chosen for best support and user-friendliness)
- Also compatible with: Linux, Mac

#### Communication Interface
- Supports all web browsers compatible with CGI, HTML & JavaScript

### 7.2 Architecture

#### System Components
1. **Frontend Web Application** - React-based
2. **WEB API** - Laravel-based
3. **Mobile Application** - Android (loads response web pages using webview)

#### Development Methodology
**Agile Framework using Scrum Method:**
1. Enlist all features
2. Split into modules and sub-modules
3. Set priority on modules
4. Split features into tasks and sub-tasks
5. Distribute to different sprints
6. Get customer consent
7. Assign sprint development priority
8. Development team works per sprint priority

---

## 8. Non-Functional Requirements

### 8.1 E-R Diagram

**Major Entities:**
- AH (Area Head)
- RH (Regional Head)
- ZH (Zonal Head)
- SO (Sales Officer)
- DSR (Distributor Sales Representative)
- DB (Distributor)

**Properties/Attributes:**
- Attributes belong to entity properties
- Used to identify entities
- Establish relationships with other entities
- Connect entities and represent meaningful dependencies

**Order Management System:**
- Entities connected through relationships
- Meaningful dependencies among entities

### 8.2 Normalization

**Objective:**
- Reduce redundancy (store information only once)
- Prevent wastage of storage space
- Reduce total data size

**Approach:**
- Design tables to deal with single theme
- Handle three kinds of modification anomalies
- Formulate first, second, and third normal forms (3NF)
- Sufficient for most practical purposes
- Requires thorough analysis and complete understanding

### 8.3 Web Application

**Key Features:**
- Main component communicating with API system
- All database operations via API
- Token-based authentication for security
- Session timeout after desired interval
- User needs to re-authenticate after timeout

### 8.4 Reliability

- All security mechanisms handled from API
- Enhancements only in API end
- Lower cost as different consumers use centralized system

### 8.5 Memory Management

**Framework:**
- Rich Laravel Frame for API development
- Releases unnecessary consumption
- Optimizes system performance
- Angular-based frontend framework
- Efficient inter-service communication
- No performance degradation

---

## Appendix

### Product Development Cycle
- Agile/Scrum methodology
- Sprint-based development
- Continuous customer feedback
- Iterative improvements

### Contact Information

**TechKnowGram Limited**
- Address: 5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh
- Phone: +88 02 55008199
- Mobile: +88 01819250309
- Email: info@techknowgram.com
- Website: www.TechKnowGram.com

**Document Prepared By:**
- AKM Ahmedul Islam BABU
- Founder & CEO | TechKnowGram Limited
- Phone: +88 02 550 08199
- Mobile: +88 01713453337
- Email: ahmedulbabu@techknowgram.com
- Gmail: ahmedulbabu@gmail.com

---

**Document Version:** 1.0  
**Last Updated:** As per PDF extraction  
**Total Pages:** 69 (in original PDF)

---

*End of Document*
