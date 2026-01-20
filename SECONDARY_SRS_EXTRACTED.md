

=== PAGE 1 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
 
 
 
 
 
Software Requirement Specification  
(SRS)  
 
 
 
 
 
 
 
 
 
 
 
 
 
 
BY 
 
-----------------------------------------------------------------  
AKM Ahmedul Islam BABU  
Founder  & CEO |  TechKnowGram Limited  
Phone : +88 02 550 08199 | Mobile : +88 01713453337  
e-Mail : ahmedulbabu@techknowgram.com  | g -Mail : ahmedulbabu@gmail.com  
 
 
 
 
 
 


=== PAGE 2 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
Table of Contents  
Introduction  5 
Purpose  5 
Scope  5 
Definitions, Acronyms, and Abbreviations  6 
Overview  7 
General Description  7 
Functional Requirements  8 
Inventory Management  9 
Form Management  10 
Data Registration  10 
TMR Entry  10 
Dealer Received Data  10 
Dealer Product Adjustment  10 
Zone Wise Posting  10 
Secondary Order Processing  11 
User Movement  12 
Using Website  12 
Mobile Application Based Tracking  12 
Order Collection  14 
Place Order  14 
Upload Summary  14 
Outlet Product Delivery  15 
Update Inventory  15 
Upload Delivery  15 
Display Summarized Data  16 
General Reports  16 
Sales Reports  16 
Master Settings  17 
Sales Dashboard  17 
Graph Report  17 
Top SKU Order  17 
Sales Promotion  18 
Product delivery Tracking  18 
Sales Reports  18 
Time Pass Report  18 
Regular and Major  18 
Date Wise Full Month  19 

=== PAGE 3 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Statistical Report  19 
Assessment or  Tour Reports  19 
Other Reports  20 
This Month Revenue (TMR) Report - MIS 20 
Target vs. Achievement Report  20 
Collection & Incentive Report  20 
Attendance & Payroll Report  21 
Audit & Survey  21 
Order and Delivery Management (DO)  21 
Product Approval Request  21 
Product Delivery Request  22 
DB Product Collection  23 
Responsive View  23 
Dashboard Management  23 
Master Dashboard  24 
Sales Dashboard  25 
External Interface Requirements  25 
Software Interfaces  25 
Communication Interface  25 
Non-Functional Requirements  25 
E-R Diagram  25 
Normalization  26 
Web Application  27 
Reliability  27 
Memory Management  27 
Architectural View  27 
Development Methodology  28 
 
 
 
 
 
 
 
 
 
 
 
 

=== PAGE 4 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
 
 
 
 
 
Introduction  
The introduction of the Software Requirements Specification (SRS) provides an overview of the 
entire Pusti product with purpose, scope, definitions, acronyms, abbreviations and references. 
The aim of this document is to gather and analyze and give an in -depth insight of the complete 
Pusti software system by defining the problem statement in detail. Nevertheless, it also 
concentrates on the capabilities required by stakeholders and their needs while defining high -
level product features. The detailed requirem ents of Pusti  are provided in this document.  
Purpose  
The purpose of the document is to build an online system for TK Group  that will manage 
different types of roles and their associated users, flow of products from factory to depot 
and then to distributor and finally for the targeted outlets . The document will illustrate the 
order management, delivery of products to outlets,  DSR tracking. Finally, the system will 
ensure different types of reports for different stakeholders.  
Scope  
The scope of this project is to make the following components of the Pusti project - 
1. A web application,  

=== PAGE 5 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
2. Android  application   
3. iOS application  and finally  
4. A RESTFul web api service  
There is a centralized database system which can only be accessed using the RESTFul web 
API service; i.e client applications can access data by using only this API service.  
Using the application, the authorized user can manage users who will run the system, 
manage orders according to different routes, track user movements from depot to outlets 
via distributor, sales, sale, payment and recipients. This project will fulfill the  requirement 
of inventory and reporting system. It will generate different types of reports for the 
authorized users and top management of the organization.  
It will enable different parties to set up orders, an administrative module will enable to 
approve or reject the request and maintain various lists of outlets and their categories.  
The main goal of the Pusti  project is to ensure consistent flow of products to outlets on 
different conditions like - supply products to outlets as per approved product list, products 
return etc. Thus, Pusti is directed toward owners of small to large outlets and stock 
managers who are responsible for maintaining sufficient goods on hand' in a retail or 
manufacturing business.  
Definitions, Acronyms, and Abbreviations  
 
DB Distributor is the partner of TK group. DB is not a direct employee of TK group.  
AH Area Head . This role can monitor activities of SO.  
ZH Zonal Head  
RH Regional Head  
SO Sales Officer. This role is under area. SO may monitor one or more than one 
DB who works for distributing the products. SO is a direct employee of TK 
group.  
TMR  This Month Revenue  
DSR  Distributor Sales Representative  
DP  Distributor Price  
TP Trade Price  

=== PAGE 6 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
SRS Software Requirement Specification  
SD Super Distributor  
SIO Sales Information Office  
HOS  Head Of Sales  
CCP  Category Call Productivity  
LPC Line Per Call  
S/R  Strike Rate  
CD Commission Distributor  
MT Metric Ton  
CTN Cartoon  
OTC  Over The Counter which represents irregular sales.  
 
Overview  
This document provides an overview of the software system, its purpose, scope, and intended 
audiences who will operate the system. It also includes references to other relevant documents 
and defines the terminology used throughout the SRS.  
General Description  
The SRS document serves as a crucial reference for both the development team and 
stakeholders, helping to ensure a common understanding of the software system's requirements. 
It illustrates the needs and wants of the stakeholders that were identified in th e brainstorming 
exercise as part of the requirements gathering meetings and online conversations. It further lists 
and briefly describes the major features and a brief description of each of the proposed systems.  
 
There are different flows that need to happen in the system to accomplish the tasks to deliver the 
products from factory to outlets and to track all kinds of activities of the stakeholders. The 
interrelationships among factories, depot, distributor and outlets can be depicted as follows - 

=== PAGE 7 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
 
The following SRS contains the detailed product perspective from different roles and operational 
activities. It provides the detailed product functions of godown, shop with user characteristics, 
permitted constraints, assumptions and dependencies and requi rements subsets.  
Functional Requirements  
The structure of the system can be split into four main logical components. The first component 
deals with different types of roles and their associated user management. The second component 
is the inventory management which allows the users at different l evels to check the availability of 
products. The third component is the ordering components using which the SO can place orders 
for different outlets according to routes and DSR can deliver products by retrieving details of the 
created orders. The fourth a nd final logical component is to generate different types of reports.  


=== PAGE 8 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
 
 
As can be seen in the above system model diagram, each of the four system components 
essentially provides a layer of isolation between the end user and the database. Firstly, allowing 
the end user to interact with the system through a rich user interface p rovides a much more 
enjoyable user experience, particularly for the non -technical users who will account for the 
majority of the system’s users. In addition, this isolation layer also protects the integrity of the 
database by preventing users from taking a ny action outside those which the system is designed 
to handle. All the functionalities can be accomplished by one of the following applications - 
1. Web application that can be accessed by different roles.  
2. iOS application and  
3. Android application.  
4. Microserservice based applications.  
 
There are user specific privileges and based on the assigned permissions, the UI will be populated 
after login to the system to perform different operations.  
Secondary Sales Order  
This type of order means the order which is placed by the sales officers (SO) during their visit at 
the POS or outlet.  
 


=== PAGE 9 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
The general steps for secondary order processing is as follows - 
● SO physically visits the outlets and records if there is any order placed or not.  
● List up all the SKUs required to place the order.  
● Creates memos of the orders placed.  
● At the end of day, SO will put the summarized data of the orders.  
 
 
 
Order Collection  
Order collection means placing an order and it needs to visit the POS physically to place an order. 
Order collection process is a two step process. In 1st step, it needs to collect details followed by 
uploading the summarized data. The summarized actions a re - 


=== PAGE 10 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Step 1: The user will mark whether the outlet is opened or not.  
● Step 2: If open, it needs to make outlet coverages using which, the user will mark which 
products of T.K Group are present in the shop.  
● Step 3: Then to place order, SO check and place order if required. If no order is placed, 
the reasons need to be marked.  
Track Shop Status  
● SO moves to the associated screen.  
● Check shop is open or not.  
● Submit opening status of the shop.  
Outlet Coverage  
Outlet coverage means tracking the available product brands of T.K Group which are available to 
the visiting shops. If the shop is open, the SO works as per the followings - 
● SO visits the shop by finding out the outlet.  
● The system finds the minimum distance of the shop w.r.t current position of SO in terms 
of latitude and longitude and enables the sales order button to make product or brand 
coverage.  
● When the user clicks on the sales order button, the system shows all the products of T.K 
Group’s concerned unit.  
● The user clicks on the brands whose products are available at the shop.  
● Then the user submits the data to store in the system.  
● The outlet coverage will happen if and only if the shop is open.  
● In case the shop closing status is traced but later opened and SO visits again then the 
previous status according to the current date will be modified.  
Order Activity  
After outlet coverage, the system will show two options - 
● YES: Using this, the SO will place an order.  
● NO: No order is required at the outlet.  
No Order  
If the shop is opened but no order is placed, the steps will be - 
● SO clicks on NO option.  
● The screen will populate previously defined reasons (master entry) on the screen which 
will represent the root cause of no order taken place..  
● SO will select one or more reasons about no order.  
● Finally, the user will submit.  

=== PAGE 11 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Place Order  
There will be settings which will allow the user to create order manually or system based. In order 
to place an order, SO clicks on the YES option.  
Manual order  
Using this process, the user will write the following information on a paper which will be handed 
over to the distribution team.  
● To create a paper based memo, the user will enter the following information  
○ Line number which represents the total number of SKU.  
○ Total categories and  
○ Total Amount.  
● Then the user puts the same information in a form of the system and finally submits. The 
user will put the similar information which is - 
○ Line which represents the total number of SKU.  
○ Total categories and  
○ Total Amount.  
System Based Order  
This order means, the SO will create order by outlet using the system(form based) and the user 
will put the following information during visiting the POS - 
● SKU 
● Category  
● Quantity  
● Total price.  
Offline Order  
The sales officer may place an order even from offline and the placement procedure is as below - 
● The authorized user logins using the iOS or android app.  
● Place an order and during the offline mode, the products will be retrieved from local DB 
(SQLite).  
● The ordered data will be stored on local storage.  
● A scheduler will be working in the background to synchronize the order to the online 
storage and finally, the local data will be removed.  
● All the operations of the order can be performed through mobile or web applications.  
Order Amendment  
As per request by the outlet owner, SO or the authorized user can edit the secondary sales order 
in the following ways - 
● Selects the order of the POS which needs to modify.  
● Change SKU based items in terms of - 
○ Number of items.  

=== PAGE 12 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Delivery date.  
○ Delete items etc.  
● Order can be modified by the selected outlet or POS.  
Outlet Summary  
● Date Range wise Specific Outlet Sales Order History (in Tk.)  
● Date Range wise Specific Outlet Delivery History (in Tk.)  
● Date Range wise  Specific Outlet SKU Wise Sales Order History (Order qty., Order 
Amount. etc)  
● Date Range wise Specific Outlet SKU Wise Delivery History (Delivery qty, Delivery 
Amount. etc)  
Order Placement  
If the SO creates an order manually, then this order summary  is required only.  
● SO is the responsible person to input all order summaries to the system.  
● At the end of day, the user will put the summarized data of the created orders where the 
following information needs to maintain - 
○ Line number or number of SKUs of the order collected from memo.  
○ Number of categories.  
○ Total price.  
○ Total number of memos.  
○ Number of visited outlets.  
○ Selected route.i.e the order KPI needs to track by route.  
● Based on the above 3 inputs, for each and every individual order, the system calculates 
the followings - 
○ CCP = (No. of total categories/total number of memos).  
○ LPC = (Total SKUs/Total number of memos).  
Delivery  
After delivering the products to the shop, the authorized users will put the inputs to the system 
using the following information - 
● The number of memos.  
● Number of lines or total number of individual products.  
● Total number of categories.  
● Selected route.i.e the order KPI needs to track by route. The KPI can be calculated on the 
following contexts - 
○ Number of planned SKUs to deliver or target of SKUs to deliver of the day.  
○ Actually delivered SKUs.  
● The full delivery process will be performed according to the order created using the 
system.  

=== PAGE 13 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Product Delivery  
In order to deliver the products of the secondary sales to the POS or outlet, the DSR collects all 
the memos, Order summary and as per these, they will load the vehicles with the target products 
and start for outlet delivery.  
Update Inventory  
After delivering the products, when the DSR comes back to the distributor’s point, it needs to 
update the inventory status. The authorized user is responsible to update the inventory 
accordingly. It needs to update inventory as below - 
● Change the number of products which are delivered.  
● Delivery date.  
● Who delivered.  
● Delivery narration.  
Delivery Confirmation  
IMS entry or delivery order needs to enter to the system according to the followings - 
● The user needs to select the date first to make an IMS entry. Default date will be the 
current date.  
● From and to date  need to be selected in case of interval in terms of more than one day.  
● Delivery will be partial, full or for the remaining items for the orders.  
● Date wise delivery summary reports need to be made.  
● Interval based delivery data need to be made.  
● GD can place an order like SO and the relevant logs need to be maintained who is under 
SDB or its own depot.  
● In case of interval, no need to put data in multiple fields but needs to put total count in a 
single text field.  
● Based on selected from and to date, total number of days needs to show in UI during 
uploading IMS data.  
● DSR may update the order inventory or delivery status by outlet using the mobile 
applications.  
● Delivery or IMS summary/OTC needs to put to the system  
○ Line number or number of SKUs of the order collected from memo.  
○ Number of categories.  
○ Total price.  
○ Total number of memos.  
○ Number of visited outlets.  
○ Selected route.i.e the order KPI needs to track by route.  
 

=== PAGE 14 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
Figure: Delivery related data  
 
Delete IMS  
Even after the delivery confirmation, the admin user can delete the secondary sales on the 
following ways - 
● The order can be deleted by the selected SR and POS. This will happen only when the 
head of sales requested it.  
● As per the selected date, the order can be deleted.  
● Delete the sales by SKU.  
Edit IMS  
The admin user can edit the IMS and in order to perform this, the user will - 
● Select sales officer.  
● Then select POS where the order was placed.  
● Finally modify the products and associated items and submit.  
Create Order  
In any case, if the SO is not able to create orders, sometime SO requests the the administrator to 
create a secondary sales order and the user can create order and to perform the same - 
● The admin will select SO, route and DSR.  
● Then the user needs to put SKU wise - 
○ Secondary sales quantity.  
○ No. of free products for DB which will be used for adjustment.  
○ Number of products in piece which will be offered as a free amount.  
● Number of memos.  
● Number of line items.  
Product Return Management  
In case of any defect products found, it needs to manage the steps to return the products.  
Return Eligibility Criteria  


=== PAGE 15 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
It needs to define the criteria, under which customers are eligible to return a product. The criteria 
will cover - 
● Damaged goods,  
● Defective products,  
● Dissatisfaction with the product.  
● The criteria will be managed using the master settings.  
Return Product  
To return the products, the distributor or the authorized user will do the followings - 
● Select the eligible criteria for which the products will be returned.  
● Set a time frame.  
● Maintain shipping and restocking costs which could be managed by the company or 
distributor. It needs to clearly define the return activities in the process..  
● Finally take out the products from the retailers.  
● The return process will be handled by the mobile application only.  
Return and Adjustment  
There are two types of adjustments for returning the delivered products.  
Product Adjustment  
● DB collects the products and returns to the depot or inventory from where they collect the 
products.  
● The responsible person updates the orders with the defect products.  
● Sometimes it may need to replace the products and that needs to be tracked to the system.  
● The higher authority will be notified about the returned products.  
● The distributor will replace the products at the shop or POS.  
● Then the distributor will send the defeated products to the factory using the following 
process - 
○ An approval will be raised using the system by targeting the relevant committee.  
○ When approval is finished, the audit team will visit the distribution point and verify.  
○ If everything is ok to proceed further, the distribution team from head office will 
collect the damaged products from the distribution point to the associated factory.  
○ The company will decide on  
■ Replacing the products or  
■ Provide equivalent money.  
Financial Adjustment  
This adjustment will only be maintained by the company. After receiving products by inventory or 
depot, the authority will notify the finance department for financial adjustment if required.  
● The finance department verifies the root causes of returning the products.  
● In an eligible case, the finance and accounting team decides to adjust the balances.  

=== PAGE 16 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● The shop owner or concerned person will be notified about the adjustment.  
● Finally, the accounting team deposits the designated amount to the concerned customer’s 
ledger account.  
● Sometimes, the company may ask the distribution point’s authority to sell the products 
and then adjust the money.  
User Movement  
SO movement represents how the SO travels from one outlet to another to make an order. The 
area heads or the authorized users can track these movements using the mobile application or 
website.  
Navigation  
The SO will travel from one POS to another and the system will track the movements on the 
following ways - 
● The system collects longitude and latitude of the users.  
● The user opens the application.  
● The system shows all the assigned SOs’ positions on the screen.  
● Find out the position of the user and it needs to show on the screen.  
● When the SO moves to another POS, based on lat/lon, the system renders the graphical 
movement line.  
● The user can see the position on the iOS or Android application’s screen.  
Using Website  
Some devices, such as smartphones and laptops, have built -in GPS (Global Positioning System) 
capabilities. The process is as follows - 
● Websites can request permission to access the device's GPS data through the browser's 
Geolocation API. With the user's consent,  
● The website can retrieve accurate location information, including latitude and longitude 
coordinates.  
● The website stores this information to the system randomly.  
● The authorized user can track the users using the changed latitude and longitude in a 
map.  
 

=== PAGE 17 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
 
Figure: User movement to place an order  
TMR/Month Closing Process  
TMR means this month's report. Here this month means the previous month whose sales report 
is not closed yet. TMR closing is performed to freeze the sales of the selected month and after 
closing, opening balance of the next month can be calculated. General ly, After closing TMR, no 
modification is allowed. i..e sales record of the closed month cannot be modified.  
Closing Operation  
To manipulate TMR data, it needs proper permission and then the authorized user can manipulate 
the data on the following contexts - 


=== PAGE 18 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● It needs to select a product category.  
● Opening quantity of the target month.  
● Product SKU  
● Total received amount.  
● Total free quantity by SKU.  
● Adjustment of the received product which is not updated before but now needs to adjust.  
● To adjust the free amount which is received free but was not updated in stock on the target 
month.  
● Free items will not be calculated in total sold items quantity.  
● Sold items on the target month.  
● Free items which are offered during selling items by the SO also need to track. Those free 
items will be offered by the company first.  
● TMR of the current month can not be performed.  
● TMR closed data can be deleted by  
○ Nation wide.  
○ By zone or division.  
○ By region  
○ By area  
○ By the selected distributor.  
● The authorized user can modify the TMR sales data if required.  
● TMR will be applicable only for DB’s sales.  
Closing Area  
By Region or Zone  
The system will not allow the user to close the sales report of the current month.  
● The TMR can be closed by  
○ Nation wide.  
○ By zone or division.  
○ By region  
○ By area  
By Selected Distributor  
The operation can be accomplished by the selected distributor.  
 
Audit & Survey  
A survey is a method of collecting data from a group of individuals to gather information, opinions, 
or feedback on a particular topic. In the pusti application, there are different types of surveys on 
products, prices of different products items etc.  

=== PAGE 19 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Product Survey  
Product survey means the same on different products from different competitors. To accomplish 
the survey by the survey team, the user needs to do the followings - 
● At the very beginning, it needs to select the area on a specific date.  
● According to the selected area, all the routes will be retrieved.  
● Then the user selects a specific route followed by a POS.  
● The survey form will be populated with all the competitors' names for each and every 
individual SKUs.  
● It needs to put available products’ SKUs for all the competitors.  
● This survey needs to be conducted by POS located in the selected route.  
Price Survey  
It means price comparison of the products w.r.t the competitors. The process is - 
● At the very beginning, it needs to select the area on a specific date.  
● According to the selected area, all the routes will be retrieved.  
● Then the user selects a specific route followed by a route.  
● The survey form will be populated with all the competitors' names for each and every 
individual SKUs.  
● The user will put prices of all the competitors.  
Delivery Memo Audit  
The delivery memo survey will also be conducted according to the selected POS. The information 
needs to cover is - 
● Price of the selected products in T.K Group.  
● Outlet wise category coverage audit. I.e outlet category wise audit needs to be performed 
using the followings  
○ Product category which generally sold from the outlet.  
○ Competitors’ category present on the same outlet and their comparison with Pusti.  
○ Is the product or not at the outlet.  
● The coverage summary of the route for all the outlets.  
● Duration based category coverage.  
● Coverage comparison and deciding whether growth comes or not.  
● Date range based summary and outlet coverage.  
● From the coverage audit, decide whether SR visits the outlets or not. It needs to put 
remarks on the coverage and SO visiting status. The remarks will be outlet based.  
● Category wise coverage ratio for the whole area.  

=== PAGE 20 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Distributor Audit  
Stock Survey  
It needs to conduct audits for all the products which are physically available in the distribution 
point. The process is - 
● On a specific date, it needs to select the dealer or distributor.  
● The user needs to put a number of available products in the distribution point and available 
products in the system.  
● Product wise quantity needs to be put.  
Document Availability  
It needs to check the available documents for the selected dealer or distributor. The documents 
available at the distribution point that need to cover is - 
● ROI 
● Attendance sheet  
● Route chart  
● Sales and stock register.  
 
The document needs to be managed by the master settings.This is boolean data that needs to 
be maintained in the system.  
Logistic Support  
It needs to perform audits on different logistic supports and the items are dynamic which needs 
to be managed from the master settings. The support items could be - 
● Numeric where the user needs to put a numeric value.  
● Boolean which represents Yes or No.  
● Available or unavailable.  
● The audited data would be collected as per the selected date.  
 
Some sample items are - 
● Smart phone: This item is available or not and that can be managed by radio button.  
● Laptop  
● Printer  
● Allocated number of sales officers which is numeric value.  
● Is the stock space sufficient or not and that can be managed by boolean value.  
● Number of drivers who work to support etc.  
Product Complains  
It needs to record the complaints for all the products for the selected dealer or distributor. The 
process that needs to follow - 
● Track product or SKU -wise  

=== PAGE 21 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Damaged items  
○ Expired items  
○ Other issues.  
● It needs to be tracked by the date of the selected distributor with proper comments or 
remarks.  
Investment Status  
According to the selected distributor, on the selected date it needs to perform audits on the 
following - 
● Investment amount of money for floor stock.  
● Undelivered quantity of products.  
● Payment in transit that needs to be paid or which would be received. Like - money available 
in cash, available in banks, market credit, etc.  
● The status data needs to be managed from the master settings.  
Sales Officer Activity  
There are different activity -centric surveys that are required for the sales officer (SO). The 
activities are dynamic and it needs to be managed from the master settings. Sample audit data 
could be - 
● Maintain proper dress codes or not by the sales officer.  
● Attitude is positive or negative.  
● Engaged or not engaged with physical violence.  
● Is there any loyalty or not?  
● Is the relationship maintained or not?  
● Professionally equipped or not? etc.  
Stock Management  
Stock means the number of products available in the system. Due to various reasons it may 
need to perform different operations on stock.  
 
Stock Transfer  
If the distributor decided not to continue business or any other reason, if there is needed to 
transfer the stocks, the authorized user will perform - 
● Select the distributor whose products need to transfer.  
● The receiving DB needs to select.  
● Transfer schedule or date on which the product will be transferred.  
● Reasons for transfer.  
● The transfer could be as per the selected SKU or simply transfer a single product item or 
all at the same time.  

=== PAGE 22 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
TMR Transfer  
To transfer TMR from one DB to another, it needs to do the followings - 
● The authorized user selects DB whose TMR will be transferred.  
● Then target DB who will hold the transferred TMR.  
● Finally, the user transfers the TMR.  
Transfer Sales  
To transfer sales from one SO to another, it needs to do the followings - 
● The authorized user selects SO whose sales will be transferred.  
● Then target SO who will hold the transferred sales order.  
● Finally, the user transfers the sales orders of the selected SO.  
● Full month or partial transfer  
Modify Sales  
The authorized user can modify the existing sales on the following ways - 
● Selects the SO whose sales will be modified.  
● Then it needs to select the date interval from which sales will be selected and then 
modify.  
● Finally, submit the changed data.  
Transfer Target  
To transfer sales target from one SO to another, it needs to do the followings - 
● The authorized user selects SO whose sales target will be transferred.  
● Then target SO who will hold the transferred sales target.  
● Finally, the user transfers the targets of the selected SO.  
Target New SKU  
Sometimes, if a new SKU is reached then the user may change the target which is already 
running. To perform it,  
● Select product item or SKU which will be added to the targets.  
● Then adds the SKU to all the targets.  
Attendance  
The attendance system deals with the attendance of the employees. The following roles will work 
with the attendance module to manage the attendance of their subordinates.  
a) SO 
b) ASM  
c) RSM  

=== PAGE 23 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
d) Zonal or divisional head.  
e) Administrator who will handle all the employees of the head office.  
In order to perform the operations, the authorized user logins to the system first and manage the 
attendance on the following ways - 
● Moves to the associated screen.  
● Selects the employee for whom the attendance will be accomplished.  
● The system allows the attendance on the current date only.  
● The status of the attendance could be - 
○ P: Present  
○ A: Absent  
○ L: Leave  
○ R: Region  
Payroll  
Salary  
HR will generate the payroll of the employees and to perform it, it needs to consider the followings - 
● Maximum number of allowed leave days up to the month for which payroll is generated.  
● Allowed a number of late presents. This is 3 days per month at most.  
● The salary will cover up basic and all kinds of allowances.  
Allowance  
There are different types of allowance and the authorized user will manage it for each and every 
individual employee. At the end of the month, all the allowances will be calculated.  
● Permanent journey plan (PJP) needs to be shared in advance before starting the month.  
● Detail level traveling will be shared for both 1st half (9:00 am ~12:00 pm) and 2nd half 
(2:00 pm ~7:00 pm) in order of - 
○ DB name  
○ Market  
○ Serial number.  
● This can be accessed by all the stakeholders up to head office.  
● The plan should be traversed through an approval process to be approved before 
execution.  
● There needs to be a revised journey plan facility which will be treated as an actual journey 
plan.  
● Total journey with details needs to be tracked in the system for all the roles who travels 
for official purposes. The following information needs to store - 
○ Date of travels.  
○ From  
○ To 

=== PAGE 24 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Mode of transportation.  
○ Amount of money.  
○ Purpose.  
● The system allows the user to add multiple items at a time.  
● At the end of the month, totals will be calculated automatically.  
● The travel data can be cross -checked by using Google maps data.  
● The allowance could for the followings - 
○ Categories of Visit (Base/Ex -Base/Night Stay)  
○ TA 
○ DA 
○ Entertainment.  
○ Hotel allowance  
○ Fuel.  
○ Others  
● The allowance also required for SO (National) for the followings - 
○ Zone  
○ Region  
○ Area  
○ SO ID  
○ SO Name  
○ DB ID  
○ DB Name  
○ Total Days of Month  
○ W/D 
○ Leave  
○ Absent  
○ LWP  
○ Total Days of Payment  
○ Approved TA/DA  
○ Total Amount  
○ Miscellaneous Expense  
○ Payable Amount  
User Feedback  
The end user may send different types of feedback and the authority may take decisions on this. 
The feedback could be on the following contexts - 
● About the product quality.  
● Policies  
● Communication  
● Delivery services  
● Sales related things etc.  

=== PAGE 25 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
The authorized users will review the feedback and make new plans based on demand.  
Reports  
There are many reports related to secondary sales. There are different roles and some of the 
roles can access the report partially. Sometimes the same report is applicable for different 
stakeholders with limited data and that needs to be covered.   
Dashboard  
Immediately after login, the user will move to the dashboard screen and the number of accessible 
features varies from role to role and it depends on privileges assigned to each and every individual 
user. The administrative user can access all the reports o f all the stakeholders.  
Current status  
The status represents current progress of the overall activities of the system users on the 
current date which will cover - 
● Sales TP.  
● Order TP.  
● Number of visited - 
○ Routes  
○ POS  
○ Ordered outlets or POS.  
● Number of active manpower in total in the system - 
○ Zonal head.  
○ Regional head  
○ Area head  
○ Distributor  
○ Sales officer (SO)  
○ Distribution sales representatives (DSR).  
● The number of SKUs which are active till today.  
● Total number of active POSs.  
● Number of active routes.  
Secondary Sales  
This section deals with the followings for administrator - 
● Time passes or up to date% of the current month.  
● Graphical illustration of the last three months where a bar chart will show month wise total 
secondary sales in terms of total amount of money.  
● A tabular representation of secondary sales target which will cover - 
○ Target DP which is planned to be sold.  

=== PAGE 26 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Sales DP which is already achieved.  
○ Achievement percentage.  
○ Distributor’s sales gift quantity.  
○ Damage percentage (MT).  
●  Tabular representation of secondary sales status by category on the current month in 
terms of the followings - 
○  Category name.  
○ Target DP which is planned.  
○ Sales DP that is already sold.  
○ Achievement percentage.  
Primary Sales  
Tabular representation of the primary sales in terms of the followings - 
○ Target DP of the month.  
○ Sales DP  
○ Achievement percentage.  
Collection  
There are role specific collections and the following information need to show - 
● Target total.  
● Total month collection.  
● Achievement percentage.  
● Time pass percentage.  
Distribution Stock  
Category wise distribution stock of the current month using the following information that needs 
to show in tabular format.  
● Category name.  
● Stock in pieces.  
● Stock in MT  
● Damage stock in MT.  
● Sample report is as below - 
https://docs.google.com/spreadsheets/d/1I0ZsIL8cZW5snoNalSpQ62GvPKkKtDA6/edit#
gid=1327387681  
Sales Dashboard  
The administrative user needs to provide the access of the sales and live dashboard as well.  
● Sales dashboard which will cover the followings - 
○ Secondary sales amount by date range.  
○ The report can be filter by  
■ Zones  

=== PAGE 27 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
■ Regions  
■ Areas  
■ SO 
■ DB 
○ Collections  
○ Primary sales.  
○ Sales order  
○ The sales summary can be filtered by DP or TP.  
○ The upper management can view all of the subordinates’ data.  
Live Dashboard  
Live dashboard shows the followings by date range  
● Secondary sales amount of money.  
● Distribution collection  
● Received product by the distributor.  
● This is the voucher entry statistics.  
● By default, the data will be for the current date but the user can check the data by date 
range as well.  
● The upper management can view all of the subordinates’ data.  
App Link  
App link allows the user to the dashboard of the mobile application. The dashboard will show the 
following information on different sections of the application.  
Target  
There are daily and monthly targets of the secondary sales.  
Target of the Day  
● Target sales amount of taka.  
● Already sold amount of the day.  
Monthly target  
● Target of the month of sales in taka.  
● Already sold money of the day.  
Today KPI  
The admin can view cumulative SO data on the followings - 
● Target POS  
● Visited POS  
● Visited outlet percentage w.r.t the target.  

=== PAGE 28 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Total number of memos.  
● Strike rate in percentage (S/R).  
● Total number of lines or SKU.  
● LPC 
● CCP  
● Total number of lines.  
● Total DB  
● Total number of SOs.  
● SO on duty  
● Sales order placed via the mobile application.  
● SO on leave.  
● Number of SO who already resigned.  
● The number of SO who are absent today.  
KPI By Route  
To find out the KPI by route, the administrative user will do the followings - 
● The user will select from and to date on which the KPI will be retrieved.  
● Then the user selects areas followed by the distributor.  
● Finally, the user will generate the KPI reports for all the sales officer (SO) using the 
following information  
○ Area  
○ Distributor  
○ SO 
○ Route name.  
○ Number of outlets.  
○ Number of memos.  
○ Productive call percentage  
■ (Memo/visited outlet) X 100.  
○ Number of visited outlets.  
○ Number of non visited outlets.  
○ Total working hours tracked via the mobile application.  
○ The amount of money ordered comes from different orders.  
● Time pass or sales update percentage of the selected route.  
Monthly KPI  
In order to generate the monthly KPI, the authorized users will do the followings - 
● The user selects the target month.  
● Then generate KPI reports and the system will show the reports using the following 
information - 
○ Total sales target in TP.  
○ Total sales amount of money in TP.  

=== PAGE 29 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Achievement percentage.  
○ Target of productive call (PC).  
○ Achieved productive call.  
○ LPC target.  
○ Total number of lines sold.  
○ Targeted number of products that will be sold.  
○ Number of products that are already sold.  
○ Achievement percentage.  
● Time pass percentage.  
● The monthly KPI reports can be filtered by the selected month and date range.  
Time Pass Report  
The admin or authorized user can generate the time pass reports by category.  
● The reports will cover the following information - 
○ Category name.  
○ Target amount of TP.  
○ Sold amount of TP.  
○ Achievement percentage.  
● The average calculated data will also be reflected in the report.  
● The report can be filtered by the selected date.  
● The reports need to be generated in both CTN and in MT.  
Order Summary  
The SO can review the summarized order data on the following contexts - 
● Product information in terms of - 
○ Category.  
○ SKU 
○ Number of memos.  
○ Number of SKUs already ordered.  
○ Ordered amount of TP of the selected date interval.  
● The orders can be checked by date range.  
● At the end of the report, the summation needs to show the amount of related attributes.  
● The system allows the user to download PDF data.  
Delivery Summary  
The SO can check the delivery summary using the following information - 
● Product category.  
● SKU 
● Delivered quantity.  
● Delivered amount of money in TP.  
● The delivered products can be filtered by the selected dates.  

=== PAGE 30 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● The reports need to be generated in both CTN and in MT.  
Damage Summary  
The SO can check the damage summary using the following information - 
● Product category.  
● SKU 
● Delivered quantity.  
● Delivered amount of money in TP.  
● The delivered products can be filtered by the selected dates.  
● The reports need to be generated in both CTN and in MT.  
● The reports need to be generated in DP as well.  
POS Information (Search Outlet)  
To display the POS information, the admin or the authorized user will do the followings - 
● The user puts the search criteria.  
● Then the user submits to search the available POS.  
● The system displays the outlet or POS information using the following information - 
○ Outlet number, name.  
○ Address details.  
○ Owner information.  
○ Status.  
○ Operation date.  
○ Market size etc.  
Order vs. Execution  
This report means order vs. execution and the information needs to cover is - 
● Category  
● Target in TP for SR and DP for distributor.  
● Till date order.  
● Order achievement percentage = (Till date order/monthly target).  
● Till date IMS = Total amount of secondary sales by category.  
● Execution percentage = (Till date IMS/Till date order) X 100  
● Monthly IMS = (Till date IMS/Monthly target) X 100  
● Weight percentage which is a fixed value and needs to be put during creating the product 
category. Here the weight indicates the emphasizing criteria decided by the number of 
sales.  
● Weighted average achievement = (Monthly achievement percentage  X Weight 
percentage) . But it needs to not exceed the weight percentage. If exceeded, weight 
percentage will be used.  

=== PAGE 31 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Yesterday ordered an amount of money. Here yesterday means the previous day whose 
products were already delivered. Like - if today is 21st November, the order represents the 
order on 19th November and delivered on 20th November.  
● Today IMS which represents TP of the day(IMS).  
● Execution percentage = IMS/ Last day order in TP.  
● The order target in TP of today = (Target of the month - till date IMS) / Number of remaining 
days of the selected month.  
● Today's order achievement (Live data).  
● Today’s order achievement percentage.  
● Along with TP, the same reports will be generated for CTN and MT.  
● In case of distributor login, the report will be generated using DP.  
● The higher management can filter the reports for all the subordinates and stakeholders.  
Web Portal  
The authorized user can access the web portal using the available menu option in the mobile 
application. The system shows - 
● Web application in responsive mode.  
● The user logins to the application and performs the role specific operations based on 
demand.  
● The user will be logged in automatically.  
Manual Order & Delivery Summary  
This section deals with the reports whose data come from the SR section.  
Orders by Route  
● This report deals with the different orders placed by SO.  
● The major information that will be covered is - 
○ Division  
○ Region  
○ Zone name  
○ Distributor name.  
○ Route name.  
○ Number of routes visited.  
○ Scheduled outlet.  
○ Average visited outlet.  
○ Average order memos.  
○ Average number of failed orders.  
○ Average number of non visited outlets.  
○ PC (%)/Visit (Order)  
○ Average number of line order/Visit  
○ Avg. Cat. Order/Visit  

=== PAGE 32 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Avg. LPC/Visit [Ordered]  
○ Avg. CCP/Visit [Ordered]  
○ Sales Order (TP)  
○ Avg. SalesOrder (TP)  
○ Sales Order (DP)  
○ Avg. SalesOrder (DP)  
● The reports can be generated by the selected date interval.  
● This could be for all the SO or by the selected sales officer.  
● The system allows the user to download.  
● In the mobile application, the data will be in limited view.  
● In the web application, the limited number of columns will be shown and then after clicking 
on the view button, details will be shown.  
● The report can be for a single day or interval based.  
Delivery By Route  
This is the delivery reports conducted by distribution sales representatives according to the order 
created by the sales officer during their outlet visits.  
 
● The major information that will be covered is - 
○ The name of the division.  
○ Region name of the selected division.  
○ Zone name  
○ Distributor name.  
○ Route name.  
○ Revenue in DP.  
○ Revenue in TP.  
○ Delivered  
■ Memos  
■ Lines  
■ Category names.  
■ CCP  
■ LPC 
● The reports can be generated by the selected date interval.  
● This could be for all the SO or by the selected sales officer.  
● The system allows the user to download.  
● In the mobile application, the data will be in limited view.  
● In the web application, the limited number of columns will be shown and then after clicking on 
the view button, details will be shown.  
Order by SKU  
During placing the order, there were many SKUs which were planned and delivered.  
● The reports will be for all the sales officers or by a selected sales officer.  

=== PAGE 33 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Reports can be filtered by the selected date range.  
● The major information which will be covered in the reports are - 
○ Division   
○ Region   
○ Zone   
○ Route   
○ Category Name   
○ Product Id   
○ Sku Name   
○ Order Qty   
○ Revenue[DP]   
○ Revenue[TP]   
○ SO  
○ SO Mobile  
● The reports can be downloaded in excel or PDF format.  
 
Delivery by SKU  
This is the reports generated for the delivered product items.  
● The reports can be filtered by - 
○ SO 
○ Date interval  
● Major information which will be covered are - 
○ Route   
○ Category Name   
○ Product Id   
○ Sku Name   
○ Order Qty   
○ Revenue[DP]   
○ Revenue[TP]   
○ SO 
● The reports can be downloaded in excel.  
Daily Order Summary  
This is the summarized order information for each and every individual day.  
● The report can be filtered by the sales officer or date range.  
● The information covered are - 
○ Division   
○ Region   
○ Zone   
○ DB Name   
○ SO/SR ID   
○ SO/SR Name   

=== PAGE 34 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Route   
○ No. of Visits/Route   
○ Schedule Outlet visited  
○ Outlet  Order Memo   
○ Fail to make Ord.  
○ Outlet number visit Outlet   
○ PC (%)/Visit (Order)   
○ Line Order/Visit   
○ Cat. Order/Visit   
○ LPC/Visit [Ordered]   
○ CCP/Visit [Ordered]   
○ Sales Order (TP)   
○ Sales Order (DP)  
● The reports can be downloaded in excel format.  
Productivity Report  
The productivity report indicates the sales officer as per their visits on the routes and then 
outlets.  
● The reports will be selected date based or all the dates.  
● The information that will be covered in the report is as follows - 
○ Division   
○ Region   
○ Zone   
○ DB Name   
○ SO/SR ID   
○ SO/SR Name   
○ Route   
○ No. of Visits/Route   
○ Schedule Outlet  Visited  
○ Outlet  Order Memo   
○ Fail to make Ord.  
○ Outlet number visit Outlet   
○ PC (%)/Visit (Order)   
○ Line Order/Visit   
○ Cat. Order/Visit   
○ LPC/Visit [Ordered]   
○ CCP/Visit [Ordered]   
○ Sales Order (TP)   
○ Sales Order (DP)  
● The reports can be downloaded in excel format.  

=== PAGE 35 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Outlet Visit Status  
The visit status means whether the SO visits the outlet or not. The report covers - 
● The report can be filtered by region, zone, areas and routes.  
● Interval based reports can be generated.  
●  
● The information covered in the report is as below - 
○ Division   
○ Region   
○ Zone   
○ Distributor   
○ SO Name   
○ Route   
○ Outlet  
○ Order Status  
● Unvisited outlets can also be reported using the system.  
Commission Report  
SD Commission  
The information needs to cover is as below - 
● DB Code     
● Division     
● Region     
● Zone      
● DB Code     
● Super Distributor's name      
● Lifting Tea,A.Rice & Mustard Oil (In TK.)    "Commission (%)"     
● "Payable Commission (In Taka)"     
● "Lifting Others All Products (Except -Mustard oil,A.Rice & Tea) (In TK.)  
● "Commission (%)"     
● "Payable Commission (In Taka)"     
● "Total Lifting (In TK.)"     
● "Total Payable Commission Amount(In TK.)"     
● Remarks  
● The report could be based on the followings - 
○ By product  
○ In taka  
○ In percentage  
● It will be settings based on which the commission will be applicable - category, product 
etc. 

=== PAGE 36 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Sales Commission  
● Division     
● Region     
● Zone Name     
● Distributor's Name     
● EmployeeID     
● Employee Name     
● Designation     
● Joining Date     
● Contribution %     
● Lifting Tea & Mustard Oil (In TK.)     
● Lifting in Lac     
● Approved Commission  per  lac     
● "Commission for Tea & Mustard Oil  (In Taka)"     
● "Lifting of All Products Other Than Mustard Oil & Tea (In TK.)"     
● Lifting in Lac     
● Approved Commission  per lac     
● "Commission  (In Taka)  
● All Products other than Mustard oil & Tea"     
● Total Lifting  (In TK.)     
● "Total Net Payable Commission Amount (In TK.)  
● Remarks  
● It will be settings based on which the commission will be applicable - category, product 
etc. 
 
CD Commission  
The covered data is as below - 
● DB Code     
● Division     
● Region     
● Zone      
● DB Code     
● Super Distributor's name      
● Lifting Tea,A.Rice & Mustard Oil (In TK.)    "Commission (%)"     
● "Payable Commission (In Taka)"     
● "Lifting Others All Products (Except -Mustard oil,A.Rice & Tea) (In TK.)  
● "Commission (%)"     
● "Payable Commission (In Taka)"     
● "Total Lifting (In TK.)"     
● "Total Payable Commission Amount(In TK.)"     

=== PAGE 37 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Remarks  
● The report could be based on the followings - 
○ By product  
○ In taka  
○ In percentage  
● It will be settings based on which the commission will be applicable - category, product 
etc. 
Sales Order  
Order List  
The order list created by the sales officer can be generated on the following ways - 
● The list of orders by route.  
● Orders can be filtered by the date range .  
● Orders of the day can be visualized.  
● The reports can be customized in terms of number of columns that need to show on the 
screen.  
● The report can be downloaded in csv  format.  
● The reports can be generated by SO or SR.  
● Route wise orders can be generated and downloaded.  
● DB and category wise order reports.  
● Region wise reports.  
● Status based order reports in order of - 
○ Fully delivered.  
○ Partially delivered.  
○ Undelivered fully.  
● Last four weeks’ sales by - 
○ SO 
○ DB 
○ Area  
○ Route  
○ Region  
○ Zone  
● The list of the outlets which haven’t made orders in the selected month with reasons.  
● Outlet wise SKU and category report for the orders.  
SO Schedule  
The schedules of the SO can be downloaded for all the days of the week individually. Like - 
● Sat 
● Sun 
● Mon 

=== PAGE 38 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Tue 
● Wed 
● Thu 
● Fri 
Order View and Memo  
● This is the summary report using the following information - 
○ Zone Name     
○ Area Name     
○ DB Name    Route Name     
○ SR Name     
○ Outlet Name     
○ Sales Order Amount -T 
● The report can be filtered by  
○ Route  
○ Keyword  
○ By Date  
● The summary can be generated using the followings - 
○ Category    SKU ID     
○ SKU Name     
○ Pcs Per CTN     
○ Unit     
○ Order Qty    Order Qty - CTN     
○ Order Amount - TP     
○ Order Amount - TP 
○ [After Discount]     
○ Return Order Qty - Pcs     
○ Free Qty  - Pcs     
○ Total Qty - Pcs     
○ Total Qty  
○ [CTN & Pcs]  
Summary by SKU  
The order summary can be SKU based on a specific date or on the selected date interval.  
● The order can be filtered by region, area, zone, route, outlet or POS etc.  
● The raw data for the orders can be downloaded.  
● Can be filtered by dates.  
Sales Order Summary and SKU Wise Report  
● The report can be generated by cattery, outlet, region, area, zone.  
● Interval based for a specific date.  

=== PAGE 39 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● The information needs to cover is - 
○ Zone Name     
○ Region Name     
○ Area Name     
○ DB ID     
○ DB Name    SO ID     
○ SO Name    Route Name     
○ Outlet ID    Outlet Name     
○ Key Outlet     
○ Outlet Type     
○ Frequency     
○ ORG     
○ No of SKU Ordered    Memo Qty Ordered - Pcs     
○ Memo Qty Delivered - Pcs     
○ Order in Pcs     
○ Order in Ltr/KG     
○ Order in CTN     
○ Order in MT.     
○ Delivery in Pcs     
○ Delivery in Ltr/KG     
○ Delivery in CTN     
○ Delivery in MT.     
○ Drop Size Amount -TP [Delivery]     
○ Sales Order Amount -TP     
○ Delivery Qty     
○ Delivery Amount -TP    Bounce /Variance %  
● Sales summary report by - 
○ Quantity vs. category.  
○ Quantity vs. brand  
○ Quantity vs. source category.  
○ Quantity vs. SKUs  
○ Quantity vs. SKU details  
○ Date wise SKUs  
○ SKU details based report.  
○ Can be selected multiple options at a time.  
Raw Order Data  
● Outlet wise cumulative orders details by SKU.  
● Date interval based orders details by SKU  
● Sales officer wise  
○ Memos.  
○ Ordered quantity.  

=== PAGE 40 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Ordered values  
○ Date wise sales report.  
● Dales officer’s target by  
○ Outlet.  
○ Amount of money.  
○ Memo  
○ Search the targets by date range.  
● Category wise  
○ Memo report.  
○ Filter memos by dates.  
● Sales officer’s delivery information which could be filtered by dates.  
● Category coverage which could be filtered by date range.  
● Summarized sales order summary which could be filtered date range.  
Raw Data Sales/IMS  
This is the delivery report of the orders and this section deals with the raw data and the types of 
reports are - 
If Sales Type=1 Then its OTC Sales and if Sales type =0, then memo to memo sales/ims input.  
● Distributor and sales officer wise sales reports which could be filtered by dates.  
● SKU wise sales summary for the distributor.  
● Sales officer wise raw data based reporting for all the sales orders and that can be 
filtered by dates.  
● Raw data of the current stock of the distributor.  
Outlet Reports  
● POS or outlet information in detail.  
● Route wise outlet quantity.  
● Zone wise - 
○ Outlet wise actual order report which can be filtered by - 
■ Date  
■ Category..  
○ Outlet wise delivery report which can be filtered by  
■ Date  
■ Category  
■ SKU 
Promotional  
Sales promotional report using the followings - 
● Product  
● Category  
● Promotional details.  
● The report can be filtered by dates.  

=== PAGE 41 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● By routes  
Top SKUs  
Top SKU based order which will the following information - 
● Top 10 SKUs.  
● SKU details including price.  
● The report can be filtered by date range.  
● By routes, national, zone, region, area.  
SO Movement Report  
This is the report which illustrates the movement of the sales officer from POS to POS.  
● The report will be on the selected date or for a specific date interval.  
● Duration of visiting for each and every individual POS.  
● The major information that needs to cover is - 
○ Outlet name.  
○ SO information.  
○ Start and end time to visit the outlet.  
○ Duration to place an order.  
○ Location information of the outlet including - 
■ Division.  
■ Region  
■ Area  
■ Route  
● Excel download facility needs to include.  
● Route wise or all the route information of the selected day can be reflected in the report.  
● The outlet needs to show in Google map based on the lat/lon which was used to create 
a new outlet. Details of the outlet also need to show on the map screen.  
Sales Order Summary - Route Wise KPI  
● Reports can be generated for a date interval.  
● Can be filtered by - 
○ National  
○ Region  
○ Zone  
○ Route  
● Covered data is as below - 
○ one Name     
○ Region Name     
○ Area Name     
○ DB ID     
○ DB Name    SO ID     

=== PAGE 42 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ SO Name    Route ID     
○ Route Name     
○ Frequency     
○ Total Outlet (85 - 100)     
○ Total Visited Outlet    Actual Memo_(Asking 70)     
○ Call Productivity %    ACH. Against 70 Memo %     
○ TEA Memo_Asking 15     
○ TEA Sales_Asking 10KG     
○ TEA ACH. (Memo 15 & Sale 10KG) %     
○ Asking Total Memo Winning Status     
○ TEA Winning Status    LPPC     
○ Non Visited Outlet Qty     
○ Sales Order Amount -TP     
○ Delivery Amount -TP    Bounce /Variance %  
Sales Order Summary - SO Wise KPI  
● Reports can be generated for a date interval.  
● Can be filtered by - 
○ National  
○ Region  
○ Zone  
○ Route  
○ Absent SO  
○ SO category wise  
○ SO sales date wise  
● Covered data is below - 
○ Zone Name     
○ Region Name     
○ Area Name     
○ DB ID     
○ DB Name    SO/SR ID     
○ SO/SR Name     
○ Frequency     
○ Schedule Outlet     
○ Visited Outlet     
○ Ordered Outlet     
○ Non Visited Outlet     
○ PC % [Ordered]     
○ LPC [Ordered]     
○ Sales Order Amount -TP     
○ Delivered Amount -TP     
○ Delivered Outlet     

=== PAGE 43 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ PC % [Delivered]     
○ LPC [Delivered]     
○ Bounce /Variance %     
○ Line/ Category     
○ Memo     
○ CCP     
○ Working Time Duration (Hour)  
 
Sales Order Summary - DB Category Wise KPI  
● Reports can be generated for a date interval.  
● Can be filtered by - 
○ National  
○ Region  
○ Zone  
○ Route  
○ Absent SO  
○ SO category wise  
○ SO sales date wise  
○ By keyword  
● Covered data is as below - 
○ Zone Name     
○ Region Name     
○ Area Name     
○ DB ID     
○ DB Name     
○ Category Name     
○ Outlet Qty    PC     
○ PC %     
○ Sales Order Amount -TP     
○ Delivery Amount -TP     
○ Bounce /Variance %  
Sales Order Summary - Region Wise KPI  
● Reports can be generated for a date interval.  
● Can be filtered by - 
○ National  
○ Region  
○ Zone  
○ Route  
○ By keyword  

=== PAGE 44 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Covered data is as below - 
○ Zone Name     
○ Region Name     
○ Frequency     
○ Schedule Outlet     
○ Visited Outlet     
○ Ordered Outlet     
○ Non Visited Outlet     
○ PC % [Ordered]     
○ LPC [Ordered]     
○ Sales Order Amount -TP     
○ Delivered Amount -TP     
○ Delivered Outlet     
○ PC % [Delivered]     
○ LPC [Delivered]     
○ Bounce /Variance %  
Sales Order Summary - Area Wise KPI  
● Reports can be generated for a date interval.  
● Can be filtered by - 
○ National  
○ Region  
○ Zone  
○ Route  
○ By keyword  
● Covered data is as below - 
○ Zone Name     
○ Region Name     
○ Area Name     
○ Frequency     
○ Schedule Outlet     
○ Visited Outlet     
○ Ordered Outlet     
○ Non Visited Outlet     
○ PC % [Ordered]     
○ LPC [Ordered]     
○ Sales Order Amount -TP     
○ Delivered Amount -TP     
○ Delivered Outlet     
○ PC % [Delivered]     
○ LPC [Delivered]     
○ Bounce /Variance %  

=== PAGE 45 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Delivery Status Report  
● Interval based report.  
● This status based delivery report using the followings - 
○ Order Date     
○ Route Name     
○ SR Name    Outlet ID     
○ Outlet Name     
○ Sales Org    Order Qty    Order Qty - Free     
○ Sales Order Amount -TP     
○ Delivery Qty     
○ Delivery Qty - Free     
○ Delivery Amount -TP    Bounce /Variance %     
○ Delivery Date     
○ Process Duration (Days)  
● Can be filtered by  
○ Pending  
○ Hold 
○ Delivered  
○ By Date  
○ Route  
○ All status based reports.  
Reason Summary  
● Interval based reason summary for no sales order.  
● Information covered is as below - 
○ Zone     
○ Region     
○ Area     
○ Distributor     
○ Route ID     
○ Route Name     
○ Reason     
○ Outlet Qty   
● Can be filtered  
○ by dates.  
○ Region  
○ Zone  
○ Route  
 

=== PAGE 46 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Outlet Wise SKU Category Order  
● Date wise report generation.  
● Can be filtered by  
○ Selected date  
○ Region  
○ National  
○ Area  
○ DB 
● Information covered is as below -  
○ Zone Name     
○ Region Name     
○ Area Name     
○ DB ID     
○ DB Name  
○ Outlet ID     
○ Outlet Name     
○ Category ID     
○ Category Name     
○ Assumption Market Size - CTN     
○ Actual Order - CTN 
 
 
MIS Report  
Category Wise Update (Time Pass)  
● Secondary  sales reports on the selected date for - 
○ Division  
○ Region  
○ Zone  
○ Route  
○ Distributor  
○ Sales officer.  
○ AH 
● Interval based report.  
 
Regular Report  
● SR wise daily secondary sales report in terms of - 
○ Sales  
○ Productive call  

=== PAGE 47 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Line 
● Secondary sales summary for  
○ Sales  
○ Collection and  
○ Delivery  
● Category wise achievement ratio.  
● Category wise primary and secondary sales with achievement w.r.t time.  
● SKU wise monthly monthly contribution report for the followings - 
○ Category  
○ Brand  
● Target vs. sales summary for the selected month.  
● SKU wise daily sales summary for all the days on the selected interval or according to the 
selected date interval.  
● SKU wise distributor’s sales summary for all the days on the selected interval or according 
to the selected date interval.  
● SO sales summary by SKU which can be filtered by the selected date or on a date range.  
● SKU daily secondary sales reports in detail and can be filtered by date range.  
● Distributor wise stock report which can be filtered by dates.  
● Sales summary by SKUs.  
● Nationwide DB stock report which can be filtered by dates.  
● Distributor’s received item report which can be filtered by - 
○ Date  
○ Category.  
○ SKU 
○ By routes  
● Damaged products reports by  
○ Date,  
○ Category,  
○ DB 
○ By routes  
● Returned products reports by  
○ Date  
○ SKU 
○ Category  
○ DB 
○ By routes  
● Sales and collection summary by  
○ SO 
○ AH 
○ ZH 
○ All the stakeholders.  
○ By routes  

=== PAGE 48 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Daily Summary  (Do, Secondary and Delivery)  
This is the daily summary report which is required everyday. This report will be generated as per 
the category.  
● Report will be according to - 
○ National  
○ Zone  
○ Region  
○ Area  
● The report can be filtered by date.  
● The major information which needs to cover is - 
○ Target vs. Secondary  
■ Monthly target.  
■ Secondary sales in MT  
■ Achievement percentage as of till date (MTD)  
■ Till date targets which need to be covered.  
○ Secondary achievement  
■ Till date achievement in MT  
■ Time pass achievement percentage w.r.t passed time.  
■ Revenue achievement in lac  
■ Asking per day which needs to cover per day for the remaining days.  
■ Today’s secondary sales in MT  
■ Last day secondary order in MT.  
○ Delivery Achievement  
■ Delivery achievement in MT  
■ Achievement percentage as of till date (MTD)  
■ Revenue achievement in lac  
■ Asking per day which needs to cover per day for the remaining days.  
■ Today’s delivery sales in MT  
○ SO Achievement  
■ SO achievement in MT  
■ Achievement percentage as of till date (MTD)  
■ Revenue achievement in lac  
■ Asking per day which needs to cover per day for the remaining days.  
■ Today’s SO in MT  
○ DB Closing Stock in MT  
○ Undelivered in MT  
○ Revenue achievement in percentage  
■ Secondary percentage  
■ Delivery percentage and  
■ SO percentage  
○ Weighted percentage  
■ Weighted average percentage.  

=== PAGE 49 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Monthly Report (Day Wise)  
Monthly sales summary for  
● DB 
● SDB 
● SO 
● By SKU  
● Categorized by SKU  
● By route and category.  
● Can be filtered by dates, routes.  
 
● Daily sales and statistical reports using the followings - 
○ Sales for each and every individual day.i.e data for all the days of the selected 
month needs to be displayed.  
○ Can be filtered by - 
■ Zone  
■ Region  
■ Area  
■ Route  
■ By dates etc.  
● Monthly report on the followings - 
○ Date wise sales reports for all the distributors.  
○ Sales reports for sales officers which can be filtered by  
■ SKU 
■ Product category.  
○ Statistical reports on the followings - 
■ Area  
■ TSO 
■ Number of sales officers.  
■ Day wise orders.  
Statistical Reports  
Distribution  
The distribution report on the followings - 
● The report will be on the selected month.  
● Can be summarized and filtered by  
○ Zone  
○ Region  
○ Area  
○ Distributor.  
○ Sales officer  

=== PAGE 50 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Distributor Details  
This is the details of the distributors who worked for delivering the products to the customer.  
● The details can be generated by date interval.  
● Zone wise summary can be generated.  
● Can be filtered by  
○ Area  
○ Region  
○ Zone  
○ Route  
Distributor Wise Product  
This report will deal with the products delivered by the distributors.  
● Distributor wise order summary using the followings - 
○ Delivered orders’ summarized data.  
○ SKU information based report.  
○ Live data can be checked.  
○ Filtering facility by region, zone, area, route, by dates, voucher etc.  
○ Distribution status based report on  
■ Posted  
■ Not posted  
■ Canceled.  
● Account clearance for collection on  
○ Selected date or date range based.  
○ Can be generated by the selected bank.  
○ Live data can also be checked.  
○ Orders whose accounts are clear to proceed.  
○ The report will cover - 
■ Voucher number.  
■ Sales organization.  
■ Region  
■ Bank information  
■ Distributor name.  
■ Deposit amount  
■ Remarks.  
■ Contact mobile number etc.  
● Dashboard for the followings - 
○ Bank with the followings  
■ Name  
■ Contact person or person in charge who will work for the organization.  
■ Cleared accounts.  
■ Canceled orders.  
■ Disputed orders etc.  

=== PAGE 51 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
■ Can be filtered by dates.  
○ Region summary using the followings - 
■ Region name.  
■ Sales officer details.  
■ Account cleared.  
■ Canceled orders.  
■ Disputed accounts.  
○ Territory or are based report that will cover the followings - 
■ Region name.  
■ Area or territory name.  
■ Number of orders by the sales officer.  
■ Account cleared.  
■ Canceled orders.  
■ Disputed accounts.  
Outlet Information  
This report deals with the details for all the outlets or POS where orders are placed during visiting 
of the SOs.  
● The outlets can be filtered by - 
○ Division  
○ Region  
○ Zone or area/  
○ Route  
○ Creation date.  
○ By date interval.  
○ By keywords.  
● Can be checked nationwide.  
● Excel or CSV download.  
● Can be reported according to the paid amount.  
● Distributor wise outlets can be searched.  
● New outlets according to the settings for a certain duration.  
Voucher Summary  
This is the summarized reports according to the voucher.  
● Live data can be accessed.  
● Filter by date or date range.  
● The information in the report is as below - 
○ Number of sales orders.  
○ Distribution wise collection data.  
○ Received products by distributors.  

=== PAGE 52 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Trade Program  
● Can be generated by program details.  
● Excel or CSV download needs to perform.  
Distributor’s Claimed Report  
The report can be generated by - 
● Offer date range or from and to date.  
● Sales date range.  
Drive Product  
● Generate by the selected month.  
● Excel or CSV download needs to be covered.  
Competitor’s Information  
● Can be generated by the selected month.  
● By distributor or for all the distributors.  
● Excel or CSV download.  
Package or Gift Booking  
● The report can be generated for a specific date interval.  
Assessment & Tour  
● Date wise report for head office.  
● Assessment report for the restricted contents on the selected dates and interval based 
data.  
● User wise tour report for head office which can be selected by - 
○ Users.  
○ Date range.  
○ On a specific date.  
● Assessment report for the sales officer.  
● RSM assessment report on a specific date, by RSM.  
● Territory sales officer based report for a specific date, by sales officer etc.  
TMR Report  
Product Wise Rate In Year -Month  
● This is a product wise monthly report for a specific year.  
● The information covered is - 
○ Brand     
○ Product ID     

=== PAGE 53 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Product Name     
○ TP     
○ DP 
● Can be filtered by  
○ TP 
○ DP 
○ Product or category ID  
 
 
Negative Check  
● Secondary sales report for negative check in or stocks.  
● Major information is - 
○ Region     
○ Territory     
○ Dealer Name     
○ Category     
○ SKU     
○ Opening  
○ Receive  
○ Receive Adjust  
○ Adjust.  
○ Total Stock  
○ Second aries  
○ DB Adjust Sales  
○ Floor Stock  
○ Floor Stock [FREE]  
○ Pending  
○ Closing Stock  
● Report for a specific month in a year.  
National Report (Dealer wise details)  
This is a nationwide report for the selected dealers or distributors.  
● This is a specific month specific report for the selected year.  
● Can be filtered by - 
○ Region  
○ Area  
○ Route  
● Information covered is - 
○ Zone     
○ Region     

=== PAGE 54 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Area  
○ Distributor Name     
○ Group     
○ Category     
○ Product ID     
○ SKU     
○ Opening     
○ Receive     
○ Receive Adjust     
○ Adjust.     
○ Total Stock     
○ Second aries     
○ DB Gift Sales     
○ Floor Stock     
○ Pending     
○ Closing Stock     
○ Closing Stock - Blocked     
○ Closing Stock [FREE]  
● Can be filtered by  
○ DB 
○ Region  
○ Zone  
○ Area  
○ Months etc.  
National Report (SKU Wise Summary)  
● Nationwide SKU summary for the selected month.  
● The information covered is as below - 
○ Brand     
○ Product ID     
○ SKU     
○ Opening     
○ Receive     
○ Receive Adjust     
○ Adjust.     
○ Total Stock     
○ Second aries     
○ Floor Stock     
○ Pending     
○ Closing Stock  
● Can be filtered by  
○ Month  

=== PAGE 55 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Region  
○ Zone  
○ Area  
Within Two Month Sales Comparison & Growth  
● This is two months report in terms of - 
○ Start and end month.  
○ Quantity and value for the selected month.  
● % Growth (Qty)     
● % Growth (Value)  
● Can be filtered by - 
○ Zone  
○ Category  
○ SKU 
○ Territory  
● SKU year to year.  
Year to Year Sales Comparison - Total Value  
● The report can be generated for  
○ From and to year.  
○ Nationwide  
○ SKU wise  
● Information covered for the followings - 
○ January     
○ February     
○ March     
○ April     
○ May     
○ June     
○ July     
○ August     
○ September     
○ October     
○ November     
○ December     
○ Total  
6 Month SKU Sales  
● This is the SKU based nationwide, regional, zonal, route based sales report.  
● Last 6 months report started today.  
● Information covered is - 

=== PAGE 56 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Product  
○ Category  
○ SKU  
○ Data for each and every individual month for the 6 months.  
● Can be generated for the selected - 
○ Division individually or for all.  
○ Region individually or for all.  
○ Zone individually or for all.  
○ Route individually or for all.  
Target vs. Achievement  
Target Details  
● Sales officer wise target details.  
● SKU details need to be covered in the report.  
● Can be filtered by area, zone, region, route.  
● Excel or CSV download.  
● The report will be on TP or DP.  
● Major information covered is - 
○ Zone     
○ Area  
○ Distributor Name  
○ SR/SO Name  
○ SR Status    Category     
○ SKU 
○ Qty 
○ Amount (TP)  
Area Based Target Details  
● Area based target details including SKUs.  
● Both TP and DP based filtering.  
● Major information covered is - 
○ Zone     
○ Area     
○ Category     
○ SKU     
○ Qty     
○ Amount (TP)  
 

=== PAGE 57 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Target Summary & Achievement  
● Sales officer wise report.  
● Can be for the selected sales officer or all the sales officer based reports.  
● Filter by area, region, zone.  
● Major covered data is as below - 
○ Zone     
○ Area     
○ Distributor Name  
○ SR/SO Name  
○ SR Status     
○ Target Amount (EDP)  
○ Target Amount (ETP)     
○ Sales Amount (EDP)     
○ Sales Amount (ETP)     
○ Target PC     
○ Target TLS     
○ LPC Target     
○ CLPC     
○ LPC Achi %     
○ Target PC     
○ CPC     
○ PC Achi %  
Target Summary By Distributor  
● Target summary report for all the distributors or according to the selected distributors.  
● Report for a specific month of the selected year.  
● Information covered is - 
○ Zone     
○ Area     
○ Distributor Name  
○ Amount -EDP 
 
SKU Wise Target vs Achievement  
● Distributor wise report.  
● This is the SKU wise target vs. achievement report.  
● Sales officer’s target and actual achievement.  
● Can be filtered according to the followings - 
○ Region  
○ Zone  
○ Area  

=== PAGE 58 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Route  
○ DB 
○ Nationwide  
○ By Category  
○ Date range based.  
● The report can be for primary and secondary sales.  
SKU Summary  
SKU wise summary and achievement is covered in the report.  
● SL No.     
● Category    Brand     
● MIS ID     
● SKU     
● Target Qty Pcs     
● Target CTN     
● Target in -MT.     
● Target Amount -DP     
● Target Amount -TP     
● Sales Qty Pcs     
● Sales Small CTN     
● Sales in -MT.     
● Sales Qty - FREE     
● Sales Amount -DP - FREE     
● Sales Amount -DP     
● Sales Amount -TP     
● Variance (Sales -Target)Qty     
● Achi Sales_DP %  
● Target Contri. %     
● Sales Contri. %     
● Zone  
Category Summary  
Category wise summary report using the followings - 
● Category     
● Target Qty Pcs  
● Target CTN  
● Target in -MT. 
● Target Amount -DP 
● Target Amount -TP 
● Sales Qty Pcs  
● Sales Small CTN  
● Sales in -MT. 

=== PAGE 59 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Sales Qty [FREE]  
● Sales Amount -DP [FREE]  
● Sales Amount -DP 
● Sales Amount -TP 
● Variance (Sales -Target) Qty  
● Achi Sales_DP %  
● Target Contri. %  
● Sales Contri. %  
Brand Summary  
Brand summary using the followings - 
● SL No.    
● Category    
● Brand     
● Target Qty Pcs  
● Target CTN  
● Target in -MT. 
● Target Amount -DP 
● Target Amount -TP 
● Sales Qty Pcs  
● Sales Small CTN  
● Sales in -MT. 
● Sales Qty [FREE]  
● Sales Amount -DP [FREE]  
● Sales Amount -EDP 
● Sales Amount -TP 
● Variance (Sales -Target) Qty  
● Achi Sales_DP %  
● Target Contri. %  
● Sales Contri. %  
Distributor SKU Wise Target vs Achievement - Landing Target  
● The report can be generated by - 
○ Category.  
○ Region  
○ Zone  
○ Area  
○ Route  
○ SKU 
○ Territory  
● The report may cover the distributor whose target is not set yet.  
● Brand, SKU or category based  summary can be generated.  

=== PAGE 60 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
● Information covered in the report is as below - 
○ Region     
○ Area     
○ Territory     
○ Distributor Name     
○ Category     
○ SKU     
○ Target Amount - DP 
○ Target - Pcs 
○ Target - CTN 
○ Target - TON  
○ Landing Target Amount -DP 
○ Landing Target -Pcs 
○ Landing Target -CTN 
○ Landing Target -TON  
○ Achi_TON %  
● Can be generated for single or multiple categories of products.  
SKU Wise Target vs Achievement  
● Sales officer’s report according to the used SKus.  
● Major data covered is  as below - 
○ Zone     
○ Region     
○ Area  
○ Distributor Name  
○ SO/SR Text Data     
○ SO/SR Name     
○ Category    Brand     
○ SKU     
○ Target Amount - DP 
○ Target - Pcs 
○ Target - CTN 
○ Target - MT. 
○ Sales Amount -DP 
○ Sales -Pcs 
○ Sales -CTN 
○ Sales -MT. 
○ Achi %  
● One or multiple products based reports.  
● Can be filtered by  
○ Zone  
○ Region  

=== PAGE 61 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
○ Route  
● Report for the selected month.  
Target Yet Not Set  
● This is the sales officers’ report whose target is not set yet.  
● For a specific month based report.  
● Information covered is - 
○ Name of AH     
○ Mobile (AH)     
○ Name of SR/SO  
○ Area  
Total Sales & Collection Summary  
● Total sales report according to the  
○ Sales officer.  
○ TSO 
○ DSM  
● Date range based report.  
●  
Distributor Target Primary  
● Nationwide primary target.  
● For a specific month based report.  
● Major information covered is - 
○ Region  
○ Area  
○ Dealer or distributor.  
○ Products  
● Total sales need to cover for the primary sales.  
Target Achievement By All Dealers  
● Nationwide dealer or distributor’s achievement report.  
●  The report can be filtered by the dealer.  
● The report would be for the selected month.  
Target Achievement - Territory  
● Report for the selected month.  
● Primary achieved target report.  
● Month specific for the selected month.  
● Territory wise report.  

=== PAGE 62 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Target achievement - Region  
● Report for the selected month.  
● Primary achieved target report.  
● Month specific for the selected month.  
● Region wise report.  
Collection & Incentive Report  
Distributor’s Daily Collection  
The major information that will be covered in the report is as below - 
● Region  
● Primary target of the distributor.  
● Day wise collection amount.  
● Monthly collection amount.  
● Achievement percentage of the secondary sales.  
● Monthly primary sales amount.  
● Achievement percentage of the primary sales.  
● Total target of the secondary sales which will be filtered by  
○ Total distributors.  
○ By the selected distributors.  
● Secondary sales EDP total.  
● Achievement percentage of secondary sales EDP.  
● The report can be filtered by - 
○ Division  
○ Region  
○ Area  
○ Route  
● Territory wise summary can be generated.  
● Territory based dealer’s summary can be generated.  
Nationwide Incentive  
● The report can be for all the dealers or distributors.  
● Can be filtered by distributors.  
● Generated by the selected month.  
● Can be generated for the selected or for all the sales officers.  
● Can be generated for the selected or for all the TSOs.  
● Can be generated for the selected or for all the RSMs.  
● The report can be generated for salary or the selected month of incentives.  
● Salary range based reports can be generated using the system.  

=== PAGE 63 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Yearly Achievement  
● The achievement report will be for the sales officer.  
● Reports can be generated by the selected year.  
Yearly Achievement (Exclusive SR)  
● The achievement report will be for the exclusive sales officer who satisfies some special 
criteria..  
● Reports can be generated by the selected year.  
Attendance & Payroll  
There are different types of attendance, leave and payroll reports for the following stakeholders - 
● SO 
● DH 
● AH 
● ZH 
● RH 
The reports can be for a specific date, date interval based,  
Attendance  
● Daily attendance report by the selected or all the zones.  
● On a specific date based attendance report.  
● Excel or CSV download.  
● Sales officers report which can be filtered by the selected sales officer.  
● Can be filtered by region, zone, area, route.  
● The attendance report can be for - 
○ Daily  
○ Weekly  
○ Bi-weekly.  
○ Monthly  
○ Selected interval based.  
● Raw data based report.  
Attendance Modification  
In case of any inconsistency or any other reasons, the authorized users can modify the reports.  
● The reports can be modified.  
● Delete  
● Filter and amend by zone, region, area etc.  
● Can be modified for a specific or selected date range data.  

=== PAGE 64 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Leave  
The authorized user can generate leave reports on the following contexts - 
● Daily, monthly, weekly or any selected date range based leave reports.  
● Designation wise leave records for the selected date or for a specific date.  
● Raw data for leave report.  
Leave Modification  
The authorized user can modify the leave reports  on the following cases - 
● If the leave records are inconsistent.  
● Can be filtered by designation and modified.  
● Can be modified for the selected date based leave report.  
Distributor’s Orders  
This report will deal with the products delivered by the distributors.  
● Distributor wise order summary using the followings - 
○ Delivered orders’ summarized data.  
○ SKU information based report.  
○ Live data can be checked.  
○ Filtering facility by region, zone, area, route, by dates, voucher etc.  
○ Distribution status based report on  
■ Posted  
■ Not posted  
■ Canceled.  
● Account clearance for collection on  
○ Selected date or date range based.  
○ Can be generated by the selected bank.  
○ Live data can also be checked.  
○ Orders whose accounts are clear to proceed.  
○ The report will cover - 
■ Voucher number.  
■ Sales organization.  
■ Region  
■ Bank information  
■ Distributor name.  
■ Deposit amount  
■ Remarks.  
■ Contact mobile number etc.  
● Dashboard for the followings - 
○ Bank with the followings  
■ Name  

=== PAGE 65 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
■ Contact person or person in charge who will work for the organization.  
■ Cleared accounts.  
■ Canceled orders.  
■ Disputed orders etc.  
■ Can be filtered by dates.  
○ Region summary using the followings - 
■ Region name.  
■ Sales officer details.  
■ Account cleared.  
■ Canceled orders.  
■ Disputed accounts.  
○ Territory or are based report that will cover the followings - 
■ Region name.  
■ Area or territory name.  
■ Number of orders by the sales officer.  
■ Account cleared.  
■ Canceled orders.  
■ Disputed accounts.  
External Interface Requirements  
Software Interfaces  
● Front -end software: Angular is a TypeScript -based, free and open -source single -page web 
application framework. Latest version will be used to develop the application.  
● Backend:  
○ Oracle database.  
○ Microservice based development.  
○ Java spring boot.  
 
● OS: We have chosen Windows operating system for its best support and user -friendliness. 
But others like - Linux, Mac can also be used.  
Communication Interface  
● This project supports all types of web browsers compatible with CGI, HTML & 
Javascript.  

=== PAGE 66 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Non-Functional Requirements  
Non-functional requirements describe how the software should perform. These requirements 
should be measurable and testable. This requirement deals with details about the software’s 
performance, security, reliability, and usability etc.  
E-R Diagram  
In order to construct an E -R diagram, it needs to identify different types of entities across the 
application with their properties. The following things are related to E -R diagram - 
● Entities : Major entities of the application are - AH, RH, ZH, SO, DSR, DB etc. who play 
with the system.  
● Properties or attributes : Attributes belong to the properties of the entities which can be 
used to identify the entities, to establish relationships with other entities.  
●  These connect entities and represent meaningful dependencies among the entities.  
  Like - 
 
 
Order management system  


=== PAGE 67 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
Normalization  
The basic objective of normalization is to reduce redundancy which means that information is to 
be stored only once. Storing information several times leads to a wastage of storage space and 
an increase in the total size of the data stored.  
The database tables will be designed in such a way that each table deals with a single theme. 
There are three different kinds of modifications of anomalies and formulating the first, second, 
and third normal forms (3NF) is considered sufficient for most pr actical purposes. It should be 
considered only after a thorough analysis and complete understanding of its implications.  
Web Application  
Web application is the main component of the project which will communicate with the API system. 
All kinds of database operations will be performed via API. API will ensure security where Token 
based authentication will be verified. After the desired inter val, the session will be time out and 
the user needs to authenticate newly to perform any operation.  
Reliability  
All kinds of secure mechanisms will be handled from API and any enhancement will happen only 
in API end so that cost will be lower as different  consumers will use the centralized system.  
Memory Management  
Rich Laravel Frame will be used to develop API which will release the unnecessary consumption 
to make the system up to the mark perform operations. Angular based framework of frontend will 
communicate with API and inter -service communication will be handle d efficiently and system will 
not be degraded in performance.  
Architectural View  
The system will contain the following components - 
● Frontend web application being developed using react.  
● WEB API which will be developed using Laravel.  
● Mobile application will load the response web pages using webviewThe app will be 
developed using android.  

=== PAGE 68 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
Development Methodology  
The project will be developed under the agile framework and by using the scrum method. The 
approaches are as below - 
● All the features will be enlisted and split into modules and sub -modules.  
● Will set priority on the modules to develop sequentially.  
● The features of the modules will be split into tasks and sub -tasks.  
● Then all the tasks and subtasks will be distributed to different sprints.  
● After getting customer’s consent, development priority of the sprints will be assigned.  
● Development team will be working as per sprint priority.  


=== PAGE 69 ===

 
        ISO 9001 :: ISO 27001 :: ISO 14001  
—----------------------------------------------------------------------------------------------------------------------------- ----------------------------  
—------------------------------------------------------------------------------------------------  
TechKnowGram Limited  5/9 Block B, Suite B1, Lalmatia, Dhaka 1207, Bangladesh  
Phone: +88 02 55008199 | Mobile: +88 01819250309 info@techknowgram.com  |  
www.TechKnowGram.com  
 
 
Scum method  
 
 
Product development cycle  
 
 
 
 
 
 
