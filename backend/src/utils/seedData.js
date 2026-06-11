import Client from "../models/Client.js";
import Property from "../models/Property.js";
import Agreement from "../models/Agreement.js";
import Invoice from "../models/Invoice.js";

export async function seedIfEmpty() {
  const clientCount = await Client.countDocuments();
  if (clientCount > 0) return;

  const clients = await Client.insertMany([
    {
      name: "Acme Corp",
      email: "accounts@acme.com",
      phone: "+91 98765 43210",
      status: "active",
    },
    {
      name: "GreenLeaf Retail",
      email: "finance@greenleaf.in",
      phone: "+91 91234 56789",
      status: "active",
    },
    {
      name: "TechNova Pvt Ltd",
      email: "billing@technova.com",
      phone: "+91 99887 76655",
      status: "active",
    },
    {
      name: "Sunrise Foods",
      email: "payables@sunrise.in",
      phone: "+91 97654 32100",
      status: "overdue",
    },
  ]);

  const properties = await Property.insertMany([
    {
      name: "Unit 4B, Phoenix Tower",
      address: "Andheri East, Mumbai",
      type: "Office",
      area: "1,200 sq ft",
      status: "occupied",
    },
    {
      name: "Shop 12, Mall Road",
      address: "Koramangala, Bangalore",
      type: "Retail",
      area: "850 sq ft",
      status: "occupied",
    },
    {
      name: "Floor 3, IT Park",
      address: "HITEC City, Hyderabad",
      type: "Office",
      area: "4,500 sq ft",
      status: "occupied",
    },
    {
      name: "Warehouse A2",
      address: "Bhiwandi, Maharashtra",
      type: "Warehouse",
      area: "8,000 sq ft",
      status: "occupied",
    },
  ]);

  const agreements = await Agreement.insertMany([
    {
      agreementCode: "AGR-001",
      client: clients[0]._id,
      property: properties[0]._id,
      startDate: "2025-06-01",
      endDate: "2026-04-30",
      rent: 85000,
      cam: 12000,
      invoiceDay: 5,
      status: "active",
    },
    {
      agreementCode: "AGR-002",
      client: clients[1]._id,
      property: properties[1]._id,
      startDate: "2025-07-15",
      endDate: "2026-06-14",
      rent: 125000,
      cam: 18000,
      invoiceDay: 5,
      status: "active",
    },
    {
      agreementCode: "AGR-003",
      client: clients[2]._id,
      property: properties[2]._id,
      startDate: "2025-05-01",
      endDate: "2026-03-31",
      rent: 210000,
      cam: 35000,
      invoiceDay: 1,
      status: "active",
    },
  ]);

  await Invoice.insertMany([
    {
      invoiceNumber: "INV-2026-038",
      agreement: agreements[2]._id,
      periodLabel: "May 2026",
      amount: 245000,
      invoiceDate: "2026-05-01",
      dueDate: "2026-05-08",
      status: "sent",
    },
    {
      invoiceNumber: "INV-2026-035",
      agreement: agreements[0]._id,
      periodLabel: "Apr 2026",
      amount: 97000,
      invoiceDate: "2026-04-05",
      dueDate: "2026-04-12",
      status: "paid",
    },
    {
      invoiceNumber: "INV-2026-029",
      agreement: agreements[1]._id,
      periodLabel: "Apr 2026",
      amount: 143000,
      invoiceDate: "2026-04-05",
      dueDate: "2026-04-12",
      status: "paid",
    },
  ]);
}
