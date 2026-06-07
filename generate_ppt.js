const PptxGenJS = require("pptxgenjs");

// Create presentation
const prs = new PptxGenJS();
prs.defineLayout({ name: 'LAYOUT1', width: 13.333, height: 7.5 });

// Set default font
prs.defineLayout({ name: 'LAYOUT1', width: 13.333, height: 7.5 });
const fontFace = "Calibri";

// ===========================
// SLIDE 1: Title Slide
// ===========================
let slide1 = prs.addSlide();
slide1.background = { color: "2F5496" };
slide1.addText("TCV CORE - DATABASE ARCHITECTURE", {
    x: 0.5, y: 1.5, w: 12.333, h: 1,
    fontSize: 44, bold: true, color: "FFFFFF", align: "center", fontFace: fontFace
});
slide1.addText("Inventory, Purchase, Quotation & Sales Management System", {
    x: 0.5, y: 2.8, w: 12.333, h: 0.6,
    fontSize: 20, color: "E7E6E6", align: "center", fontFace: fontFace
});
slide1.addText("Version 2.0 | Database Schema & Architecture Diagram", {
    x: 0.5, y: 4.2, w: 12.333, h: 0.5,
    fontSize: 16, color: "BDD7EE", align: "center", fontFace: fontFace, italic: true
});
slide1.addText("Date: 2026-06-07", {
    x: 0.5, y: 6.5, w: 12.333, h: 0.4,
    fontSize: 12, color: "A9D08E", align: "center", fontFace: fontFace
});

// ===========================
// SLIDE 2: Database Overview
// ===========================
let slide2 = prs.addSlide();
slide2.background = { color: "FFFFFF" };
slide2.addText("Database Structure Overview", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

const overviewContent = [
    "Total Tables: 22",
    "Relationships: 50+ Foreign Keys",
    "Indexes: 80+ for Performance Optimization",
    "Primary Focus: Normalization (3NF Compliance)",
    "Database Engine: MySQL 8.0+",
    "Character Set: UTF8MB4 Unicode",
    "Storage Engine: InnoDB (ACID Compliance)"
];

let yPos = 1.2;
overviewContent.forEach((item, idx) => {
    slide2.addText(item, {
        x: 1, y: yPos, w: 11.333, h: 0.4,
        fontSize: 14, color: "000000", fontFace: fontFace
    });
    yPos += 0.5;
});

// Add table count breakdown
slide2.addShape(prs.ShapeType.rect, {
    x: 1, y: 5, w: 11, h: 2,
    fill: { color: "D9E8F5" },
    line: { color: "2F5496", width: 2 }
});

slide2.addText("Entity Categories: Master (7) | Transactional (10) | Audit & Support (5)", {
    x: 1.2, y: 5.2, w: 10.6, h: 1.3,
    fontSize: 13, color: "2F5496", fontFace: fontFace, align: "center", valign: "middle"
});

// ===========================
// SLIDE 3: Entity Relationship Model
// ===========================
let slide3 = prs.addSlide();
slide3.background = { color: "FFFFFF" };
slide3.addText("Master Data Entities", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Master entities
const masterEntities = [
    { name: "Users", color: "4472C4", x: 0.5 },
    { name: "Employees", color: "4472C4", x: 2.2 },
    { name: "Brands", color: "70AD47", x: 3.9 },
    { name: "Categories", color: "70AD47", x: 5.6 },
    { name: "Products", color: "70AD47", x: 7.3 },
    { name: "Suppliers", color: "FFC7CE", x: 9 },
    { name: "Customers", color: "FFC7CE", x: 10.7 }
];

masterEntities.forEach(entity => {
    slide3.addShape(prs.ShapeType.rect, {
        x: entity.x, y: 1.5, w: 1.4, h: 0.7,
        fill: { color: entity.color },
        line: { color: "000000", width: 1 }
    });
    slide3.addText(entity.name, {
        x: entity.x, y: 1.5, w: 1.4, h: 0.7,
        fontSize: 12, bold: true, color: "FFFFFF", align: "center", valign: "middle",
        fontFace: fontFace
    });
});

slide3.addText("Configuration & Setup", {
    x: 0.5, y: 2.8, w: 12.333, h: 0.3,
    fontSize: 14, bold: true, color: "2F5496", fontFace: fontFace
});

// Configuration entities
const configEntities = [
    "Users & Authentication",
    "Employee Roles & Departments",
    "Brand & Category Hierarchy",
    "Product Catalog",
    "Supplier Master",
    "Customer Master"
];

yPos = 3.3;
configEntities.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    slide3.addText("• " + item, {
        x: 0.8 + (col * 4), y: yPos + (row * 0.45), w: 3.8, h: 0.4,
        fontSize: 11, color: "000000", fontFace: fontFace
    });
});

// ===========================
// SLIDE 4: Transactional Entities
// ===========================
let slide4 = prs.addSlide();
slide4.background = { color: "FFFFFF" };
slide4.addText("Transactional Entities", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Purchase workflow
slide4.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 1.2, w: 2.8, h: 0.6,
    fill: { color: "92D050" }
});
slide4.addText("PURCHASE\nMaster + Items", {
    x: 0.5, y: 1.2, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide4.addShape(prs.ShapeType.rect, {
    x: 4, y: 1.2, w: 2.8, h: 0.6,
    fill: { color: "92D050" }
});
slide4.addText("STOCK\nMaster + Ledger", {
    x: 4, y: 1.2, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide4.addShape(prs.ShapeType.rect, {
    x: 7.5, y: 1.2, w: 2.8, h: 0.6,
    fill: { color: "92D050" }
});
slide4.addText("SUPPLIER\nPayments", {
    x: 7.5, y: 1.2, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Sales workflow
slide4.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 2.5, w: 2.8, h: 0.6,
    fill: { color: "4472C4" }
});
slide4.addText("QUOTATION\nMaster + Items", {
    x: 0.5, y: 2.5, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide4.addShape(prs.ShapeType.rect, {
    x: 4, y: 2.5, w: 2.8, h: 0.6,
    fill: { color: "4472C4" }
});
slide4.addText("WORK ORDERS\n& Employees", {
    x: 4, y: 2.5, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide4.addShape(prs.ShapeType.rect, {
    x: 7.5, y: 2.5, w: 2.8, h: 0.6,
    fill: { color: "4472C4" }
});
slide4.addText("SALES\nMaster + Items", {
    x: 7.5, y: 2.5, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Service workflow
slide4.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 3.8, w: 2.8, h: 0.6,
    fill: { color: "ED7D31" }
});
slide4.addText("SERVICE\nTickets", {
    x: 0.5, y: 3.8, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide4.addShape(prs.ShapeType.rect, {
    x: 4, y: 3.8, w: 2.8, h: 0.6,
    fill: { color: "ED7D31" }
});
slide4.addText("WARRANTY\nMaster", {
    x: 4, y: 3.8, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide4.addShape(prs.ShapeType.rect, {
    x: 7.5, y: 3.8, w: 2.8, h: 0.6,
    fill: { color: "ED7D31" }
});
slide4.addText("CUSTOMER\nPayments", {
    x: 7.5, y: 3.8, w: 2.8, h: 0.6,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Add descriptions
slide4.addText("Purchase Workflow (Green)", {
    x: 0.5, y: 5, w: 3, h: 0.3,
    fontSize: 11, bold: true, color: "000000", fontFace: fontFace
});

slide4.addText("Sales Workflow (Blue)", {
    x: 0.5, y: 5.5, w: 3, h: 0.3,
    fontSize: 11, bold: true, color: "000000", fontFace: fontFace
});

slide4.addText("Service Workflow (Orange)", {
    x: 0.5, y: 6, w: 3, h: 0.3,
    fontSize: 11, bold: true, color: "000000", fontFace: fontFace
});

// ===========================
// SLIDE 5: Data Flow Diagram
// ===========================
let slide5 = prs.addSlide();
slide5.background = { color: "FFFFFF" };
slide5.addText("Quotation to Sales Data Flow", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

const flowSteps = [
    { text: "1. QUOTATION\nCreated", x: 0.8, color: "92D050" },
    { text: "2. APPROVED", x: 2.8, color: "70AD47" },
    { text: "3. WORK\nORDER", x: 4.8, color: "4472C4" },
    { text: "4. ASSIGN\nEMPLOYEES", x: 6.8, color: "4472C4" },
    { text: "5. SALES\nINVOICE", x: 8.8, color: "FFC7CE" },
    { text: "6. STOCK\nUPDATE", x: 10.8, color: "ED7D31" }
];

flowSteps.forEach(step => {
    slide5.addShape(prs.ShapeType.rect, {
        x: step.x, y: 1.8, w: 1.7, h: 1.2,
        fill: { color: step.color },
        line: { color: "000000", width: 1.5 }
    });
    slide5.addText(step.text, {
        x: step.x, y: 1.8, w: 1.7, h: 1.2,
        fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle",
        fontFace: fontFace
    });
});

// Add arrows
for (let i = 0; i < flowSteps.length - 1; i++) {
    slide5.addShape(prs.ShapeType.line, {
        x: flowSteps[i].x + 1.7, y: 2.4, w: 1, h: 0,
        line: { color: "000000", width: 2, endArrowType: "triangle" }
    });
}

// Add supporting tables
slide5.addText("Supporting Tables & References:", {
    x: 0.8, y: 3.5, w: 11.5, h: 0.3,
    fontSize: 12, bold: true, color: "2F5496", fontFace: fontFace
});

const supportTables = [
    "• quotation_master & quotation_items → Customer requirements",
    "• work_orders & work_order_employees → Installation planning",
    "• sales_master & sales_items → Invoice generation",
    "• stock_ledger → Transaction audit trail",
    "• customer_payments → Payment tracking"
];

yPos = 4;
supportTables.forEach((item, idx) => {
    slide5.addText(item, {
        x: 1.2, y: yPos + (idx * 0.4), w: 11, h: 0.35,
        fontSize: 11, color: "000000", fontFace: fontFace
    });
});

// ===========================
// SLIDE 6: Stock Management
// ===========================
let slide6 = prs.addSlide();
slide6.background = { color: "FFFFFF" };
slide6.addText("Stock Management Architecture", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Stock master
slide6.addShape(prs.ShapeType.rect, {
    x: 2, y: 1.5, w: 3, h: 1.2,
    fill: { color: "92D050" },
    line: { color: "000000", width: 2 }
});
slide6.addText("STOCK_MASTER\n\n• available_qty\n• reserved_qty\n• min/max stock", {
    x: 2, y: 1.5, w: 3, h: 1.2,
    fontSize: 10, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace, bold: true
});

// Stock ledger
slide6.addShape(prs.ShapeType.rect, {
    x: 8, y: 1.5, w: 3, h: 1.2,
    fill: { color: "4472C4" },
    line: { color: "000000", width: 2 }
});
slide6.addText("STOCK_LEDGER\n\n• Immutable audit\n• Transaction type\n• qty_in, qty_out", {
    x: 8, y: 1.5, w: 3, h: 1.2,
    fontSize: 10, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace, bold: true
});

// Arrow connecting them
slide6.addShape(prs.ShapeType.line, {
    x: 5, y: 2.1, w: 3, h: 0,
    line: { color: "000000", width: 2, endArrowType: "triangle" }
});
slide6.addText("Updates →", {
    x: 5.8, y: 1.9, w: 1.5, h: 0.3,
    fontSize: 10, color: "000000", fontFace: fontFace, bold: true
});

// Transaction types
slide6.addText("Transaction Types in Stock Ledger:", {
    x: 0.8, y: 3, w: 11.5, h: 0.3,
    fontSize: 12, bold: true, color: "2F5496", fontFace: fontFace
});

const transactionTypes = [
    "PURCHASE: Stock increase from supplier purchases",
    "SALE: Stock decrease from customer sales",
    "RETURN: Stock return from customers",
    "ADJUSTMENT: Manual inventory adjustments",
    "INSTALLATION: Stock used in installation work",
    "SCRAP: Damaged or obsolete items"
];

yPos = 3.5;
transactionTypes.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    slide6.addText("▪ " + item, {
        x: 0.8 + (col * 4), y: yPos + (row * 0.5), w: 3.8, h: 0.4,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// ===========================
// SLIDE 7: Payment Tracking
// ===========================
let slide7 = prs.addSlide();
slide7.background = { color: "FFFFFF" };
slide7.addText("Payment & Financial Tracking", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Customer payments flow
slide7.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 1.5, w: 2.5, h: 0.8,
    fill: { color: "FFC7CE" },
    line: { color: "000000", width: 1.5 }
});
slide7.addText("CUSTOMER\nPayments", {
    x: 0.5, y: 1.5, w: 2.5, h: 0.8,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide7.addShape(prs.ShapeType.rect, {
    x: 3.5, y: 1.5, w: 2.5, h: 0.8,
    fill: { color: "FFC7CE" },
    line: { color: "000000", width: 1.5 }
});
slide7.addText("SALES\nMaster", {
    x: 3.5, y: 1.5, w: 2.5, h: 0.8,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Supplier payments flow
slide7.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 2.8, w: 2.5, h: 0.8,
    fill: { color: "92D050" },
    line: { color: "000000", width: 1.5 }
});
slide7.addText("SUPPLIER\nPayments", {
    x: 0.5, y: 2.8, w: 2.5, h: 0.8,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

slide7.addShape(prs.ShapeType.rect, {
    x: 3.5, y: 2.8, w: 2.5, h: 0.8,
    fill: { color: "92D050" },
    line: { color: "000000", width: 1.5 }
});
slide7.addText("PURCHASE\nMaster", {
    x: 3.5, y: 2.8, w: 2.5, h: 0.8,
    fontSize: 11, bold: true, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Payment tracking details
slide7.addText("Payment Status Tracking:", {
    x: 7, y: 1.5, w: 5.5, h: 0.35,
    fontSize: 11, bold: true, color: "2F5496", fontFace: fontFace
});

const paymentStatuses = [
    "PENDING: No payment received",
    "PARTIAL: Partial payment received",
    "PAID: Full payment received",
    "OVERDUE: Payment past due date"
];

yPos = 2;
paymentStatuses.forEach((item, idx) => {
    slide7.addText("▪ " + item, {
        x: 7.2, y: yPos + (idx * 0.35), w: 5, h: 0.3,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// Payment modes
slide7.addText("Payment Modes Supported:", {
    x: 7, y: 3.8, w: 5.5, h: 0.35,
    fontSize: 11, bold: true, color: "2F5496", fontFace: fontFace
});

const paymentModes = [
    "CASH, CARD, UPI",
    "BANK Transfer, CHEQUE",
    "CREDIT (On Account)",
    "ONLINE"
];

yPos = 4.3;
paymentModes.forEach((item, idx) => {
    slide7.addText("▪ " + item, {
        x: 7.2, y: yPos + (idx * 0.35), w: 5, h: 0.3,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// ===========================
// SLIDE 8: Service & Warranty
// ===========================
let slide8 = prs.addSlide();
slide8.background = { color: "FFFFFF" };
slide8.addText("Service & Warranty Management", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Service tickets
slide8.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 1.5, w: 3, h: 1.5,
    fill: { color: "ED7D31" },
    line: { color: "000000", width: 2 }
});
slide8.addText("SERVICE TICKETS\n\nStatus:\n• OPEN → IN_PROGRESS\n• RESOLVED → CLOSED\n\nPriority Levels:\nLOW/MEDIUM/HIGH/URGENT", {
    x: 0.5, y: 1.5, w: 3, h: 1.5,
    fontSize: 9, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Warranty master
slide8.addShape(prs.ShapeType.rect, {
    x: 4.2, y: 1.5, w: 3, h: 1.5,
    fill: { color: "70AD47" },
    line: { color: "000000", width: 2 }
});
slide8.addText("WARRANTY MASTER\n\nStatus:\n• ACTIVE → EXPIRED\n• CLAIMED → VOID\n\nTracking:\n• Serial numbers\n• Coverage type\n• Warranty dates", {
    x: 4.2, y: 1.5, w: 3, h: 1.5,
    fontSize: 9, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Relationships
slide8.addShape(prs.ShapeType.rect, {
    x: 7.9, y: 1.5, w: 3, h: 1.5,
    fill: { color: "4472C4" },
    line: { color: "000000", width: 2 }
});
slide8.addText("Relationships\n\n• Service Tickets ↔ Customers\n• Service Tickets ↔ Products\n• Warranty ↔ Sales\n• Warranty ↔ Products\n• Assignments ↔ Employees", {
    x: 7.9, y: 1.5, w: 3, h: 1.5,
    fontSize: 9, color: "FFFFFF", align: "center", valign: "middle",
    fontFace: fontFace
});

// Workflow description
slide8.addText("Service Workflow:", {
    x: 0.5, y: 3.3, w: 12.333, h: 0.3,
    fontSize: 11, bold: true, color: "2F5496", fontFace: fontFace
});

const serviceWorkflow = [
    "1. Customer raises SERVICE_TICKET with complaint details",
    "2. Ticket assigned to EMPLOYEE with priority level",
    "3. Employee updates status and adds resolution notes",
    "4. WARRANTY_MASTER tracks product coverage",
    "5. Service history maintained for tracking repeat issues"
];

yPos = 3.8;
serviceWorkflow.forEach((item, idx) => {
    slide8.addText(item, {
        x: 1, y: yPos + (idx * 0.35), w: 11.5, h: 0.3,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// ===========================
// SLIDE 9: Data Validation & Constraints
// ===========================
let slide9 = prs.addSlide();
slide9.background = { color: "FFFFFF" };
slide9.addText("Data Validation & Constraints", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Define constraint categories
const constraints = [
    { title: "CHECK Constraints", items: ["Prices ≥ 0", "Quantities > 0", "Tax % 0-100", "Stock non-negative"] },
    { title: "UNIQUE Constraints", items: ["Product codes", "Invoice numbers", "Document IDs", "Usernames/Emails"] },
    { title: "FOREIGN KEY Constraints", items: ["Referential integrity", "Cascading deletes", "Data consistency", "Relationship validation"] },
    { title: "ENUM Constraints", items: ["Status values", "Payment modes", "Work types", "Priority levels"] }
];

const colors = ["92D050", "4472C4", "ED7D31", "FFC7CE"];

constraints.forEach((constraint, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 0.7 + (col * 6.2);
    const y = 1.3 + (row * 2.8);

    slide9.addShape(prs.ShapeType.rect, {
        x: x, y: y, w: 5.8, h: 2.5,
        fill: { color: colors[idx] },
        line: { color: "000000", width: 1.5 }
    });

    slide9.addText(constraint.title, {
        x: x + 0.2, y: y + 0.1, w: 5.4, h: 0.4,
        fontSize: 11, bold: true, color: "FFFFFF", fontFace: fontFace
    });

    constraint.items.forEach((item, itemIdx) => {
        slide9.addText("• " + item, {
            x: x + 0.3, y: y + 0.6 + (itemIdx * 0.35), w: 5.2, h: 0.32,
            fontSize: 10, color: "FFFFFF", fontFace: fontFace
        });
    });
});

// ===========================
// SLIDE 10: Performance & Indexes
// ===========================
let slide10 = prs.addSlide();
slide10.background = { color: "FFFFFF" };
slide10.addText("Performance Optimization & Indexing", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

slide10.addText("Indexing Strategy:", {
    x: 0.5, y: 1.1, w: 12.333, h: 0.3,
    fontSize: 12, bold: true, color: "2F5496", fontFace: fontFace
});

const indexingStrategies = [
    "✓ Primary keys on all 22 tables",
    "✓ Foreign key indexes for relationships (50+ indexes)",
    "✓ Status/State columns indexed for fast filtering",
    "✓ Date columns indexed for range queries and reporting",
    "✓ Composite indexes for common filter combinations",
    "✓ Search columns (name, code) indexed for LIKE queries",
    "✓ Selective indexes to avoid write penalties",
    "Total Indexes: 80+ optimized for query performance"
];

yPos = 1.6;
indexingStrategies.forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    slide10.addText(item, {
        x: 0.8 + (col * 6), y: yPos + (row * 0.35), w: 5.5, h: 0.32,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// Query optimization box
slide10.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 4.5, w: 12.333, h: 2,
    fill: { color: "D9E8F5" },
    line: { color: "2F5496", width: 2 }
});

slide10.addText("Key Performance Metrics:", {
    x: 0.8, y: 4.7, w: 11.8, h: 0.3,
    fontSize: 11, bold: true, color: "2F5496", fontFace: fontFace
});

const perfMetrics = [
    "• Query response time: < 200ms for most operations",
    "• Connection pooling: Configured for concurrent users",
    "• Batch operations: Support for bulk import/export",
    "• Caching strategy: Master data cached, Reports cached with TTL",
    "• Scalability: Ready for multi-warehouse expansion (v2.0)"
];

yPos = 5.1;
perfMetrics.forEach((item, idx) => {
    slide10.addText(item, {
        x: 0.8, y: yPos + (idx * 0.3), w: 11.8, h: 0.28,
        fontSize: 9, color: "2F5496", fontFace: fontFace
    });
});

// ===========================
// SLIDE 11: Security & Audit
// ===========================
let slide11 = prs.addSlide();
slide11.background = { color: "FFFFFF" };
slide11.addText("Security & Audit Trail", {
    x: 0.5, y: 0.3, w: 12.333, h: 0.5,
    fontSize: 32, bold: true, color: "2F5496", fontFace: fontFace
});

// Security measures
slide11.addShape(prs.ShapeType.rect, {
    x: 0.5, y: 1.1, w: 5.8, h: 3.5,
    fill: { color: "FFC7CE" },
    line: { color: "2F5496", width: 2 }
});

slide11.addText("Security Measures", {
    x: 0.8, y: 1.3, w: 5.2, h: 0.3,
    fontSize: 11, bold: true, color: "000000", fontFace: fontFace
});

const securityMeasures = [
    "✓ RBAC - Role-based access",
    "✓ Password hashing (bcrypt)",
    "✓ JWT token authentication",
    "✓ Prepared statements",
    "✓ Input validation & sanitization",
    "✓ TLS/HTTPS encryption",
    "✓ Account lockout mechanism",
    "✓ Audit logging"
];

yPos = 1.75;
securityMeasures.forEach((item, idx) => {
    slide11.addText(item, {
        x: 0.8, y: yPos + (idx * 0.35), w: 5.2, h: 0.3,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// Audit trail
slide11.addShape(prs.ShapeType.rect, {
    x: 7, y: 1.1, w: 5.8, h: 3.5,
    fill: { color: "D9E8F5" },
    line: { color: "2F5496", width: 2 }
});

slide11.addText("Audit Trail (AUDIT_LOG Table)", {
    x: 7.3, y: 1.3, w: 5.2, h: 0.3,
    fontSize: 11, bold: true, color: "000000", fontFace: fontFace
});

const auditInfo = [
    "✓ User attribution for changes",
    "✓ Timestamp on all transactions",
    "✓ Before/after values stored",
    "✓ IP address and browser info",
    "✓ Change reason tracking",
    "✓ Module and action logged",
    "✓ Immutable ledger format",
    "✓ Compliance ready"
];

yPos = 1.75;
auditInfo.forEach((item, idx) => {
    slide11.addText(item, {
        x: 7.3, y: yPos + (idx * 0.35), w: 5.2, h: 0.3,
        fontSize: 10, color: "000000", fontFace: fontFace
    });
});

// ===========================
// SLIDE 12: Summary & Conclusion
// ===========================
let slide12 = prs.addSlide();
slide12.background = { color: "2F5496" };

slide12.addText("TCV CORE - Database Summary", {
    x: 0.5, y: 0.8, w: 12.333, h: 0.5,
    fontSize: 36, bold: true, color: "FFFFFF", align: "center", fontFace: fontFace
});

const summaryPoints = [
    "✓ 22 Normalized Tables | 50+ Relationships | 80+ Indexes",
    "✓ MySQL 8.0+ | InnoDB Engine | UTF8MB4 Encoding",
    "✓ 3NF Normalization | ACID Compliance | Data Integrity",
    "✓ Comprehensive Audit Trail | Security Measures",
    "✓ High-Performance Queries | Scalable Architecture",
    "✓ Support for Purchase, Sales, Service & Warranty Workflows",
    "✓ Financial Tracking | Payment Management | Stock Ledger",
    "✓ Role-Based Access Control | Multi-Level Approvals"
];

yPos = 1.8;
summaryPoints.forEach((item, idx) => {
    slide12.addText(item, {
        x: 0.8, y: yPos + (idx * 0.45), w: 11.5, h: 0.4,
        fontSize: 12, color: "E7E6E6", fontFace: fontFace, bold: true
    });
});

slide12.addText("Ready for Production Deployment", {
    x: 0.5, y: 6.5, w: 12.333, h: 0.4,
    fontSize: 14, color: "92D050", align: "center", fontFace: fontFace, bold: true, italic: true
});

// Save presentation
prs.writeFile({ fileName: "TCV_Core_Database_Architecture.pptx" });
console.log("✓ PowerPoint presentation created successfully!");
console.log("✓ File: TCV_Core_Database_Architecture.pptx");
