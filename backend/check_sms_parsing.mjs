import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const smsText = `Malipo yamekamilika.19ae2eb891659aeb 9007253370934415323 TOKEN 1471 8551 8870 2747 8392 2802.8KWH Cost 818442.63 VAT 18% 147319.67 EWURA 1% 8184.43 REA 3% 24553.27 Debt Collected 1500.00 TOTAL TZS 1000000.00 2025-12-03 09:34`;

console.log('=== SMS PARSING TEST ===\n');
console.log('Original SMS:');
console.log(smsText);
console.log('\n--- EXTRACTING DATA ---\n');

// Token
const tokenMatch = smsText.match(/TOKEN\s+([\d\s]+)/);
const token = tokenMatch ? tokenMatch[1].replace(/\s+/g, '') : '';
console.log('Token:', token);

// kWh
const kwhMatch = smsText.match(/([\d.]+)KWH/);
const kwhAmount = kwhMatch ? parseFloat(kwhMatch[1]) : 0;
console.log('kWh Amount:', kwhAmount);

// Cost
const costMatch = smsText.match(/Cost\s+([\d.]+)/);
const baseCost = costMatch ? parseFloat(costMatch[1]) : undefined;
console.log('Base Cost:', baseCost);

// VAT
const vatMatch = smsText.match(/VAT\s+\d+%\s+([\d.]+)/);
const vat = vatMatch ? parseFloat(vatMatch[1]) : undefined;
console.log('VAT (18%):', vat);

// EWURA
const ewuraMatch = smsText.match(/EWURA\s+\d+%\s+([\d.]+)/);
const ewuraFee = ewuraMatch ? parseFloat(ewuraMatch[1]) : undefined;
console.log('EWURA Fee (1%):', ewuraFee);

// REA
const reaMatch = smsText.match(/REA\s+\d+%\s+([\d.]+)/);
const reaFee = reaMatch ? parseFloat(reaMatch[1]) : undefined;
console.log('REA Fee (3%):', reaFee);

// Debt
const debtMatch = smsText.match(/Debt Collected\s+([\d.]+)/);
const debtCollected = debtMatch ? parseFloat(debtMatch[1]) : undefined;
console.log('Debt Collected:', debtCollected);

// Total
const totalMatch = smsText.match(/TOTAL\s+TZS\s+([\d.]+)/);
const totalPaid = totalMatch ? parseFloat(totalMatch[1]) : 0;
console.log('TOTAL PAID:', totalPaid);

// Date
const dateMatch = smsText.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/);
const rechargeDate = dateMatch ? new Date(dateMatch[1]) : new Date();
console.log('Recharge Date:', rechargeDate.toISOString());

console.log('\n--- VERIFICATION ---\n');
const calculatedTotal = (baseCost || 0) + (vat || 0) + (ewuraFee || 0) + (reaFee || 0) + (debtCollected || 0);
console.log('Calculated Total (Sum of all fees):', calculatedTotal.toFixed(2));
console.log('Parsed Total from SMS:', totalPaid);
console.log('Difference:', (totalPaid - calculatedTotal).toFixed(2));

console.log('\n--- WHAT SHOULD BE IN DATABASE ---\n');
console.log('Token:', token);
console.log('kwhAmount:', kwhAmount);
console.log('totalPaid:', totalPaid, '← This should be 1,000,000');
console.log('baseCost:', baseCost);
console.log('vat:', vat);
console.log('ewuraFee:', ewuraFee);
console.log('reaFee:', reaFee);
console.log('debtCollected:', debtCollected);

await prisma.$disconnect();
