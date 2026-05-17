-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 09, 2026 at 06:23 PM
-- Server version: 10.11.10-MariaDB
-- PHP Version: 8.4.20

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `pustihtahmedul_pusti4`
--

-- --------------------------------------------------------

--
-- Table structure for table `acct_year`
--

CREATE TABLE `acct_year` (
  `name` varchar(20) NOT NULL,
  `acct_year_date` date NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `AppUser`
--

CREATE TABLE `AppUser` (
  `id` int(30) NOT NULL,
  `userName` varchar(50) DEFAULT NULL,
  `user_id` varchar(50) NOT NULL,
  `CompanyName` varchar(100) DEFAULT NULL,
  `password` varchar(30) NOT NULL,
  `email` varchar(50) DEFAULT NULL,
  `mobile` varchar(20) NOT NULL,
  `alt_mobile` varchar(13) DEFAULT NULL,
  `employeeCode` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `photo` varchar(200) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `is_Account_Expire` tinyint(1) DEFAULT NULL,
  `is_Account_Lock` tinyint(1) DEFAULT 0,
  `role` tinyint(2) DEFAULT 0,
  `StoreManagement` tinyint(1) DEFAULT 0,
  `factoryMng` int(2) DEFAULT 0,
  `DepotMng` int(2) DEFAULT 0,
  `superDistributor` int(2) DEFAULT 0,
  `Distributor` int(2) DEFAULT 0,
  `financeAcc` tinyint(1) DEFAULT 0,
  `salesMng` int(2) DEFAULT 0,
  `permission` int(2) DEFAULT 0,
  `audit` int(2) DEFAULT 0,
  `verifier` int(2) DEFAULT 0,
  `checker` int(2) DEFAULT 0,
  `regiDate` varchar(15) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `area`
--

CREATE TABLE `area` (
  `region_id` int(3) NOT NULL,
  `area_id` int(4) NOT NULL,
  `area_name` varchar(50) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asm`
--

CREATE TABLE `asm` (
  `asm_id` int(5) UNSIGNED ZEROFILL NOT NULL,
  `user_name` varchar(30) NOT NULL,
  `user_pass` varchar(30) NOT NULL,
  `area_id` int(5) UNSIGNED ZEROFILL NOT NULL,
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `name` varchar(30) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `doj` date NOT NULL,
  `dor` date NOT NULL,
  `status` int(2) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `basic` double NOT NULL,
  `ta_da` double NOT NULL,
  `internet_bill` double NOT NULL,
  `others` double NOT NULL,
  `meeting_exp` double NOT NULL,
  `email_id` varchar(40) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `y_ssc` varchar(10) NOT NULL,
  `dob` date NOT NULL,
  `blood` varchar(5) NOT NULL,
  `district` varchar(20) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct_no` varchar(40) NOT NULL,
  `h_rent` double NOT NULL,
  `medical` double NOT NULL,
  `city_allowance` double NOT NULL,
  `sales_org_id` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `asm_attendance`
--

CREATE TABLE `asm_attendance` (
  `year_month` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `asm_id` int(4) NOT NULL,
  `attendance_type` varchar(5) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `attendance_type`
--

CREATE TABLE `attendance_type` (
  `attendance_type` varchar(1) NOT NULL,
  `attendance_details` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit`
--

CREATE TABLE `audit` (
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `category` varchar(20) NOT NULL,
  `remarks` varchar(200) NOT NULL,
  `user` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auditor`
--

CREATE TABLE `auditor` (
  `id` varchar(10) NOT NULL,
  `auditor_name` varchar(30) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `doj` date NOT NULL,
  `dor` date NOT NULL,
  `status` int(2) NOT NULL,
  `basic` double NOT NULL,
  `h_rent` double NOT NULL,
  `internet_bill` double NOT NULL,
  `email_id` varchar(40) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `y_ssc` varchar(10) NOT NULL,
  `dob` date NOT NULL,
  `blood` varchar(5) NOT NULL,
  `district` varchar(20) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct_no` varchar(40) NOT NULL,
  `i` int(3) UNSIGNED ZEROFILL NOT NULL,
  `medical` double NOT NULL,
  `others` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank`
--

CREATE TABLE `bank` (
  `bank_id` int(2) NOT NULL,
  `bank_name` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_name`
--

CREATE TABLE `bank_name` (
  `sales_org_id` int(2) NOT NULL,
  `bank_id` int(3) NOT NULL,
  `bank_name` varchar(200) NOT NULL,
  `status` int(1) NOT NULL,
  `acct_person` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `brand`
--

CREATE TABLE `brand` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `brand_name` varchar(30) NOT NULL,
  `type` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `brand1`
--

CREATE TABLE `brand1` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `brand_name` varchar(30) NOT NULL,
  `type` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `brand_mf`
--

CREATE TABLE `brand_mf` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `brand_name` varchar(30) NOT NULL,
  `type` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `brand_pf`
--

CREATE TABLE `brand_pf` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `brand_name` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `brand_pf_depot`
--

CREATE TABLE `brand_pf_depot` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `brand_name` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `company`
--

CREATE TABLE `company` (
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `com_name` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `compt_info`
--

CREATE TABLE `compt_info` (
  `year_month` varchar(10) NOT NULL,
  `date` date NOT NULL,
  `region_id` int(3) NOT NULL,
  `product_id_compt` int(4) NOT NULL,
  `tp` float NOT NULL,
  `mrp` float NOT NULL,
  `pcs_pack` int(4) NOT NULL,
  `trade_promotion` varchar(50) NOT NULL,
  `consumer_promotion` varchar(50) NOT NULL,
  `posm_activities` varchar(50) NOT NULL,
  `merchandising_ratings` int(2) NOT NULL,
  `sales` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `credit_sales`
--

CREATE TABLE `credit_sales` (
  `id` int(2) NOT NULL,
  `type` varchar(15) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data`
--

CREATE TABLE `data` (
  `year_month` varchar(8) NOT NULL,
  `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `opening` double NOT NULL,
  `received` double NOT NULL,
  `received_adjust` double NOT NULL,
  `adjustment` double NOT NULL,
  `total_stock` double NOT NULL,
  `secondary` double NOT NULL,
  `floor_stock` double NOT NULL,
  `pending` double NOT NULL,
  `Closing_stock` double NOT NULL,
  `tp` float NOT NULL,
  `dp` float NOT NULL,
  `date` date NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `opening_free` double NOT NULL,
  `received_free` double NOT NULL,
  `received_free_adjust` double NOT NULL,
  `adjustment_free` double NOT NULL,
  `total_stock_free` double NOT NULL,
  `secondary_free` double NOT NULL,
  `floor_stock_free` double NOT NULL,
  `pending_free` double NOT NULL,
  `Closing_stock_free` double NOT NULL,
  `s_qty_db_adjust` double NOT NULL,
  `Closing_stock_blocked` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_daily_dealer`
--

CREATE TABLE `data_daily_dealer` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `product_id` int(4) NOT NULL,
  `s_qty` double NOT NULL,
  `route_id` int(6) NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `sr_id` int(6) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `s_qty_free` double NOT NULL,
  `s_qty_db_adjust` double NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `order_date` date NOT NULL,
  `sales_type` int(1) NOT NULL,
  `dsr_id` int(4) NOT NULL,
  `asm_id` int(4) NOT NULL,
  `disc_tp` double NOT NULL,
  `man_disc` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `data_daily_info`
--

CREATE TABLE `data_daily_info` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `sr_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `outlet_no` double NOT NULL,
  `memo` double NOT NULL,
  `no_line` double NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `order_date` date NOT NULL,
  `sales_type` int(1) NOT NULL,
  `remarks` varchar(200) NOT NULL,
  `dsr_id` int(4) NOT NULL,
  `asm_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `db_so`
--

CREATE TABLE `db_so` (
  `id` int(50) NOT NULL,
  `DistributorName` varchar(100) NOT NULL,
  `DistributorMobile` varchar(13) NOT NULL,
  `DistributorId` varchar(50) NOT NULL,
  `sd_id` varchar(50) DEFAULT NULL,
  `so_no` varchar(100) NOT NULL,
  `PaymentMethod` varchar(50) DEFAULT NULL,
  `BankName` varchar(100) DEFAULT NULL,
  `BranchName` varchar(150) DEFAULT NULL,
  `rcvAmount` float(15,2) DEFAULT NULL,
  `note` varchar(200) DEFAULT NULL,
  `recDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer`
--

CREATE TABLE `dealer` (
  `teritorry_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `dealer_name` varchar(100) NOT NULL,
  `status` int(2) NOT NULL,
  `company` int(2) NOT NULL,
  `proprietor` varchar(50) NOT NULL,
  `address` varchar(200) NOT NULL,
  `mobile` varchar(30) NOT NULL,
  `db_pass` varchar(20) NOT NULL,
  `open_date` date NOT NULL,
  `close_date` date NOT NULL,
  `transport_id` int(3) NOT NULL,
  `exclusive_tso_id` int(3) NOT NULL,
  `erp_id` varchar(10) NOT NULL,
  `depot_id` int(2) NOT NULL,
  `trans_area_id` int(2) NOT NULL,
  `apps_live` int(1) NOT NULL,
  `thana_id` int(3) NOT NULL,
  `text_data` varchar(30) NOT NULL,
  `printer_exist` int(1) NOT NULL,
  `pc_exist` int(1) NOT NULL,
  `proprietor_dob` date DEFAULT NULL,
  `proprietor_alt` varchar(50) NOT NULL,
  `mobile_alt` varchar(20) NOT NULL,
  `relation` varchar(20) NOT NULL,
  `direct_sales` int(1) NOT NULL,
  `sd_id` int(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_collection`
--

CREATE TABLE `dealer_collection` (
  `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `year_month` varchar(8) NOT NULL,
  `bp` double NOT NULL,
  `mkt` double NOT NULL,
  `total` double NOT NULL,
  `return_delivery` float NOT NULL,
  `tso_evaluation` float NOT NULL,
  `remote_point` float NOT NULL,
  `adjust_amount` double NOT NULL,
  `no_incentive` int(1) UNSIGNED ZEROFILL NOT NULL,
  `date` date NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_daily_collection`
--

CREATE TABLE `dealer_daily_collection` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `bp` double NOT NULL,
  `mkt` double NOT NULL,
  `total` double NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `asm_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_incentive`
--

CREATE TABLE `dealer_incentive` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `inc_amount` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_order`
--

CREATE TABLE `dealer_order` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `product_id` int(4) NOT NULL,
  `description` varchar(200) NOT NULL,
  `qty` double NOT NULL,
  `amount` double NOT NULL,
  `date_time` datetime NOT NULL,
  `posted_erp` int(1) NOT NULL,
  `user` varchar(30) NOT NULL,
  `posted_by` varchar(30) NOT NULL,
  `track_user` varchar(30) NOT NULL,
  `stock_qty` double NOT NULL,
  `target_qty` double NOT NULL,
  `estimate_order_qty` double NOT NULL,
  `confirm_date_time` datetime NOT NULL,
  `sales_org_id` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_order_info`
--

CREATE TABLE `dealer_order_info` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `branch_name` varchar(100) NOT NULL,
  `bank_deposit_date` date NOT NULL,
  `diposit_amount` double NOT NULL,
  `diposit_amount_actual` double NOT NULL,
  `remarks` varchar(500) NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL,
  `posted_erp` int(1) NOT NULL,
  `posted_by` varchar(30) NOT NULL,
  `track_user` varchar(30) NOT NULL,
  `confirm_date_time` datetime NOT NULL,
  `bank_id` int(3) NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `bank_clearance_acct` int(1) NOT NULL,
  `bank_clearance_by` varchar(20) NOT NULL,
  `bank_clearance_date_time` datetime NOT NULL,
  `only_on_line` int(1) NOT NULL,
  `tso_remarks` varchar(200) NOT NULL,
  `acct_remarks` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_order_national`
--

CREATE TABLE `dealer_order_national` (
  `year_month` varchar(10) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `product_id` int(4) NOT NULL,
  `qty` double NOT NULL,
  `amount` double NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL,
  `stock_qty` double NOT NULL,
  `target_qty` double NOT NULL,
  `estimate_order_qty` double NOT NULL,
  `version` varchar(10) NOT NULL,
  `depot_id` int(2) NOT NULL,
  `depot_min_stock` int(2) NOT NULL,
  `depot_max_stock` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_received`
--

CREATE TABLE `dealer_received` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `received` double NOT NULL,
  `dp` float NOT NULL,
  `received_free` double NOT NULL,
  `received_adjust` double NOT NULL,
  `received_free_adjust` double NOT NULL,
  `blocked_stock` double NOT NULL,
  `type` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_special_rate`
--

CREATE TABLE `dealer_special_rate` (
  `dealer_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `dp` double NOT NULL,
  `tp` double NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_stock`
--

CREATE TABLE `dealer_stock` (
  `year_month` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `stock` double NOT NULL,
  `dp` float NOT NULL,
  `stock_free` double NOT NULL,
  `blocked_stock` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_target`
--

CREATE TABLE `dealer_target` (
  `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `year_month` varchar(20) NOT NULL,
  `bp` double NOT NULL,
  `gp` double NOT NULL,
  `ss` double NOT NULL,
  `os` double NOT NULL,
  `file` double NOT NULL,
  `nb` double NOT NULL,
  `total` double NOT NULL,
  `date` date NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_target_landing`
--

CREATE TABLE `dealer_target_landing` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `product_id` int(3) NOT NULL,
  `qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `dealer_id` int(6) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dealer_target_secondary`
--

CREATE TABLE `dealer_target_secondary` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `product_id` int(3) NOT NULL,
  `qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deliSchedule`
--

CREATE TABLE `deliSchedule` (
  `id` int(50) NOT NULL,
  `db_id` varchar(50) NOT NULL,
  `so` varchar(50) NOT NULL,
  `productId` varchar(50) NOT NULL,
  `qty` int(15) NOT NULL,
  `deliveryDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `DeliveryTr`
--

CREATE TABLE `DeliveryTr` (
  `id` int(2) NOT NULL,
  `TrNo` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `DemandTr`
--

CREATE TABLE `DemandTr` (
  `id` int(2) NOT NULL,
  `TrNo` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `department`
--

CREATE TABLE `department` (
  `dep_id` int(2) NOT NULL,
  `dep_name` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot`
--

CREATE TABLE `depot` (
  `depot_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `depot_name` varchar(100) NOT NULL,
  `status` int(2) NOT NULL,
  `min_stock` int(2) NOT NULL,
  `max_stock` int(2) NOT NULL,
  `description` varchar(50) NOT NULL,
  `bg_mbil` double NOT NULL,
  `bg_mwil` double NOT NULL,
  `bg_mpi` double NOT NULL,
  `bg_mf` double NOT NULL,
  `sms_status` int(1) NOT NULL,
  `sms_no` varchar(200) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_challan`
--

CREATE TABLE `depot_challan` (
  `v_no` varchar(20) NOT NULL,
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `product_id` int(4) NOT NULL,
  `challan_qty` double NOT NULL,
  `delivery_qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `challan_no` varchar(30) NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL,
  `delivery_to` varchar(150) NOT NULL,
  `batch` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_challan_upload`
--

CREATE TABLE `depot_challan_upload` (
  `v_no` varchar(20) NOT NULL,
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `product_id` int(4) NOT NULL,
  `challan_qty` double NOT NULL,
  `delivery_qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `order_no` varchar(30) NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL,
  `delivery_to` varchar(150) NOT NULL,
  `batch` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_delivery`
--

CREATE TABLE `depot_delivery` (
  `v_no` varchar(20) NOT NULL,
  `v_no_challan` varchar(20) NOT NULL,
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `product_id` int(4) NOT NULL,
  `delivery_qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `challan_no` varchar(30) NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL,
  `remarks` varchar(100) NOT NULL,
  `transport_booking_no` varchar(30) NOT NULL,
  `dealer_received_qty` double NOT NULL,
  `dealer_received_date` date NOT NULL,
  `dealer_received_time` varchar(10) NOT NULL,
  `transport_cost` double NOT NULL,
  `transport_cost_dealer` double NOT NULL,
  `challan_date` date NOT NULL,
  `delivery_to` varchar(100) NOT NULL,
  `claimed` int(1) NOT NULL,
  `transport_id` int(4) NOT NULL,
  `updated_user` varchar(30) NOT NULL,
  `date_time_update` datetime NOT NULL,
  `batch` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_order`
--

CREATE TABLE `depot_order` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(4) NOT NULL,
  `product_id` int(4) NOT NULL,
  `description` varchar(200) NOT NULL,
  `qty` double NOT NULL,
  `challan_qty` double NOT NULL,
  `amount` double NOT NULL,
  `date_time` datetime NOT NULL,
  `posted_erp` int(1) NOT NULL,
  `user` varchar(30) NOT NULL,
  `posted_by` varchar(30) NOT NULL,
  `track_user` varchar(30) NOT NULL,
  `stock_qty` double NOT NULL,
  `target_qty` double NOT NULL,
  `estimate_order_qty` double NOT NULL,
  `confirm_date_time` datetime NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `challan_update_date_time` datetime NOT NULL,
  `so_pending` double NOT NULL,
  `allocated_qty` double NOT NULL,
  `allocated_by` varchar(20) NOT NULL,
  `allocated_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_received`
--

CREATE TABLE `depot_received` (
  `v_no` varchar(20) NOT NULL,
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(2) NOT NULL,
  `product_id` int(4) NOT NULL,
  `received` double NOT NULL,
  `transfer` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `date_time` datetime NOT NULL,
  `challan_no` varchar(30) NOT NULL,
  `user` varchar(30) NOT NULL,
  `load_scan_qty` double NOT NULL,
  `unload_scan_qty` double NOT NULL,
  `load_scan_date_time` datetime NOT NULL,
  `unload_scan_date_time` datetime NOT NULL,
  `post` int(1) NOT NULL,
  `updated_user` varchar(30) NOT NULL,
  `date_time_updated` datetime NOT NULL,
  `order_no` varchar(30) NOT NULL,
  `batch` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_stock`
--

CREATE TABLE `depot_stock` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `stock` double NOT NULL,
  `dp` float NOT NULL,
  `opening_stock` double NOT NULL,
  `opening_stock_data` double NOT NULL,
  `opening_stock_backup` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_transport`
--

CREATE TABLE `depot_transport` (
  `year_month` varchar(10) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `depot_id` int(3) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `v_no_challan` varchar(20) NOT NULL,
  `v_no_delivery` varchar(20) NOT NULL,
  `challan_no` varchar(20) NOT NULL,
  `transport_name` varchar(50) NOT NULL,
  `transport_booking_no` varchar(30) NOT NULL,
  `transport_cost` double NOT NULL,
  `transport_cost_dealer` double NOT NULL,
  `challan_date` date NOT NULL,
  `claimed` int(1) NOT NULL,
  `claimed_remarks` varchar(200) NOT NULL,
  `transport_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_transport_challan`
--

CREATE TABLE `depot_transport_challan` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `depot_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `transport_id` int(3) NOT NULL,
  `delivery_date_time_start` datetime NOT NULL,
  `delivery_date_time_end` datetime NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_erp_id` varchar(20) NOT NULL,
  `qty` double NOT NULL,
  `delivery_amount` double NOT NULL,
  `delivery_date_time_last` datetime NOT NULL,
  `entry_by` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL,
  `qty_scan` double NOT NULL,
  `scan_date_time` datetime NOT NULL,
  `qty_delivery_scan` double NOT NULL,
  `delivery_scan_date_time` datetime NOT NULL,
  `delivery_man_id` int(3) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `depot_transport_dealer_scan`
--

CREATE TABLE `depot_transport_dealer_scan` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `depot_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `transport_id` int(3) NOT NULL,
  `delivery_date_time_start` datetime NOT NULL,
  `delivery_date_time_end` datetime NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_erp_id` varchar(20) NOT NULL,
  `entry_by` varchar(30) NOT NULL,
  `qty_scan` double NOT NULL,
  `scan_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `designation`
--

CREATE TABLE `designation` (
  `deg_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `deg_name` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Discountconditio`
--

CREATE TABLE `Discountconditio` (
  `id` int(40) NOT NULL,
  `DiscountconditionName` varchar(50) NOT NULL,
  `recDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `Discounts`
--

CREATE TABLE `Discounts` (
  `id` int(50) NOT NULL,
  `skuName` varchar(100) NOT NULL,
  `division` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `zone` varchar(50) DEFAULT NULL,
  `dealer_id` varchar(50) DEFAULT NULL,
  `DiscountconditionName` varchar(70) NOT NULL,
  `buyQty` int(12) NOT NULL,
  `dis` int(12) NOT NULL DEFAULT 0,
  `offerStartDate` varchar(12) NOT NULL,
  `offerEndtDate` varchar(12) NOT NULL,
  `regiDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `districts`
--

CREATE TABLE `districts` (
  `district_id` int(11) NOT NULL,
  `district_name` varchar(255) NOT NULL,
  `country_id` int(11) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `division`
--

CREATE TABLE `division` (
  `division_id` int(2) NOT NULL,
  `division_name` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document`
--

CREATE TABLE `document` (
  `date` date NOT NULL,
  `title` varchar(200) NOT NULL,
  `version` varchar(10) NOT NULL,
  `title_check` varchar(100) NOT NULL,
  `document_name` varchar(100) NOT NULL,
  `upload_date_time` datetime NOT NULL,
  `upload_by` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `dsr`
--

CREATE TABLE `dsr` (
  `dealer_id` int(5) NOT NULL,
  `dsr_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `dsr_name` varchar(100) NOT NULL,
  `mobile` varchar(30) NOT NULL,
  `doj` date NOT NULL,
  `dor` date NOT NULL,
  `dob` date NOT NULL,
  `nid` varchar(50) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `status` int(1) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoice_no`
--

CREATE TABLE `invoice_no` (
  `invoice_id` int(10) UNSIGNED ZEROFILL NOT NULL,
  `contact_name` varchar(50) NOT NULL,
  `mobile` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `address` varchar(200) NOT NULL,
  `date` date NOT NULL,
  `status` int(2) NOT NULL,
  `id` int(3) NOT NULL,
  `shop_id` int(3) NOT NULL,
  `total_amount` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `issueFromFactory`
--

CREATE TABLE `issueFromFactory` (
  `id` varchar(300) DEFAULT NULL,
  `SKU_Name` varchar(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `issueQty` int(20) DEFAULT 0,
  `issueQtyPcs` int(10) DEFAULT 0,
  `issuefreePc` int(10) DEFAULT 0,
  `pcs_ctn` int(10) DEFAULT 0,
  `offer_note` varchar(100) DEFAULT NULL,
  `so_no` varchar(50) NOT NULL,
  `so_date` varchar(12) DEFAULT NULL,
  `factory` varchar(50) NOT NULL,
  `db_id` varchar(50) NOT NULL,
  `do_no` varchar(50) NOT NULL,
  `region_id` varchar(50) NOT NULL,
  `area_id` varchar(50) NOT NULL,
  `teritorry_id` varchar(50) NOT NULL,
  `issueBy` varchar(50) NOT NULL,
  `vehicle` varchar(50) DEFAULT NULL,
  `driver` varchar(50) DEFAULT NULL,
  `dphone` int(12) DEFAULT NULL,
  `issueDate` varchar(12) NOT NULL,
  `scheduleDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `key_outlet`
--

CREATE TABLE `key_outlet` (
  `id` int(2) NOT NULL,
  `type` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `log`
--

CREATE TABLE `log` (
  `login_name` varchar(20) NOT NULL,
  `user_category` varchar(15) NOT NULL,
  `date` date NOT NULL,
  `time` time NOT NULL,
  `isp_name` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `memoLineCat`
--

CREATE TABLE `memoLineCat` (
  `id` int(50) NOT NULL,
  `so_id` int(50) NOT NULL,
  `db_id` int(50) NOT NULL,
  `route_id` int(15) NOT NULL,
  `region_id` int(12) NOT NULL,
  `area_id` int(12) NOT NULL,
  `teritorry_id` int(12) NOT NULL,
  `memo` int(10) NOT NULL,
  `line` int(10) NOT NULL,
  `category` int(10) NOT NULL,
  `createDate` varchar(13) DEFAULT NULL,
  `visited` int(10) DEFAULT 0,
  `perrouteVisit` int(2) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `memoLineCatDelivery`
--

CREATE TABLE `memoLineCatDelivery` (
  `id` int(50) NOT NULL,
  `so_id` varchar(50) NOT NULL,
  `db_id` varchar(50) NOT NULL,
  `route_id` varchar(30) NOT NULL,
  `region_id` int(12) NOT NULL,
  `area_id` int(12) NOT NULL,
  `teritorry_id` int(12) NOT NULL,
  `memo` int(10) NOT NULL,
  `line` int(10) NOT NULL,
  `category` int(10) NOT NULL,
  `createDate` varchar(13) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `multiBankOrderInfo`
--

CREATE TABLE `multiBankOrderInfo` (
  `id` int(50) NOT NULL,
  `db_id` varchar(50) NOT NULL,
  `db_name` varchar(150) DEFAULT NULL,
  `phone` varchar(14) NOT NULL,
  `so_no` varchar(100) NOT NULL,
  `PaymentMethod` varchar(30) NOT NULL,
  `bankNames` varchar(50) NOT NULL,
  `branch` varchar(50) NOT NULL,
  `DipositorsBankName` varchar(50) NOT NULL,
  `DipositorsBranchName` varchar(100) NOT NULL,
  `DipositorCellNo` varchar(13) NOT NULL,
  `BDTAmount` int(15) NOT NULL,
  `recordDate` varchar(15) NOT NULL,
  `note` varchar(100) DEFAULT NULL,
  `status` int(2) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notice`
--

CREATE TABLE `notice` (
  `sn` int(5) NOT NULL,
  `notice_date` date NOT NULL,
  `body` text NOT NULL,
  `effect_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `notice_type` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `offerCondition`
--

CREATE TABLE `offerCondition` (
  `id` int(40) NOT NULL,
  `conditionName` varchar(50) NOT NULL,
  `recDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` int(50) NOT NULL,
  `skuName` varchar(100) NOT NULL,
  `division` varchar(50) DEFAULT NULL,
  `region` varchar(50) DEFAULT NULL,
  `zone` varchar(50) DEFAULT NULL,
  `dealer_id` varchar(50) DEFAULT NULL,
  `conditionName` varchar(70) NOT NULL,
  `buyQty` int(12) NOT NULL,
  `freeQty` varchar(100) NOT NULL,
  `offerStartDate` varchar(12) NOT NULL,
  `offerEndtDate` varchar(12) NOT NULL,
  `regiDate` varchar(12) DEFAULT NULL,
  `status` int(2) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `offer_level`
--

CREATE TABLE `offer_level` (
  `id` int(2) NOT NULL,
  `offer_level` varchar(20) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `OrderDelivery`
--

CREATE TABLE `OrderDelivery` (
  `id` int(50) NOT NULL,
  `db_id` int(50) DEFAULT NULL,
  `do_no` varchar(100) DEFAULT NULL,
  `so_no` varchar(100) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `SKU_Name` varchar(100) DEFAULT NULL,
  `delQty_ctn` int(10) DEFAULT 0,
  `pcs_ctn` int(10) DEFAULT 0,
  `Offer_PC` int(2) DEFAULT NULL,
  `offer_note` varchar(100) DEFAULT NULL,
  `region_id` varchar(50) NOT NULL,
  `area_id` varchar(50) NOT NULL,
  `teritorry_id` varchar(50) NOT NULL,
  `so_date` varchar(13) DEFAULT NULL,
  `delivery_date` varchar(12) DEFAULT NULL,
  `finalDelivery_date` varchar(12) DEFAULT NULL,
  `factory` varchar(50) NOT NULL,
  `status` int(2) DEFAULT 0,
  `deliverStatus` int(2) DEFAULT 0,
  `createdBy` varchar(50) DEFAULT NULL,
  `approvedBy` varchar(30) DEFAULT NULL,
  `commonTr` varchar(100) DEFAULT NULL,
  `vehicle` varchar(50) DEFAULT NULL,
  `driver` varchar(50) DEFAULT NULL,
  `dphone` varchar(12) DEFAULT NULL,
  `vehicleSize` varchar(50) DEFAULT NULL,
  `transportWeight` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_mng`
--

CREATE TABLE `order_mng` (
  `SKU_Name` varchar(100) NOT NULL,
  `brand_id` varchar(10) NOT NULL,
  `brand_id1` varchar(10) NOT NULL,
  `product_id` varchar(60) NOT NULL,
  `odrQty` int(12) DEFAULT 0,
  `tp` float(10,2) DEFAULT NULL,
  `dp` float(10,2) DEFAULT NULL,
  `pcs_ctn` int(10) DEFAULT NULL,
  `so_id` varchar(50) NOT NULL,
  `route_id` int(50) DEFAULT NULL,
  `db_id` int(50) DEFAULT NULL,
  `region_id` int(50) DEFAULT NULL,
  `area_id` int(50) DEFAULT NULL,
  `teritorry_id` int(50) DEFAULT NULL,
  `orderDate` varchar(13) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_mng_preview`
--

CREATE TABLE `order_mng_preview` (
  `id` int(50) NOT NULL,
  `product_id` varchar(60) NOT NULL,
  `so_id` varchar(50) NOT NULL,
  `route_id` int(50) DEFAULT NULL,
  `db_id` int(50) DEFAULT NULL,
  `region_id` int(50) DEFAULT NULL,
  `area_id` int(50) DEFAULT NULL,
  `teritorry_id` int(50) DEFAULT NULL,
  `orderDate` varchar(13) NOT NULL,
  `status` int(2) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `order_summary_manual`
--

CREATE TABLE `order_summary_manual` (
  `date` date NOT NULL,
  `sr_id` int(11) NOT NULL,
  `dealer_id` int(11) NOT NULL,
  `memo_qty` double NOT NULL,
  `order_amount` double NOT NULL,
  `remarks` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `outlet_category_market`
--

CREATE TABLE `outlet_category_market` (
  `outlet_id` int(8) NOT NULL,
  `brand_id` int(3) NOT NULL,
  `market_size` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `outlet_channel`
--

CREATE TABLE `outlet_channel` (
  `outlet_channel_id` int(2) NOT NULL,
  `outlet_channel_name` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `outlet_created_by`
--

CREATE TABLE `outlet_created_by` (
  `id` int(2) NOT NULL,
  `name` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `outlet_info`
--

CREATE TABLE `outlet_info` (
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `outlet_name` varchar(70) NOT NULL,
  `outlet_name_bangla` varchar(300) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `address` varchar(100) NOT NULL,
  `address_bangla` varchar(300) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `contact_person` varchar(30) NOT NULL,
  `mobile` varchar(30) DEFAULT NULL,
  `avg_sales` double NOT NULL,
  `key_outlet` int(3) NOT NULL,
  `outlet_type` int(3) NOT NULL,
  `shop_sign` int(3) NOT NULL,
  `credit_sales` int(3) NOT NULL,
  `comments` varchar(100) NOT NULL,
  `status` int(2) NOT NULL,
  `shop_sign_amount` double NOT NULL,
  `polyfab_sales` int(3) NOT NULL,
  `created_date` date NOT NULL,
  `created_by` int(2) NOT NULL,
  `shop_type` int(2) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `lati` double NOT NULL,
  `longi` double NOT NULL,
  `updated_by` int(2) NOT NULL,
  `food_outlet` int(1) NOT NULL,
  `b_f_both` int(1) NOT NULL,
  `outlet_channel_id` int(2) NOT NULL,
  `sales_group` varchar(50) NOT NULL,
  `market_size` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `outlet_type`
--

CREATE TABLE `outlet_type` (
  `id` int(2) NOT NULL,
  `type` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_booking`
--

CREATE TABLE `package_booking` (
  `area` varchar(100) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `package_id` int(4) NOT NULL,
  `gift_id` int(4) NOT NULL,
  `sales_value` double NOT NULL,
  `eligible` int(1) NOT NULL,
  `entry_date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `record` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_gift`
--

CREATE TABLE `package_gift` (
  `package_id` int(4) NOT NULL,
  `gift_id` int(4) NOT NULL,
  `gift_name` varchar(200) NOT NULL,
  `details` varchar(200) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `package_offer`
--

CREATE TABLE `package_offer` (
  `package_id` int(4) NOT NULL,
  `package_name` varchar(100) NOT NULL,
  `amount` double NOT NULL,
  `remarks` varchar(200) NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `booking_last_date` date NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_mode`
--

CREATE TABLE `payment_mode` (
  `id` int(2) NOT NULL,
  `pay_mode` varchar(15) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product`
--

CREATE TABLE `product` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `brand_id1` int(2) NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `product_name_bangla` varchar(400) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `unit` varchar(10) NOT NULL,
  `tp` float NOT NULL,
  `dp` float NOT NULL,
  `status` int(2) UNSIGNED ZEROFILL NOT NULL,
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `weight` double NOT NULL,
  `pcs_pack` float NOT NULL,
  `pcs_ctn` float NOT NULL,
  `new` int(2) NOT NULL,
  `offer` int(1) NOT NULL,
  `db_gift_sale` int(1) NOT NULL,
  `open_date` date NOT NULL,
  `close_date` date NOT NULL,
  `active_sms` int(1) NOT NULL,
  `short_name` varchar(50) NOT NULL,
  `no_stock` int(1) NOT NULL,
  `erp_id` varchar(20) NOT NULL,
  `sales_qty_default` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(50) NOT NULL,
  `factoryOne` varchar(50) DEFAULT NULL,
  `factoryTwo` varchar(50) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `productcatSKU`
--

CREATE TABLE `productcatSKU` (
  `id` int(30) NOT NULL,
  `product` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL,
  `skuname` varchar(100) NOT NULL,
  `ItemCode` int(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `productIssue`
--

CREATE TABLE `productIssue` (
  `so_no` varchar(70) NOT NULL,
  `skuname` varchar(70) NOT NULL,
  `factory` varchar(120) NOT NULL,
  `db_id` int(50) NOT NULL,
  `do_no` varchar(70) NOT NULL,
  `issueQty` int(20) NOT NULL,
  `deliverBy` varchar(50) NOT NULL,
  `issue_date` varchar(13) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `productReceived`
--

CREATE TABLE `productReceived` (
  `InventoryName` varchar(50) NOT NULL,
  `product_id` int(50) DEFAULT NULL,
  `category` int(5) UNSIGNED NOT NULL,
  `skuname` varchar(100) NOT NULL,
  `ItemCode` varchar(10) NOT NULL,
  `rcvQty` int(10) NOT NULL,
  `pcs_ctn` int(13) DEFAULT 0,
  `unit` varchar(10) DEFAULT NULL,
  `rcvDate` varchar(12) NOT NULL,
  `rcvBy` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_compt`
--

CREATE TABLE `product_compt` (
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_id_compt` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `tp` float NOT NULL,
  `mrp` float NOT NULL,
  `pcs_pack` int(4) NOT NULL,
  `status` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_depot`
--

CREATE TABLE `product_depot` (
  `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `product_name` varchar(100) NOT NULL,
  `product_name_bangla` varchar(400) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL,
  `tp` float NOT NULL,
  `dp` float NOT NULL,
  `status` int(2) UNSIGNED ZEROFILL NOT NULL,
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `unit` varchar(10) NOT NULL,
  `pcs_per_ctn` float NOT NULL,
  `new` int(2) NOT NULL,
  `status_view` int(2) NOT NULL,
  `ctn_size` varchar(2) NOT NULL,
  `erp_id` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_drive`
--

CREATE TABLE `product_drive` (
  `year_month` varchar(10) NOT NULL,
  `date1` date NOT NULL,
  `date2` date NOT NULL,
  `date_range` varchar(30) NOT NULL,
  `product_id` int(3) NOT NULL,
  `status` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_offer`
--

CREATE TABLE `product_offer` (
  `offer_name` varchar(100) NOT NULL,
  `product_id` int(4) NOT NULL,
  `qty` double NOT NULL,
  `qty_unit` varchar(10) NOT NULL,
  `product_id_offer` int(4) NOT NULL,
  `qty_offer` double NOT NULL,
  `qty_offer_unit` varchar(10) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_offer_bp_many_to_1`
--

CREATE TABLE `product_offer_bp_many_to_1` (
  `v_no` varchar(20) NOT NULL,
  `offer_name` varchar(100) NOT NULL,
  `product_id` varchar(100) NOT NULL,
  `target_amount` double NOT NULL,
  `product_id_offer` int(4) NOT NULL,
  `qty_offer` double NOT NULL,
  `qty_offer_unit` varchar(10) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_offer_category`
--

CREATE TABLE `product_offer_category` (
  `v_no` varchar(20) NOT NULL,
  `offer_name` varchar(100) NOT NULL,
  `category_id1` int(4) NOT NULL,
  `category_id2` int(4) NOT NULL,
  `category_id3` int(4) NOT NULL,
  `category_id4` int(4) NOT NULL,
  `category_id5` int(4) NOT NULL,
  `category_id6` int(4) NOT NULL,
  `amount` double NOT NULL,
  `product_id_offer` int(4) NOT NULL,
  `qty_offer` double NOT NULL,
  `qty_offer_unit` varchar(10) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_offer_mf_many_to_1`
--

CREATE TABLE `product_offer_mf_many_to_1` (
  `v_no` varchar(20) NOT NULL,
  `offer_name` varchar(100) NOT NULL,
  `product_id` varchar(100) NOT NULL,
  `total_sku` int(3) NOT NULL,
  `qty` double NOT NULL,
  `qty_unit` varchar(10) NOT NULL,
  `product_id_offer` int(4) NOT NULL,
  `qty_offer` double NOT NULL,
  `qty_offer_unit` varchar(10) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL,
  `region_id_array` varchar(300) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_offer_region_wise`
--

CREATE TABLE `product_offer_region_wise` (
  `offer_name` varchar(100) NOT NULL,
  `product_id` int(4) NOT NULL,
  `qty` double NOT NULL,
  `qty_unit` varchar(10) NOT NULL,
  `product_id_offer` int(4) NOT NULL,
  `qty_offer` double NOT NULL,
  `qty_offer_unit` varchar(10) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL,
  `region_id_array` varchar(2000) NOT NULL,
  `offer_level` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_offer_tp_perc_region_wise`
--

CREATE TABLE `product_offer_tp_perc_region_wise` (
  `offer_name` varchar(100) NOT NULL,
  `product_id` int(4) NOT NULL,
  `qty` double NOT NULL,
  `qty_unit` varchar(10) NOT NULL,
  `amount_perc` double NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` int(1) NOT NULL,
  `update_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL,
  `region_id_array` varchar(2000) NOT NULL,
  `offer_level` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `region`
--

CREATE TABLE `region` (
  `division_id` int(2) NOT NULL,
  `region_id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `region_name` varchar(50) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `route`
--

CREATE TABLE `route` (
  `route_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `route` varchar(50) NOT NULL,
  `status` int(1) UNSIGNED ZEROFILL NOT NULL,
  `outlet_qty` int(3) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `frequency` int(3) NOT NULL,
  `contribution` int(3) NOT NULL,
  `contribution_mf` int(3) NOT NULL,
  `route_pf` int(1) NOT NULL,
  `add_permit` int(1) NOT NULL,
  `edit_permit` int(1) DEFAULT NULL,
  `sat` varchar(5) NOT NULL,
  `sun` varchar(5) NOT NULL,
  `mon` varchar(5) NOT NULL,
  `tue` varchar(5) NOT NULL,
  `wed` varchar(5) NOT NULL,
  `thu` varchar(5) NOT NULL,
  `fri` varchar(5) NOT NULL,
  `sr_id2` int(4) NOT NULL,
  `sat2` varchar(5) NOT NULL,
  `sun2` varchar(5) NOT NULL,
  `mon2` varchar(5) NOT NULL,
  `tue2` varchar(5) NOT NULL,
  `wed2` varchar(5) NOT NULL,
  `thu2` varchar(5) NOT NULL,
  `fri2` varchar(5) NOT NULL,
  `outletno` int(3) DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rsm`
--

CREATE TABLE `rsm` (
  `id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `name` varchar(30) NOT NULL,
  `pass` varchar(30) NOT NULL,
  `region_id` int(3) NOT NULL,
  `rsm_name` varchar(30) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `doj` date NOT NULL,
  `dor` date NOT NULL,
  `status` int(2) NOT NULL,
  `basic` double NOT NULL,
  `h_rent` double NOT NULL,
  `internet_bill` double NOT NULL,
  `email_id` varchar(40) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `y_ssc` varchar(10) NOT NULL,
  `dob` date NOT NULL,
  `blood` varchar(5) NOT NULL,
  `district` varchar(20) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct_no` varchar(40) NOT NULL,
  `medical` double NOT NULL,
  `others` double NOT NULL,
  `depot_id` int(2) NOT NULL,
  `back_permit` int(4) NOT NULL,
  `sales_org_id` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rsm_assessment`
--

CREATE TABLE `rsm_assessment` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_qty` double NOT NULL,
  `order_amount` double NOT NULL,
  `memo_qty` double NOT NULL,
  `ontime_tso` varchar(3) NOT NULL,
  `ontime_sr` varchar(3) NOT NULL,
  `ontime_dsr` varchar(3) NOT NULL,
  `stacking` varchar(3) NOT NULL,
  `fifo` varchar(3) NOT NULL,
  `space` varchar(3) NOT NULL,
  `sales_tools` varchar(3) NOT NULL,
  `call_presentation` varchar(20) NOT NULL,
  `relation_traders` varchar(20) NOT NULL,
  `outlet_found` varchar(3) NOT NULL,
  `competitor_activities` varchar(500) NOT NULL,
  `visibility_matador` varchar(20) NOT NULL,
  `visibility_others` varchar(20) NOT NULL,
  `dsr_activities` varchar(20) NOT NULL,
  `memo_presentation` varchar(3) NOT NULL,
  `dress_code` varchar(20) NOT NULL,
  `findings` varchar(500) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rsm_attendance`
--

CREATE TABLE `rsm_attendance` (
  `year_month` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `rsm_id` int(2) NOT NULL,
  `attendance_type` varchar(5) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rsm_deduction`
--

CREATE TABLE `rsm_deduction` (
  `year_month` varchar(20) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `deduction` double NOT NULL,
  `no_incentive` int(2) NOT NULL,
  `incentive` double NOT NULL,
  `ta_da` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rsm_salary`
--

CREATE TABLE `rsm_salary` (
  `year_month` varchar(20) NOT NULL,
  `region_id` int(3) NOT NULL,
  `id` int(4) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `doj` date NOT NULL,
  `mwd` int(2) NOT NULL,
  `present` int(2) NOT NULL,
  `leave` int(2) NOT NULL,
  `absent` int(2) NOT NULL,
  `swd` int(2) NOT NULL,
  `wdfs` int(2) NOT NULL,
  `basic` double NOT NULL,
  `h_rent` double NOT NULL,
  `internet_bill` double NOT NULL,
  `gross_salary` double NOT NULL,
  `incentive` double NOT NULL,
  `net_salary` double NOT NULL,
  `medical` double NOT NULL,
  `others` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_invoice`
--

CREATE TABLE `sales_invoice` (
  `date` date NOT NULL,
  `invoice_id` int(8) UNSIGNED ZEROFILL NOT NULL,
  `product_id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `price` double NOT NULL,
  `qty` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_outlet`
--

CREATE TABLE `sales_order_outlet` (
  `date` date NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `category` int(2) NOT NULL,
  `product_id` int(4) NOT NULL,
  `dp` double NOT NULL,
  `tp` double NOT NULL,
  `order_qty` double NOT NULL,
  `order_qty_free` double NOT NULL,
  `order_qty_free_bundle` double NOT NULL,
  `order_qty_free_many_to1` double NOT NULL,
  `order_date_time` datetime NOT NULL,
  `order_update_date_time` datetime NOT NULL,
  `delivery_qty` double NOT NULL,
  `delivery_qty_free` double NOT NULL,
  `delivery_qty_free_bundle` double NOT NULL,
  `delivery_date` date NOT NULL,
  `delivery_date_time` datetime NOT NULL,
  `delivery_by` varchar(20) NOT NULL,
  `status` int(1) NOT NULL,
  `order_remarks` varchar(500) NOT NULL,
  `disc_tp` double NOT NULL,
  `man_disc` double NOT NULL,
  `pay_mode` varchar(20) NOT NULL,
  `receipt_amount_disc` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_outlet_actual`
--

CREATE TABLE `sales_order_outlet_actual` (
  `date` date NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `category` int(2) NOT NULL,
  `product_id` int(4) NOT NULL,
  `dp` double NOT NULL,
  `tp` double NOT NULL,
  `order_qty` double NOT NULL,
  `order_qty_free` double NOT NULL,
  `order_qty_free_bundle` double NOT NULL,
  `order_qty_free_many_to1` double NOT NULL,
  `order_date_time` datetime NOT NULL,
  `order_update_date_time` datetime NOT NULL,
  `delivery_qty` double NOT NULL,
  `delivery_qty_free` double NOT NULL,
  `delivery_qty_free_bundle` double NOT NULL,
  `delivery_date` date NOT NULL,
  `delivery_date_time` datetime NOT NULL,
  `delivery_by` varchar(20) NOT NULL,
  `status` int(1) NOT NULL,
  `order_remarks` varchar(500) NOT NULL,
  `disc_tp` double NOT NULL,
  `man_disc` double NOT NULL,
  `pay_mode` varchar(20) NOT NULL,
  `receipt_amount_disc` float NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_outlet_qc`
--

CREATE TABLE `sales_order_outlet_qc` (
  `date` date NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `category` int(2) NOT NULL,
  `product_id` int(4) NOT NULL,
  `dp` double NOT NULL,
  `tp` double NOT NULL,
  `order_qty` double NOT NULL,
  `order_qty_free` double NOT NULL,
  `order_qty_free_bundle` double NOT NULL,
  `order_qty_free_many_to1` double NOT NULL,
  `order_date_time` datetime NOT NULL,
  `order_update_date_time` datetime NOT NULL,
  `delivery_qty` double NOT NULL,
  `delivery_qty_free` double NOT NULL,
  `delivery_qty_free_bundle` double NOT NULL,
  `delivery_date` date NOT NULL,
  `delivery_date_time` datetime NOT NULL,
  `delivery_by` varchar(20) NOT NULL,
  `status` int(1) NOT NULL,
  `order_remarks` varchar(500) NOT NULL,
  `disc_tp` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_outlet_sku_coverage`
--

CREATE TABLE `sales_order_outlet_sku_coverage` (
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `sr_id` int(6) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `brand_id` int(4) NOT NULL,
  `qty` double NOT NULL,
  `order_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_outlet_today`
--

CREATE TABLE `sales_order_outlet_today` (
  `date` date NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `category` int(2) NOT NULL,
  `product_id` int(4) NOT NULL,
  `dp` double NOT NULL,
  `tp` double NOT NULL,
  `order_qty` double NOT NULL,
  `order_qty_free` double NOT NULL,
  `order_qty_free_bundle` double NOT NULL,
  `order_qty_free_many_to1` double NOT NULL,
  `order_date_time` datetime NOT NULL,
  `order_update_date_time` datetime NOT NULL,
  `delivery_qty` double NOT NULL,
  `delivery_qty_free` double NOT NULL,
  `delivery_qty_free_bundle` double NOT NULL,
  `delivery_date` date NOT NULL,
  `delivery_date_time` datetime NOT NULL,
  `delivery_by` varchar(20) NOT NULL,
  `status` int(1) NOT NULL,
  `order_remarks` varchar(500) NOT NULL,
  `disc_tp` double NOT NULL,
  `man_disc` double NOT NULL,
  `pay_mode` varchar(20) NOT NULL,
  `receipt_amount_disc` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_outlet_today_qc`
--

CREATE TABLE `sales_order_outlet_today_qc` (
  `date` date NOT NULL,
  `sales_org_id` int(2) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_id` int(8) NOT NULL,
  `category` int(2) NOT NULL,
  `product_id` int(4) NOT NULL,
  `dp` double NOT NULL,
  `tp` double NOT NULL,
  `order_qty` double NOT NULL,
  `order_qty_free` double NOT NULL,
  `order_qty_free_bundle` double NOT NULL,
  `order_qty_free_many_to1` double NOT NULL,
  `order_date_time` datetime NOT NULL,
  `order_update_date_time` datetime NOT NULL,
  `delivery_qty` double NOT NULL,
  `delivery_qty_free` double NOT NULL,
  `delivery_qty_free_bundle` double NOT NULL,
  `delivery_date` date NOT NULL,
  `delivery_date_time` datetime NOT NULL,
  `delivery_by` varchar(20) NOT NULL,
  `status` int(1) NOT NULL,
  `order_remarks` varchar(500) NOT NULL,
  `disc_tp` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_remarks`
--

CREATE TABLE `sales_order_remarks` (
  `id` int(2) NOT NULL,
  `remarks` varchar(50) NOT NULL,
  `remarks_bn` varchar(400) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_order_remarks_qc`
--

CREATE TABLE `sales_order_remarks_qc` (
  `id` int(2) NOT NULL,
  `remarks` varchar(50) NOT NULL,
  `remarks_bn` varchar(400) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_org`
--

CREATE TABLE `sales_org` (
  `sales_org_id` int(2) NOT NULL,
  `sales_org_name` varchar(50) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sdbDelivery`
--

CREATE TABLE `sdbDelivery` (
  `id` int(50) NOT NULL,
  `sdb_id` varchar(50) NOT NULL,
  `sku_name` varchar(50) NOT NULL,
  `brand_id` int(10) NOT NULL,
  `company_id` int(3) DEFAULT 6,
  `carton_bag_pc` int(10) DEFAULT NULL,
  `Total_CTN` int(10) DEFAULT 0,
  `Offer_Ctn_PC` int(10) DEFAULT 0,
  `tp` float(10,2) NOT NULL,
  `total_ctn_tp` float(13,2) DEFAULT 0.00,
  `dp` float(10,2) NOT NULL,
  `total_ctn_dp` float(10,2) DEFAULT 0.00,
  `do_no` varchar(100) NOT NULL,
  `offer_note` varchar(200) DEFAULT NULL,
  `deliveryDate` varchar(12) NOT NULL,
  `deliveryRecordedBy` varchar(50) DEFAULT NULL,
  `odp` float(10,2) DEFAULT 0.00,
  `odb_id` varchar(50) DEFAULT NULL,
  `odbNote` varchar(300) DEFAULT NULL,
  `odb_deliver_date` varchar(12) DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `record_date` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shop_sign`
--

CREATE TABLE `shop_sign` (
  `id` int(2) NOT NULL,
  `type` varchar(3) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `shop_type`
--

CREATE TABLE `shop_type` (
  `id` int(2) NOT NULL,
  `type` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `SO_Order`
--

CREATE TABLE `SO_Order` (
  `id` int(50) NOT NULL,
  `product_id` varchar(50) NOT NULL,
  `SKU_Name` varchar(100) DEFAULT NULL,
  `dp_ctn` float(10,2) DEFAULT NULL,
  `pcs_ctn` float(10,2) DEFAULT NULL,
  `orderQty_ctn` int(10) DEFAULT 0,
  `deliveryQty` int(5) DEFAULT 0,
  `discount` int(3) DEFAULT 0,
  `Offer_PC` int(2) DEFAULT NULL,
  `offer_end_date` varchar(12) DEFAULT NULL,
  `so_id` int(50) NOT NULL,
  `region_id` int(50) NOT NULL,
  `area_id` int(50) NOT NULL,
  `teritorry_id` int(50) NOT NULL,
  `sd_id` int(50) NOT NULL,
  `db_id` int(50) DEFAULT NULL,
  `so_no` varchar(100) NOT NULL,
  `next_date` varchar(12) DEFAULT NULL,
  `so_date` varchar(12) DEFAULT NULL,
  `offer_note` text DEFAULT NULL,
  `status` int(2) DEFAULT 0,
  `appvRejectzhId` int(50) DEFAULT NULL,
  `appvRejectacId` int(50) DEFAULT NULL,
  `appvRejectsdId` int(4) DEFAULT 0,
  `deliBy` varchar(100) DEFAULT NULL,
  `factoryOne` varchar(50) DEFAULT NULL,
  `factoryTwo` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr`
--

CREATE TABLE `sr` (
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `dealer_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `sr_id` int(4) NOT NULL,
  `sr_name` varchar(50) NOT NULL,
  `doj` date NOT NULL,
  `deg_id` int(2) NOT NULL,
  `basic` double NOT NULL,
  `ta_da` double NOT NULL,
  `phone_bill` double NOT NULL,
  `meeting_ta` double NOT NULL,
  `meeting_da` double NOT NULL,
  `mobile_no` varchar(20) NOT NULL,
  `status` int(11) NOT NULL,
  `dor` date NOT NULL,
  `company` int(3) NOT NULL,
  `email_id` varchar(40) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `y_ssc` varchar(10) NOT NULL,
  `dob` date NOT NULL,
  `blood` varchar(5) NOT NULL,
  `district` varchar(20) NOT NULL,
  `sr_ballpen` int(2) NOT NULL,
  `sr_mf` int(1) NOT NULL,
  `sr_polyfab` int(2) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct_no` varchar(40) NOT NULL,
  `h_rent` double NOT NULL,
  `medical` double NOT NULL,
  `others` double NOT NULL,
  `remarks` varchar(200) NOT NULL,
  `contribution` int(3) NOT NULL,
  `user_name` varchar(50) NOT NULL,
  `user_pass` varchar(50) NOT NULL,
  `text_data` varchar(30) NOT NULL,
  `name_emergenry` varchar(50) NOT NULL,
  `mobile_no_emergency` varchar(20) NOT NULL,
  `relation` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_assessment`
--

CREATE TABLE `sr_assessment` (
  `sr_id` int(4) NOT NULL,
  `call_presentation` int(2) NOT NULL,
  `shop_relation` int(2) NOT NULL,
  `sku_knowledge` int(2) NOT NULL,
  `timely` int(2) NOT NULL,
  `math_knowledge` int(2) NOT NULL,
  `market_coverage` int(2) NOT NULL,
  `remarks` varchar(300) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_attendance`
--

CREATE TABLE `sr_attendance` (
  `year_month` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `sr_id` int(4) NOT NULL,
  `attendance_type` varchar(10) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_contribution`
--

CREATE TABLE `sr_contribution` (
  `sr_id` int(4) NOT NULL,
  `brand_id` int(2) NOT NULL,
  `contribution` float NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_exclucive`
--

CREATE TABLE `sr_exclucive` (
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `teritorry_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `sr_id` varchar(10) NOT NULL,
  `sr_name` varchar(50) NOT NULL,
  `doj` date NOT NULL,
  `deg_id` int(2) NOT NULL,
  `basic` double NOT NULL,
  `ta_da` double NOT NULL,
  `phone_bill` double NOT NULL,
  `meeting_ta` double NOT NULL,
  `meeting_da` double NOT NULL,
  `mobile_no` varchar(20) NOT NULL,
  `status` int(11) NOT NULL,
  `dor` date NOT NULL,
  `company` int(3) NOT NULL,
  `email_id` varchar(40) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `y_ssc` varchar(10) NOT NULL,
  `dob` date NOT NULL,
  `blood` varchar(5) NOT NULL,
  `district` varchar(20) NOT NULL,
  `sr_ballpen` int(2) NOT NULL,
  `sr_polyfab` int(2) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct_no` varchar(40) NOT NULL,
  `id` int(5) UNSIGNED ZEROFILL NOT NULL,
  `h_rent` double NOT NULL,
  `medical` double NOT NULL,
  `others` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_salary`
--

CREATE TABLE `sr_salary` (
  `year_month` varchar(20) NOT NULL,
  `region_id` int(3) NOT NULL,
  `teritorry_id` int(4) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `doj` date NOT NULL,
  `mwd` int(2) NOT NULL,
  `present` int(2) NOT NULL,
  `leave` int(2) NOT NULL,
  `absent` int(2) NOT NULL,
  `swd` int(2) NOT NULL,
  `wdfs` int(2) NOT NULL,
  `basic` double NOT NULL,
  `ta_da` double NOT NULL,
  `phone_bill` double NOT NULL,
  `meeting_ta` double NOT NULL,
  `meeting_da` double NOT NULL,
  `gross_salary` double NOT NULL,
  `incentive` double NOT NULL,
  `net_salary` double NOT NULL,
  `h_rent` double NOT NULL,
  `medical` double NOT NULL,
  `others` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_special_incen_deduc`
--

CREATE TABLE `sr_special_incen_deduc` (
  `year_month` varchar(20) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `incentive` double NOT NULL,
  `deduction` double NOT NULL,
  `adjustment` double NOT NULL,
  `loan_deduct` double NOT NULL,
  `no_incentive` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_target`
--

CREATE TABLE `sr_target` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `sr_id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `route_id` int(6) NOT NULL,
  `product_id` int(3) NOT NULL,
  `qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `asm_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sr_target_info`
--

CREATE TABLE `sr_target_info` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `sr_id` int(11) NOT NULL,
  `pc` double NOT NULL,
  `tls` double NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `no_incentive` int(2) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `rsm_id` int(4) NOT NULL,
  `cpc` double NOT NULL,
  `asm_id` int(4) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `superDistributor`
--

CREATE TABLE `superDistributor` (
  `id` int(30) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `sd_name` varchar(150) NOT NULL,
  `pr_name` varchar(50) NOT NULL,
  `address` varchar(200) NOT NULL,
  `business_investment` int(20) NOT NULL,
  `divission_id` int(20) NOT NULL,
  `region_id` int(20) NOT NULL,
  `zone_id` int(20) NOT NULL,
  `ah_name` varchar(50) NOT NULL,
  `regiDate` varchar(12) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_competitor`
--

CREATE TABLE `survey_competitor` (
  `outlet_id` int(8) NOT NULL,
  `outlet_class` varchar(5) NOT NULL,
  `create_by` varchar(20) NOT NULL,
  `create_date` date NOT NULL,
  `create_date_time` datetime NOT NULL,
  `update_by` varchar(20) NOT NULL,
  `update_date` date NOT NULL,
  `update_date_time` datetime NOT NULL,
  `rso_pusti` double NOT NULL,
  `rso_rupchanda` double NOT NULL,
  `rso_teer` double NOT NULL,
  `rso_fresh` double NOT NULL,
  `rso_bashundhara` double NOT NULL,
  `rso_others` double NOT NULL,
  `spo_family` double NOT NULL,
  `spo_mizan` double NOT NULL,
  `spo_pure` double NOT NULL,
  `spo_natural` double NOT NULL,
  `spo_others` double NOT NULL,
  `m_oil_pusti` double NOT NULL,
  `m_oil_rupchanda` double NOT NULL,
  `m_oil_radhuni` double NOT NULL,
  `m_oil_teer` double NOT NULL,
  `m_oil_fresh` double NOT NULL,
  `m_oil_suresh` double NOT NULL,
  `m_oil_others` double NOT NULL,
  `atta_pusti` double NOT NULL,
  `atta_teer` double NOT NULL,
  `atta_fresh` double NOT NULL,
  `atta_aci_pure` double NOT NULL,
  `atta_sunshine` double NOT NULL,
  `atta_bashundhara` double NOT NULL,
  `atta_others` double NOT NULL,
  `maida_pusti` double NOT NULL,
  `maida_teer` double NOT NULL,
  `maida_fresh` double NOT NULL,
  `maida_aci_pure` double NOT NULL,
  `maida_bashundhara` double NOT NULL,
  `maida_others` double NOT NULL,
  `tea_h_h_pusti_bl` double NOT NULL,
  `tea_h_h_pusti_horeca` double NOT NULL,
  `tea_h_h_ismapahi` double NOT NULL,
  `tea_h_h_taaza` double NOT NULL,
  `tea_h_h_seylon` double NOT NULL,
  `tea_h_h_tetli` double NOT NULL,
  `tea_h_h_others` double NOT NULL,
  `tea_horeca_pusti_bl` double NOT NULL,
  `tea_horeca_pusti_horeca` double NOT NULL,
  `tea_horeca_ismapahi` double NOT NULL,
  `tea_horeca_taaza` double NOT NULL,
  `tea_horeca_seylon` double NOT NULL,
  `tea_horeca_tetli` double NOT NULL,
  `tea_horeca_others` double NOT NULL,
  `tea_bag_pusti_bl` double NOT NULL,
  `tea_bag_pusti_horeca` double NOT NULL,
  `tea_bag_ismapahi` double NOT NULL,
  `tea_bag_taaza` double NOT NULL,
  `tea_bag_seylon` double NOT NULL,
  `tea_bag_tetli` double NOT NULL,
  `tea_bag_others` double NOT NULL,
  `suji_pusti` double NOT NULL,
  `suji_teer` double NOT NULL,
  `suji_aci_pure` double NOT NULL,
  `suji_bashundhara` double NOT NULL,
  `suji_fresh` double NOT NULL,
  `suji_others` double NOT NULL,
  `moshur_dal_pusti` double NOT NULL,
  `moshur_dal_teer` double NOT NULL,
  `moshur_dal_fresh` double NOT NULL,
  `moshur_dal_aci` double NOT NULL,
  `moshur_dal_pran` double NOT NULL,
  `moshur_dal_others` double NOT NULL,
  `puffed_rice_pusti` double NOT NULL,
  `puffed_rice_square_ruchi` double NOT NULL,
  `puffed_rice_pran` double NOT NULL,
  `puffed_rice_bashundhara` double NOT NULL,
  `puffed_rice_bd` double NOT NULL,
  `puffed_rice_others` double NOT NULL,
  `milk_powder_pusti` double NOT NULL,
  `milk_powder_dano` double NOT NULL,
  `milk_powder_diploma` double NOT NULL,
  `milk_powder_starship` double NOT NULL,
  `milk_powder_marks` double NOT NULL,
  `milk_powder_others` double NOT NULL,
  `dinking_water_pusti` double NOT NULL,
  `dinking_water_mum` double NOT NULL,
  `dinking_water_pran` double NOT NULL,
  `dinking_water_kinle` double NOT NULL,
  `dinking_water_aquafina` double NOT NULL,
  `dinking_water_fresh` double NOT NULL,
  `dinking_water_others` double NOT NULL,
  `a_rice_pusti` double NOT NULL,
  `a_rice_pran` double NOT NULL,
  `a_rice_square_chashi` double NOT NULL,
  `a_rice_teer` double NOT NULL,
  `a_rice_fresh` double NOT NULL,
  `a_rice_others` double NOT NULL,
  `honey_pusti` double NOT NULL,
  `honey_pran` double NOT NULL,
  `honey_ap` double NOT NULL,
  `honey_hamdard` double NOT NULL,
  `honey_dabur` double NOT NULL,
  `honey_others` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_dealer_doc_availability`
--

CREATE TABLE `survey_dealer_doc_availability` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `roi` varchar(30) NOT NULL,
  `attendence_sheet` varchar(30) NOT NULL,
  `sales_stock_register` varchar(30) NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_dealer_investment`
--

CREATE TABLE `survey_dealer_investment` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `floor_stock` double NOT NULL,
  `undelivered_qty` double NOT NULL,
  `payment_transit` double NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_dealer_logistic_availability`
--

CREATE TABLE `survey_dealer_logistic_availability` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `smart_phone` varchar(30) NOT NULL,
  `laptop` varchar(30) NOT NULL,
  `printer` varchar(30) NOT NULL,
  `internet` varchar(20) NOT NULL,
  `printing_paper` varchar(20) NOT NULL,
  `sr_qty_allow` int(10) NOT NULL,
  `sr_qty_exist` int(10) NOT NULL,
  `manager_qty_exist` int(10) NOT NULL,
  `dsr_qty_exist` int(10) NOT NULL,
  `driver_qty_exist` int(10) NOT NULL,
  `staff_qty_exist` int(10) NOT NULL,
  `van_qty_auto` int(10) NOT NULL,
  `van_qty_manual` int(10) NOT NULL,
  `loading_facility` varchar(10) NOT NULL,
  `sufficient_store_space` varchar(10) NOT NULL,
  `warehouse_environment` varchar(10) NOT NULL,
  `fifo_maintain` varchar(10) NOT NULL,
  `lifo_maintain` varchar(10) NOT NULL,
  `delivery_execution_remarks` varchar(200) NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_dealer_other_issues`
--

CREATE TABLE `survey_dealer_other_issues` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `audited_with_name` varchar(50) NOT NULL,
  `audited_with_desig` varchar(20) NOT NULL,
  `audited_with_mobile` varchar(20) NOT NULL,
  `remarks` varchar(300) NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_dealer_sku_complain`
--

CREATE TABLE `survey_dealer_sku_complain` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `brand_id` int(3) NOT NULL,
  `complain_qty` double NOT NULL,
  `status` varchar(20) NOT NULL,
  `remarks` varchar(200) NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_dealer_stock`
--

CREATE TABLE `survey_dealer_stock` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `product_id` int(4) NOT NULL,
  `stock_qty` double NOT NULL,
  `audit_qty` double NOT NULL,
  `dp` float NOT NULL,
  `tp` float NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `survey_sr_activities`
--

CREATE TABLE `survey_sr_activities` (
  `year_month` varchar(8) NOT NULL,
  `date` date NOT NULL,
  `dealer_id` int(6) NOT NULL,
  `sr_id` int(6) NOT NULL,
  `dress_code` varchar(25) NOT NULL,
  `attitude` varchar(25) NOT NULL,
  `physical_violence` varchar(25) NOT NULL,
  `loality` varchar(25) NOT NULL,
  `relationship_maintain` varchar(25) NOT NULL,
  `professionally_equipt` varchar(25) NOT NULL,
  `audit_by` varchar(20) NOT NULL,
  `lati` varchar(30) NOT NULL,
  `longi` varchar(30) NOT NULL,
  `entry_date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teritorry`
--

CREATE TABLE `teritorry` (
  `region_id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `area_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `teritorry_id` int(4) UNSIGNED ZEROFILL NOT NULL,
  `teritorry_name` varchar(50) NOT NULL,
  `status` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `teritorry_incentive`
--

CREATE TABLE `teritorry_incentive` (
  `tso_id` int(4) NOT NULL,
  `year_month` varchar(20) NOT NULL,
  `outlet_target` double NOT NULL,
  `outlet_inc` double NOT NULL,
  `lpc_target` float NOT NULL,
  `lpc_ach` float NOT NULL,
  `pro_call_target` double NOT NULL,
  `pro_call_ach` double NOT NULL,
  `doc_keeping` double NOT NULL,
  `no_incentive` int(2) NOT NULL,
  `date` date NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `thanas`
--

CREATE TABLE `thanas` (
  `thana_id` int(11) NOT NULL,
  `thana_name` varchar(255) NOT NULL,
  `district_id` int(11) NOT NULL,
  `status` int(11) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `time_pass`
--

CREATE TABLE `time_pass` (
  `id` int(6) UNSIGNED ZEROFILL NOT NULL,
  `year_month` varchar(20) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `day` int(2) DEFAULT NULL,
  `holiday` int(11) DEFAULT NULL,
  `month_days` int(2) DEFAULT NULL,
  `holiday_mark` int(1) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tmr_running`
--

CREATE TABLE `tmr_running` (
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trade_program`
--

CREATE TABLE `trade_program` (
  `trade_id` varchar(15) NOT NULL,
  `title` varchar(50) NOT NULL,
  `program_details` varchar(50) NOT NULL,
  `date1` date NOT NULL,
  `date2` date NOT NULL,
  `program_category` varchar(50) NOT NULL,
  `program_nature` varchar(200) NOT NULL,
  `region_id` int(3) NOT NULL,
  `product_id` int(4) NOT NULL,
  `sales_projection` double NOT NULL,
  `remarks` varchar(200) NOT NULL,
  `date_time` datetime NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transport`
--

CREATE TABLE `transport` (
  `transport_id` int(3) NOT NULL,
  `transport_name` varchar(100) NOT NULL,
  `transportWeight` varchar(50) NOT NULL,
  `transportFeet` varchar(50) DEFAULT NULL,
  `address` varchar(200) NOT NULL,
  `contact` varchar(50) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `transport_area`
--

CREATE TABLE `transport_area` (
  `trans_area_id` int(2) NOT NULL,
  `trans_area_name` varchar(50) NOT NULL,
  `status` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tso`
--

CREATE TABLE `tso` (
  `tso_id` int(5) UNSIGNED ZEROFILL NOT NULL,
  `user_name` varchar(30) NOT NULL,
  `user_pass` varchar(30) NOT NULL,
  `teritorry_id` int(5) UNSIGNED ZEROFILL NOT NULL,
  `com_id` int(2) UNSIGNED ZEROFILL NOT NULL,
  `name` varchar(30) NOT NULL,
  `mobile` varchar(20) NOT NULL,
  `doj` date NOT NULL,
  `dor` date NOT NULL,
  `status` int(2) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `basic` double NOT NULL,
  `ta_da` double NOT NULL,
  `internet_bill` double NOT NULL,
  `others` double NOT NULL,
  `meeting_exp` double NOT NULL,
  `email_id` varchar(40) NOT NULL,
  `h_degree` varchar(50) NOT NULL,
  `y_ssc` varchar(10) NOT NULL,
  `dob` date NOT NULL,
  `blood` varchar(5) NOT NULL,
  `district` varchar(20) NOT NULL,
  `bank_id` int(2) NOT NULL,
  `bank_acct_no` varchar(40) NOT NULL,
  `h_rent` double NOT NULL,
  `medical` double NOT NULL,
  `city_allowance` double NOT NULL,
  `sales_org_id` int(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tso_assessment`
--

CREATE TABLE `tso_assessment` (
  `year_month` varchar(10) NOT NULL,
  `date` date NOT NULL,
  `tso_id` int(4) NOT NULL,
  `dealer_id` int(4) NOT NULL,
  `sr_id` int(4) NOT NULL,
  `route_id` int(6) NOT NULL,
  `outlet_qty` double NOT NULL,
  `order_amount` double NOT NULL,
  `memo_qty` double NOT NULL,
  `ontime_sr` varchar(3) NOT NULL,
  `stacking` varchar(3) NOT NULL,
  `fifo` varchar(3) NOT NULL,
  `space` varchar(3) NOT NULL,
  `sales_tools` varchar(3) NOT NULL,
  `call_presentation` varchar(20) NOT NULL,
  `relation_traders` varchar(20) NOT NULL,
  `outlet_found` varchar(3) NOT NULL,
  `competitor_activities` varchar(200) NOT NULL,
  `dsr_activities` varchar(20) NOT NULL,
  `memo_presentation` varchar(3) NOT NULL,
  `dress_code` varchar(20) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tso_attendance`
--

CREATE TABLE `tso_attendance` (
  `year_month` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `tso_id` int(4) NOT NULL,
  `attendance_type` varchar(5) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tso_deduction`
--

CREATE TABLE `tso_deduction` (
  `year_month` varchar(20) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `deduction` double NOT NULL,
  `no_incentive` int(2) NOT NULL,
  `incentive` double NOT NULL,
  `actual_ta_da` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tso_salary`
--

CREATE TABLE `tso_salary` (
  `year_month` varchar(20) NOT NULL,
  `region_id` int(3) NOT NULL,
  `teritorry_id` int(4) NOT NULL,
  `tso_id` int(4) NOT NULL,
  `deg_id` int(2) NOT NULL,
  `doj` date NOT NULL,
  `mwd` int(2) NOT NULL,
  `present` int(2) NOT NULL,
  `leave` int(2) NOT NULL,
  `absent` int(2) NOT NULL,
  `swd` int(2) NOT NULL,
  `wdfs` int(2) NOT NULL,
  `basic` double NOT NULL,
  `ta_da` double NOT NULL,
  `internet_bill` double NOT NULL,
  `others` double NOT NULL,
  `meeting_exp` double NOT NULL,
  `gross_salary` double NOT NULL,
  `incentive` double NOT NULL,
  `net_salary` double NOT NULL,
  `h_rent` double NOT NULL,
  `medical` double NOT NULL,
  `city_allowance` double NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `unit`
--

CREATE TABLE `unit` (
  `unit` varchar(10) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(3) UNSIGNED ZEROFILL NOT NULL,
  `name` varchar(20) NOT NULL,
  `pass` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `user_type` int(2) NOT NULL,
  `permit_master` int(1) NOT NULL,
  `permit_product_master` int(1) NOT NULL,
  `permit_product_view` int(1) NOT NULL,
  `permit_route_register` int(1) NOT NULL,
  `permit_dashboard` int(1) NOT NULL,
  `permit_dashboard_top` int(1) NOT NULL,
  `permit_kpi_setup` int(1) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_visit`
--

CREATE TABLE `user_visit` (
  `date` date NOT NULL,
  `visit_area` varchar(100) NOT NULL,
  `user_id` int(3) NOT NULL,
  `description` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `date_time` datetime NOT NULL,
  `subject` varchar(200) NOT NULL,
  `recommend` text CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci NOT NULL,
  `restricted` int(2) NOT NULL,
  `doc_no` varchar(20) NOT NULL,
  `document_name` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_dealer_order`
--

CREATE TABLE `voucher_no_dealer_order` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_depot_challan`
--

CREATE TABLE `voucher_no_depot_challan` (
  `v_no` varchar(15) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_depot_delivery`
--

CREATE TABLE `voucher_no_depot_delivery` (
  `v_no` varchar(15) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(15) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_depot_order`
--

CREATE TABLE `voucher_no_depot_order` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_depot_received`
--

CREATE TABLE `voucher_no_depot_received` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_offer`
--

CREATE TABLE `voucher_no_offer` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `voucher_no_transport_challan`
--

CREATE TABLE `voucher_no_transport_challan` (
  `v_no` varchar(20) NOT NULL,
  `date` date NOT NULL,
  `date_time` datetime NOT NULL,
  `user` varchar(30) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `yes_no`
--

CREATE TABLE `yes_no` (
  `id` int(2) NOT NULL,
  `type` varchar(2) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `AppUser`
--
ALTER TABLE `AppUser`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `area`
--
ALTER TABLE `area`
  ADD PRIMARY KEY (`area_id`),
  ADD UNIQUE KEY `area_name` (`area_name`),
  ADD KEY `region_id` (`region_id`),
  ADD KEY `status` (`status`);

--
-- Indexes for table `asm`
--
ALTER TABLE `asm`
  ADD PRIMARY KEY (`asm_id`),
  ADD UNIQUE KEY `name` (`user_name`),
  ADD UNIQUE KEY `user_name` (`user_name`);

--
-- Indexes for table `asm_attendance`
--
ALTER TABLE `asm_attendance`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `tso_id` (`asm_id`),
  ADD KEY `attendance_type` (`attendance_type`);

--
-- Indexes for table `attendance_type`
--
ALTER TABLE `attendance_type`
  ADD PRIMARY KEY (`attendance_type`),
  ADD KEY `attendance_details` (`attendance_details`);

--
-- Indexes for table `audit`
--
ALTER TABLE `audit`
  ADD KEY `date` (`date`),
  ADD KEY `category` (`category`),
  ADD KEY `user` (`user`);

--
-- Indexes for table `auditor`
--
ALTER TABLE `auditor`
  ADD PRIMARY KEY (`i`);

--
-- Indexes for table `bank`
--
ALTER TABLE `bank`
  ADD PRIMARY KEY (`bank_id`),
  ADD UNIQUE KEY `bank_name` (`bank_name`);

--
-- Indexes for table `bank_name`
--
ALTER TABLE `bank_name`
  ADD PRIMARY KEY (`bank_id`),
  ADD UNIQUE KEY `bank_name` (`bank_name`);

--
-- Indexes for table `brand`
--
ALTER TABLE `brand`
  ADD PRIMARY KEY (`brand_id`),
  ADD UNIQUE KEY `brand_name` (`brand_name`);

--
-- Indexes for table `brand1`
--
ALTER TABLE `brand1`
  ADD PRIMARY KEY (`brand_id`),
  ADD UNIQUE KEY `brand_name` (`brand_name`),
  ADD KEY `brand_name_2` (`brand_name`),
  ADD KEY `type` (`type`);

--
-- Indexes for table `brand_mf`
--
ALTER TABLE `brand_mf`
  ADD PRIMARY KEY (`brand_id`),
  ADD UNIQUE KEY `brand_name` (`brand_name`);

--
-- Indexes for table `brand_pf`
--
ALTER TABLE `brand_pf`
  ADD PRIMARY KEY (`brand_id`),
  ADD UNIQUE KEY `brand_name` (`brand_name`);

--
-- Indexes for table `brand_pf_depot`
--
ALTER TABLE `brand_pf_depot`
  ADD PRIMARY KEY (`brand_id`),
  ADD UNIQUE KEY `brand_name` (`brand_name`);

--
-- Indexes for table `company`
--
ALTER TABLE `company`
  ADD PRIMARY KEY (`com_id`);

--
-- Indexes for table `credit_sales`
--
ALTER TABLE `credit_sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type` (`type`);

--
-- Indexes for table `data`
--
ALTER TABLE `data`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `rsm_id` (`rsm_id`);

--
-- Indexes for table `data_daily_dealer`
--
ALTER TABLE `data_daily_dealer`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `rsm_id` (`rsm_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `order_date` (`order_date`),
  ADD KEY `sales_type` (`sales_type`),
  ADD KEY `dsr_id` (`dsr_id`),
  ADD KEY `date_2` (`date`),
  ADD KEY `asm_id` (`asm_id`);

--
-- Indexes for table `data_daily_info`
--
ALTER TABLE `data_daily_info`
  ADD KEY `date` (`date`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `rsm_id` (`rsm_id`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `order_date` (`order_date`),
  ADD KEY `dsr_id` (`dsr_id`),
  ADD KEY `asm_id` (`asm_id`);

--
-- Indexes for table `db_so`
--
ALTER TABLE `db_so`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `dealer`
--
ALTER TABLE `dealer`
  ADD PRIMARY KEY (`dealer_id`),
  ADD UNIQUE KEY `dealer_name` (`dealer_name`),
  ADD UNIQUE KEY `dealer_name_2` (`dealer_name`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `teritorry_id` (`teritorry_id`),
  ADD KEY `status` (`status`),
  ADD KEY `printer_exist` (`printer_exist`),
  ADD KEY `pc_exist` (`pc_exist`),
  ADD KEY `proprietor_dob` (`proprietor_dob`),
  ADD KEY `mobile` (`mobile_alt`),
  ADD KEY `direct_sales` (`direct_sales`);

--
-- Indexes for table `dealer_daily_collection`
--
ALTER TABLE `dealer_daily_collection`
  ADD KEY `asm_id` (`asm_id`);

--
-- Indexes for table `dealer_order`
--
ALTER TABLE `dealer_order`
  ADD KEY `date` (`date`),
  ADD KEY `v_no` (`v_no`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `posted_erp` (`posted_erp`),
  ADD KEY `posted_by` (`posted_by`),
  ADD KEY `sales_org_id` (`sales_org_id`);

--
-- Indexes for table `dealer_order_info`
--
ALTER TABLE `dealer_order_info`
  ADD KEY `date` (`date`),
  ADD KEY `v_no` (`v_no`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `bank_deposit_date` (`bank_deposit_date`),
  ADD KEY `posted_erp` (`posted_erp`),
  ADD KEY `bank_id` (`bank_id`),
  ADD KEY `sales_org_id` (`sales_org_id`),
  ADD KEY `bank_clearance_acct` (`bank_clearance_acct`),
  ADD KEY `only_on_line` (`only_on_line`);

--
-- Indexes for table `dealer_received`
--
ALTER TABLE `dealer_received`
  ADD KEY `date` (`date`),
  ADD KEY `year_month_2` (`year_month`);

--
-- Indexes for table `dealer_stock`
--
ALTER TABLE `dealer_stock`
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `dealer_target_landing`
--
ALTER TABLE `dealer_target_landing`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `dealer_id` (`dealer_id`);

--
-- Indexes for table `dealer_target_secondary`
--
ALTER TABLE `dealer_target_secondary`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `rsm_id` (`rsm_id`);

--
-- Indexes for table `deliSchedule`
--
ALTER TABLE `deliSchedule`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `DeliveryTr`
--
ALTER TABLE `DeliveryTr`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `DemandTr`
--
ALTER TABLE `DemandTr`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `department`
--
ALTER TABLE `department`
  ADD PRIMARY KEY (`dep_id`),
  ADD UNIQUE KEY `dep_name` (`dep_name`);

--
-- Indexes for table `depot`
--
ALTER TABLE `depot`
  ADD PRIMARY KEY (`depot_id`),
  ADD UNIQUE KEY `depot_name` (`depot_name`);

--
-- Indexes for table `depot_challan`
--
ALTER TABLE `depot_challan`
  ADD KEY `v_no` (`v_no`),
  ADD KEY `date` (`date`),
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `challan_no` (`challan_no`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `batch` (`batch`);

--
-- Indexes for table `depot_challan_upload`
--
ALTER TABLE `depot_challan_upload`
  ADD KEY `batch` (`batch`);

--
-- Indexes for table `depot_delivery`
--
ALTER TABLE `depot_delivery`
  ADD KEY `v_no` (`v_no`),
  ADD KEY `v_no_challan` (`v_no_challan`),
  ADD KEY `date` (`date`),
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `challan_no` (`challan_no`),
  ADD KEY `dealer_received_date` (`dealer_received_date`),
  ADD KEY `challan_date` (`challan_date`),
  ADD KEY `transport_id` (`transport_id`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `batch` (`batch`);

--
-- Indexes for table `depot_order`
--
ALTER TABLE `depot_order`
  ADD KEY `v_no` (`v_no`),
  ADD KEY `date` (`date`),
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `posted_erp` (`posted_erp`),
  ADD KEY `sales_org_id` (`sales_org_id`);

--
-- Indexes for table `depot_received`
--
ALTER TABLE `depot_received`
  ADD KEY `v_no` (`v_no`),
  ADD KEY `date` (`date`),
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `challan_no` (`challan_no`),
  ADD KEY `post` (`post`),
  ADD KEY `order_no` (`order_no`),
  ADD KEY `year_month_2` (`year_month`);

--
-- Indexes for table `depot_stock`
--
ALTER TABLE `depot_stock`
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `depot_transport_challan`
--
ALTER TABLE `depot_transport_challan`
  ADD KEY `v_no` (`v_no`),
  ADD KEY `date` (`date`),
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `transport_id` (`transport_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_erp_id` (`product_erp_id`),
  ADD KEY `delivery_man_id` (`delivery_man_id`);

--
-- Indexes for table `depot_transport_dealer_scan`
--
ALTER TABLE `depot_transport_dealer_scan`
  ADD KEY `v_no` (`v_no`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `depot_id` (`depot_id`),
  ADD KEY `transport_id` (`transport_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_erp_id` (`product_erp_id`);

--
-- Indexes for table `designation`
--
ALTER TABLE `designation`
  ADD PRIMARY KEY (`deg_id`),
  ADD UNIQUE KEY `deg_name` (`deg_name`);

--
-- Indexes for table `Discountconditio`
--
ALTER TABLE `Discountconditio`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `Discounts`
--
ALTER TABLE `Discounts`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `districts`
--
ALTER TABLE `districts`
  ADD PRIMARY KEY (`district_id`);

--
-- Indexes for table `division`
--
ALTER TABLE `division`
  ADD PRIMARY KEY (`division_id`),
  ADD UNIQUE KEY `division_name` (`division_name`);

--
-- Indexes for table `document`
--
ALTER TABLE `document`
  ADD UNIQUE KEY `document_name` (`document_name`);

--
-- Indexes for table `dsr`
--
ALTER TABLE `dsr`
  ADD PRIMARY KEY (`dsr_id`);

--
-- Indexes for table `invoice_no`
--
ALTER TABLE `invoice_no`
  ADD PRIMARY KEY (`invoice_id`);

--
-- Indexes for table `key_outlet`
--
ALTER TABLE `key_outlet`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type` (`type`);

--
-- Indexes for table `memoLineCat`
--
ALTER TABLE `memoLineCat`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `memoLineCatDelivery`
--
ALTER TABLE `memoLineCatDelivery`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `multiBankOrderInfo`
--
ALTER TABLE `multiBankOrderInfo`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notice`
--
ALTER TABLE `notice`
  ADD PRIMARY KEY (`sn`);

--
-- Indexes for table `offerCondition`
--
ALTER TABLE `offerCondition`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `offer_level`
--
ALTER TABLE `offer_level`
  ADD PRIMARY KEY (`id`),
  ADD KEY `offer_level` (`offer_level`),
  ADD KEY `status` (`status`);

--
-- Indexes for table `OrderDelivery`
--
ALTER TABLE `OrderDelivery`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `order_mng_preview`
--
ALTER TABLE `order_mng_preview`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `order_summary_manual`
--
ALTER TABLE `order_summary_manual`
  ADD KEY `date` (`date`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `dealer_id` (`dealer_id`);

--
-- Indexes for table `outlet_category_market`
--
ALTER TABLE `outlet_category_market`
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `brand_id` (`brand_id`);

--
-- Indexes for table `outlet_channel`
--
ALTER TABLE `outlet_channel`
  ADD PRIMARY KEY (`outlet_channel_id`),
  ADD UNIQUE KEY `outlet_channel_name` (`outlet_channel_name`);

--
-- Indexes for table `outlet_created_by`
--
ALTER TABLE `outlet_created_by`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `outlet_info`
--
ALTER TABLE `outlet_info`
  ADD PRIMARY KEY (`outlet_id`),
  ADD UNIQUE KEY `mobile` (`mobile`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `status` (`status`),
  ADD KEY `food_outlet` (`food_outlet`),
  ADD KEY `b_f_both` (`b_f_both`),
  ADD KEY `outlet_channel_id` (`outlet_channel_id`),
  ADD KEY `sales_group` (`sales_group`);
ALTER TABLE `outlet_info` ADD FULLTEXT KEY `mobile_2` (`mobile`);
ALTER TABLE `outlet_info` ADD FULLTEXT KEY `mobile_3` (`mobile`);

--
-- Indexes for table `outlet_type`
--
ALTER TABLE `outlet_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type` (`type`);

--
-- Indexes for table `package_gift`
--
ALTER TABLE `package_gift`
  ADD PRIMARY KEY (`gift_id`);

--
-- Indexes for table `package_offer`
--
ALTER TABLE `package_offer`
  ADD PRIMARY KEY (`package_id`);

--
-- Indexes for table `payment_mode`
--
ALTER TABLE `payment_mode`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pay_mode` (`pay_mode`),
  ADD KEY `status` (`status`);

--
-- Indexes for table `product`
--
ALTER TABLE `product`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `product_name` (`product_name`),
  ADD KEY `brand_id` (`brand_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `erp_id` (`erp_id`),
  ADD KEY `brand_id1` (`brand_id1`),
  ADD KEY `update_by` (`update_by`);

--
-- Indexes for table `productcatSKU`
--
ALTER TABLE `productcatSKU`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_compt`
--
ALTER TABLE `product_compt`
  ADD PRIMARY KEY (`product_id_compt`),
  ADD UNIQUE KEY `product_name` (`product_name`);

--
-- Indexes for table `product_depot`
--
ALTER TABLE `product_depot`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `product_name` (`product_name`),
  ADD KEY `brand_id` (`brand_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `erp_id` (`erp_id`);

--
-- Indexes for table `product_offer`
--
ALTER TABLE `product_offer`
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_id_offer` (`product_id_offer`),
  ADD KEY `status` (`status`),
  ADD KEY `start_date` (`start_date`),
  ADD KEY `end_date` (`end_date`);

--
-- Indexes for table `product_offer_bp_many_to_1`
--
ALTER TABLE `product_offer_bp_many_to_1`
  ADD PRIMARY KEY (`v_no`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_id_offer` (`product_id_offer`),
  ADD KEY `status` (`status`),
  ADD KEY `start_date` (`start_date`),
  ADD KEY `end_date` (`end_date`);

--
-- Indexes for table `product_offer_category`
--
ALTER TABLE `product_offer_category`
  ADD PRIMARY KEY (`v_no`),
  ADD KEY `product_id` (`category_id1`),
  ADD KEY `product_id_offer` (`product_id_offer`),
  ADD KEY `status` (`status`),
  ADD KEY `category_id1` (`category_id1`),
  ADD KEY `category_id2` (`category_id2`),
  ADD KEY `category_id3` (`category_id3`),
  ADD KEY `category_id4` (`category_id4`),
  ADD KEY `category_id5` (`category_id5`),
  ADD KEY `category_id6` (`category_id6`);

--
-- Indexes for table `product_offer_mf_many_to_1`
--
ALTER TABLE `product_offer_mf_many_to_1`
  ADD PRIMARY KEY (`v_no`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_id_offer` (`product_id_offer`),
  ADD KEY `status` (`status`),
  ADD KEY `start_date` (`start_date`),
  ADD KEY `end_date` (`end_date`);

--
-- Indexes for table `product_offer_region_wise`
--
ALTER TABLE `product_offer_region_wise`
  ADD KEY `product_id` (`product_id`),
  ADD KEY `product_id_offer` (`product_id_offer`),
  ADD KEY `status` (`status`),
  ADD KEY `start_date` (`start_date`),
  ADD KEY `end_date` (`end_date`),
  ADD KEY `offer_level` (`offer_level`);

--
-- Indexes for table `product_offer_tp_perc_region_wise`
--
ALTER TABLE `product_offer_tp_perc_region_wise`
  ADD KEY `product_id` (`product_id`),
  ADD KEY `status` (`status`),
  ADD KEY `start_date` (`start_date`),
  ADD KEY `end_date` (`end_date`),
  ADD KEY `offer_level` (`offer_level`);

--
-- Indexes for table `region`
--
ALTER TABLE `region`
  ADD PRIMARY KEY (`region_id`),
  ADD UNIQUE KEY `region_name` (`region_name`),
  ADD KEY `division_id` (`division_id`),
  ADD KEY `region_id` (`region_id`),
  ADD KEY `division_id_2` (`division_id`),
  ADD KEY `region_id_2` (`region_id`);

--
-- Indexes for table `route`
--
ALTER TABLE `route`
  ADD PRIMARY KEY (`route_id`),
  ADD UNIQUE KEY `route` (`route`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `sr_id2` (`sr_id2`),
  ADD KEY `edit_permit` (`edit_permit`),
  ADD KEY `sat` (`sat`),
  ADD KEY `sun` (`sun`),
  ADD KEY `mon` (`mon`),
  ADD KEY `tue` (`tue`),
  ADD KEY `wed` (`wed`),
  ADD KEY `thu` (`thu`),
  ADD KEY `fri` (`fri`),
  ADD KEY `sat2` (`sat2`),
  ADD KEY `sun2` (`sun2`),
  ADD KEY `mon2` (`mon2`),
  ADD KEY `tue2` (`tue2`),
  ADD KEY `wed2` (`wed2`),
  ADD KEY `thu2` (`thu2`),
  ADD KEY `fri2` (`fri2`),
  ADD KEY `add_permit` (`add_permit`);

--
-- Indexes for table `rsm`
--
ALTER TABLE `rsm`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `rsm_attendance`
--
ALTER TABLE `rsm_attendance`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `rsm_id` (`rsm_id`),
  ADD KEY `attendance_type` (`attendance_type`);

--
-- Indexes for table `rsm_salary`
--
ALTER TABLE `rsm_salary`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `region_id` (`region_id`),
  ADD KEY `id` (`id`),
  ADD KEY `year_month_2` (`year_month`);

--
-- Indexes for table `sales_order_outlet`
--
ALTER TABLE `sales_order_outlet`
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `sales_org_id` (`sales_org_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `delivery_date` (`delivery_date`),
  ADD KEY `status` (`status`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `pay_mode` (`pay_mode`);

--
-- Indexes for table `sales_order_outlet_actual`
--
ALTER TABLE `sales_order_outlet_actual`
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `sales_org_id` (`sales_org_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `delivery_date` (`delivery_date`),
  ADD KEY `status` (`status`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `pay_mode` (`pay_mode`);

--
-- Indexes for table `sales_order_outlet_qc`
--
ALTER TABLE `sales_order_outlet_qc`
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `sales_org_id` (`sales_org_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `delivery_date` (`delivery_date`),
  ADD KEY `status` (`status`),
  ADD KEY `route_id` (`route_id`);

--
-- Indexes for table `sales_order_outlet_sku_coverage`
--
ALTER TABLE `sales_order_outlet_sku_coverage`
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `brand_id` (`brand_id`);

--
-- Indexes for table `sales_order_outlet_today`
--
ALTER TABLE `sales_order_outlet_today`
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `sales_org_id` (`sales_org_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `delivery_date` (`delivery_date`),
  ADD KEY `status` (`status`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `pay_mode` (`pay_mode`);

--
-- Indexes for table `sales_order_outlet_today_qc`
--
ALTER TABLE `sales_order_outlet_today_qc`
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `sales_org_id` (`sales_org_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `delivery_date` (`delivery_date`),
  ADD KEY `status` (`status`),
  ADD KEY `route_id` (`route_id`);

--
-- Indexes for table `sales_order_remarks`
--
ALTER TABLE `sales_order_remarks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `remarks` (`remarks`);

--
-- Indexes for table `sales_order_remarks_qc`
--
ALTER TABLE `sales_order_remarks_qc`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `remarks` (`remarks`);

--
-- Indexes for table `sales_org`
--
ALTER TABLE `sales_org`
  ADD PRIMARY KEY (`sales_org_id`),
  ADD UNIQUE KEY `name` (`sales_org_name`);

--
-- Indexes for table `sdbDelivery`
--
ALTER TABLE `sdbDelivery`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shop_sign`
--
ALTER TABLE `shop_sign`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type` (`type`);

--
-- Indexes for table `shop_type`
--
ALTER TABLE `shop_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `type` (`type`);

--
-- Indexes for table `SO_Order`
--
ALTER TABLE `SO_Order`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sr`
--
ALTER TABLE `sr`
  ADD PRIMARY KEY (`sr_id`),
  ADD UNIQUE KEY `mobile_no` (`mobile_no`),
  ADD UNIQUE KEY `mobile_no_2` (`mobile_no`),
  ADD UNIQUE KEY `user_name` (`user_name`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `status` (`status`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `name_emergenry` (`name_emergenry`),
  ADD KEY `mobile_no_emergency` (`mobile_no_emergency`);

--
-- Indexes for table `sr_attendance`
--
ALTER TABLE `sr_attendance`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `attendance_type` (`attendance_type`);

--
-- Indexes for table `sr_contribution`
--
ALTER TABLE `sr_contribution`
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `brand_id` (`brand_id`);

--
-- Indexes for table `sr_exclucive`
--
ALTER TABLE `sr_exclucive`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `mobile_no` (`mobile_no`),
  ADD UNIQUE KEY `mobile_no_2` (`mobile_no`);

--
-- Indexes for table `sr_salary`
--
ALTER TABLE `sr_salary`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `region_id` (`region_id`),
  ADD KEY `teritorry_id` (`teritorry_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `sr_id` (`sr_id`);

--
-- Indexes for table `sr_target`
--
ALTER TABLE `sr_target`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `route_id` (`route_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `rsm_id` (`rsm_id`),
  ADD KEY `asm_id` (`asm_id`);

--
-- Indexes for table `sr_target_info`
--
ALTER TABLE `sr_target_info`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `no_incentive` (`no_incentive`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `rsm_id` (`rsm_id`),
  ADD KEY `asm_id` (`asm_id`);

--
-- Indexes for table `superDistributor`
--
ALTER TABLE `superDistributor`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `survey_competitor`
--
ALTER TABLE `survey_competitor`
  ADD KEY `outlet_id` (`outlet_id`),
  ADD KEY `create_by` (`create_by`),
  ADD KEY `update_by` (`update_by`),
  ADD KEY `outlet_class` (`outlet_class`),
  ADD KEY `create_date` (`create_date`),
  ADD KEY `update_date` (`update_date`);

--
-- Indexes for table `survey_dealer_doc_availability`
--
ALTER TABLE `survey_dealer_doc_availability`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`roi`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`),
  ADD KEY `attendence_sheet` (`attendence_sheet`),
  ADD KEY `sales_stock_register` (`sales_stock_register`);

--
-- Indexes for table `survey_dealer_investment`
--
ALTER TABLE `survey_dealer_investment`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`);

--
-- Indexes for table `survey_dealer_logistic_availability`
--
ALTER TABLE `survey_dealer_logistic_availability`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`smart_phone`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`),
  ADD KEY `attendence_sheet` (`laptop`),
  ADD KEY `sales_stock_register` (`printer`),
  ADD KEY `internet` (`internet`),
  ADD KEY `printing_paper` (`printing_paper`),
  ADD KEY `loading_facility` (`loading_facility`),
  ADD KEY `sufficient_store_space` (`sufficient_store_space`),
  ADD KEY `warehouse_environment` (`warehouse_environment`),
  ADD KEY `fifo_maintain` (`fifo_maintain`),
  ADD KEY `lifo_maintain` (`lifo_maintain`);

--
-- Indexes for table `survey_dealer_other_issues`
--
ALTER TABLE `survey_dealer_other_issues`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`),
  ADD KEY `audited_with_name` (`audited_with_name`),
  ADD KEY `audited_with_desig` (`audited_with_desig`),
  ADD KEY `audited_with_mobile` (`audited_with_mobile`);

--
-- Indexes for table `survey_dealer_sku_complain`
--
ALTER TABLE `survey_dealer_sku_complain`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`),
  ADD KEY `brand_id` (`brand_id`),
  ADD KEY `status` (`status`);

--
-- Indexes for table `survey_dealer_stock`
--
ALTER TABLE `survey_dealer_stock`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`);

--
-- Indexes for table `survey_sr_activities`
--
ALTER TABLE `survey_sr_activities`
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `dealer_id` (`dealer_id`),
  ADD KEY `date_2` (`date`),
  ADD KEY `audit_by` (`audit_by`),
  ADD KEY `sr_id` (`sr_id`),
  ADD KEY `dress_code` (`dress_code`),
  ADD KEY `attitude` (`attitude`),
  ADD KEY `physical_violence` (`physical_violence`),
  ADD KEY `loality` (`loality`),
  ADD KEY `relationship_maintain` (`relationship_maintain`),
  ADD KEY `professionally_equipt` (`professionally_equipt`);

--
-- Indexes for table `teritorry`
--
ALTER TABLE `teritorry`
  ADD PRIMARY KEY (`teritorry_id`),
  ADD KEY `region_id` (`region_id`),
  ADD KEY `teritorry_name` (`teritorry_name`),
  ADD KEY `teritorry_name_2` (`teritorry_name`),
  ADD KEY `status` (`status`),
  ADD KEY `teritorry_id` (`teritorry_id`),
  ADD KEY `area_id` (`area_id`);

--
-- Indexes for table `thanas`
--
ALTER TABLE `thanas`
  ADD PRIMARY KEY (`thana_id`);

--
-- Indexes for table `time_pass`
--
ALTER TABLE `time_pass`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `date` (`date`),
  ADD UNIQUE KEY `date_2` (`date`),
  ADD UNIQUE KEY `date_3` (`date`),
  ADD KEY `year_month1` (`year_month`);

--
-- Indexes for table `trade_program`
--
ALTER TABLE `trade_program`
  ADD PRIMARY KEY (`trade_id`);

--
-- Indexes for table `transport`
--
ALTER TABLE `transport`
  ADD PRIMARY KEY (`transport_id`),
  ADD UNIQUE KEY `transport_name` (`transport_name`);

--
-- Indexes for table `transport_area`
--
ALTER TABLE `transport_area`
  ADD PRIMARY KEY (`trans_area_id`),
  ADD UNIQUE KEY `trans_area_name` (`trans_area_name`);

--
-- Indexes for table `tso`
--
ALTER TABLE `tso`
  ADD PRIMARY KEY (`tso_id`),
  ADD UNIQUE KEY `name` (`user_name`),
  ADD UNIQUE KEY `user_name` (`user_name`);

--
-- Indexes for table `tso_attendance`
--
ALTER TABLE `tso_attendance`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `date` (`date`),
  ADD KEY `tso_id` (`tso_id`),
  ADD KEY `attendance_type` (`attendance_type`);

--
-- Indexes for table `tso_salary`
--
ALTER TABLE `tso_salary`
  ADD KEY `year_month` (`year_month`),
  ADD KEY `year_month_2` (`year_month`),
  ADD KEY `region_id` (`region_id`),
  ADD KEY `teritorry_id` (`teritorry_id`),
  ADD KEY `tso_id` (`tso_id`);

--
-- Indexes for table `unit`
--
ALTER TABLE `unit`
  ADD UNIQUE KEY `unit` (`unit`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `full_name` (`full_name`);

--
-- Indexes for table `voucher_no_dealer_order`
--
ALTER TABLE `voucher_no_dealer_order`
  ADD UNIQUE KEY `v_no` (`v_no`);

--
-- Indexes for table `voucher_no_depot_challan`
--
ALTER TABLE `voucher_no_depot_challan`
  ADD PRIMARY KEY (`v_no`);

--
-- Indexes for table `voucher_no_depot_delivery`
--
ALTER TABLE `voucher_no_depot_delivery`
  ADD PRIMARY KEY (`v_no`);

--
-- Indexes for table `voucher_no_depot_order`
--
ALTER TABLE `voucher_no_depot_order`
  ADD UNIQUE KEY `v_no` (`v_no`);

--
-- Indexes for table `voucher_no_depot_received`
--
ALTER TABLE `voucher_no_depot_received`
  ADD PRIMARY KEY (`v_no`);

--
-- Indexes for table `voucher_no_offer`
--
ALTER TABLE `voucher_no_offer`
  ADD UNIQUE KEY `v_no` (`v_no`);

--
-- Indexes for table `voucher_no_transport_challan`
--
ALTER TABLE `voucher_no_transport_challan`
  ADD UNIQUE KEY `v_no` (`v_no`);

--
-- Indexes for table `yes_no`
--
ALTER TABLE `yes_no`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `yes_no` (`type`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `AppUser`
--
ALTER TABLE `AppUser`
  MODIFY `id` int(30) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `area`
--
ALTER TABLE `area`
  MODIFY `area_id` int(4) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `asm`
--
ALTER TABLE `asm`
  MODIFY `asm_id` int(5) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auditor`
--
ALTER TABLE `auditor`
  MODIFY `i` int(3) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank`
--
ALTER TABLE `bank`
  MODIFY `bank_id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_name`
--
ALTER TABLE `bank_name`
  MODIFY `bank_id` int(3) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `brand`
--
ALTER TABLE `brand`
  MODIFY `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `brand1`
--
ALTER TABLE `brand1`
  MODIFY `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `brand_pf_depot`
--
ALTER TABLE `brand_pf_depot`
  MODIFY `brand_id` int(2) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company`
--
ALTER TABLE `company`
  MODIFY `com_id` int(2) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `db_so`
--
ALTER TABLE `db_so`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dealer`
--
ALTER TABLE `dealer`
  MODIFY `dealer_id` int(6) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deliSchedule`
--
ALTER TABLE `deliSchedule`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `DeliveryTr`
--
ALTER TABLE `DeliveryTr`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `DemandTr`
--
ALTER TABLE `DemandTr`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `department`
--
ALTER TABLE `department`
  MODIFY `dep_id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `depot`
--
ALTER TABLE `depot`
  MODIFY `depot_id` int(2) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `designation`
--
ALTER TABLE `designation`
  MODIFY `deg_id` int(2) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Discountconditio`
--
ALTER TABLE `Discountconditio`
  MODIFY `id` int(40) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `Discounts`
--
ALTER TABLE `Discounts`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `districts`
--
ALTER TABLE `districts`
  MODIFY `district_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `division`
--
ALTER TABLE `division`
  MODIFY `division_id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `dsr`
--
ALTER TABLE `dsr`
  MODIFY `dsr_id` int(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoice_no`
--
ALTER TABLE `invoice_no`
  MODIFY `invoice_id` int(10) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `key_outlet`
--
ALTER TABLE `key_outlet`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `memoLineCat`
--
ALTER TABLE `memoLineCat`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `memoLineCatDelivery`
--
ALTER TABLE `memoLineCatDelivery`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `multiBankOrderInfo`
--
ALTER TABLE `multiBankOrderInfo`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notice`
--
ALTER TABLE `notice`
  MODIFY `sn` int(5) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `offerCondition`
--
ALTER TABLE `offerCondition`
  MODIFY `id` int(40) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `offers`
--
ALTER TABLE `offers`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `OrderDelivery`
--
ALTER TABLE `OrderDelivery`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `order_mng_preview`
--
ALTER TABLE `order_mng_preview`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `outlet_channel`
--
ALTER TABLE `outlet_channel`
  MODIFY `outlet_channel_id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `outlet_created_by`
--
ALTER TABLE `outlet_created_by`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `outlet_info`
--
ALTER TABLE `outlet_info`
  MODIFY `outlet_id` int(8) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `package_gift`
--
ALTER TABLE `package_gift`
  MODIFY `gift_id` int(4) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `package_offer`
--
ALTER TABLE `package_offer`
  MODIFY `package_id` int(4) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_mode`
--
ALTER TABLE `payment_mode`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product`
--
ALTER TABLE `product`
  MODIFY `product_id` int(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `productcatSKU`
--
ALTER TABLE `productcatSKU`
  MODIFY `id` int(30) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_compt`
--
ALTER TABLE `product_compt`
  MODIFY `product_id_compt` int(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_depot`
--
ALTER TABLE `product_depot`
  MODIFY `product_id` int(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `region`
--
ALTER TABLE `region`
  MODIFY `region_id` int(3) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `route`
--
ALTER TABLE `route`
  MODIFY `route_id` int(6) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rsm`
--
ALTER TABLE `rsm`
  MODIFY `id` int(3) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_order_remarks`
--
ALTER TABLE `sales_order_remarks`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_order_remarks_qc`
--
ALTER TABLE `sales_order_remarks_qc`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_org`
--
ALTER TABLE `sales_org`
  MODIFY `sales_org_id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sdbDelivery`
--
ALTER TABLE `sdbDelivery`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `shop_type`
--
ALTER TABLE `shop_type`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `SO_Order`
--
ALTER TABLE `SO_Order`
  MODIFY `id` int(50) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sr`
--
ALTER TABLE `sr`
  MODIFY `sr_id` int(4) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sr_exclucive`
--
ALTER TABLE `sr_exclucive`
  MODIFY `id` int(5) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `superDistributor`
--
ALTER TABLE `superDistributor`
  MODIFY `id` int(30) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `teritorry`
--
ALTER TABLE `teritorry`
  MODIFY `teritorry_id` int(4) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `thanas`
--
ALTER TABLE `thanas`
  MODIFY `thana_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `time_pass`
--
ALTER TABLE `time_pass`
  MODIFY `id` int(6) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transport`
--
ALTER TABLE `transport`
  MODIFY `transport_id` int(3) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transport_area`
--
ALTER TABLE `transport_area`
  MODIFY `trans_area_id` int(2) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tso`
--
ALTER TABLE `tso`
  MODIFY `tso_id` int(5) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(3) UNSIGNED ZEROFILL NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `yes_no`
--
ALTER TABLE `yes_no`
  MODIFY `id` int(2) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
