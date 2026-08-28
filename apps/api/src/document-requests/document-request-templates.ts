import { ServiceCategory } from '@prisma/client';

/**
 * Starter checklists for "smart document requests" (product spec section
 * 27): picking a service category prefills a suggested list of documents,
 * fully editable afterwards. These are convenience defaults, not statutory
 * rules — never treated as compliance requirements themselves.
 */
export const DOCUMENT_REQUEST_TEMPLATES: Partial<Record<ServiceCategory, string[]>> = {
  GST: ['GSTR-1 working', 'GSTR-3B working', 'Sales register', 'Purchase register', 'E-way bills (if any)'],
  TDS: ['Challan copies', 'Deductee details', 'PAN details of deductees', 'Previous quarter TDS return'],
  INCOME_TAX: [
    'Bank statement',
    'Investment proofs',
    'Form 16',
    'Interest certificate',
    'AIS/TIS',
    'Property documents',
    'Other income proof',
  ],
  AUDIT: [
    'Trial balance',
    'Bank statements',
    'Fixed asset register',
    'Stock statement',
    'Loan confirmations',
    'Previous year audit report',
  ],
  ROC: ['Board resolution', 'Financial statements', 'Director KYC', 'Shareholding details'],
};
