
export enum GigStatus {
  Pending = 'Pending',
  Paid = 'Paid',
}

export interface FileAttachment {
  name: string;
  type: string;
  dataUrl: string;
}

export interface Package {
  id: string;
  name: string; // e.g. "Jan 2026 Implementation"
  clientName: string;
  totalPrice: number;
  billingDate?: string; // YYYY-MM-DD (Optional - unbilled packages)
  maxWorkshops: number;
  maxHours: number;
  status: GigStatus; // To track if the package itself is paid
  createdAt: string;
  backgroundColor?: string;
}

export interface Gig {
  id: string;
  name: string;
  supplierName?: string;
  paymentAmount: number;
  eventDate: string; // YYYY-MM-DD
  paymentDueDate: string; // YYYY-MM-DD
  status: GigStatus;
  createdAt: string; // ISO 8601
  invoiceNumber?: string;
  notes?: string;
  attachments?: FileAttachment[];
  duration?: number; // Duration in hours
  summary?: string;
  // Package Linking
  packageId?: string; // If linked to a package
  usageType?: 'workshop' | 'consulting'; // How it counts towards the package quota
  backgroundColor?: string;
}

export type GigFilterStatus = 'All' | 'Pending' | 'Paid' | 'Overdue';

export interface ParsedGig {
  name: string;
  supplierName?: string;
  paymentAmount: number;
  eventDate: string; // YYYY-MM-DD
  duration?: number; // Duration in hours
}

export interface RewardNote {
  id: string;
  content: string;
  color: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  monthlyAmount: number;
  paymentType: string; // e.g. 'Credit Card', 'Bank Transfer', 'Bit'
  category: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  chargeDayRule?: string; // e.g., "10", "End of month"
  notes?: string;
  isEssential?: boolean;
  isActive: boolean;
}

export interface MonthlyExpenseInstance {
  id?: string; // Firestore ID
  monthKey: string; // YYYY-MM
  amount: number;
  sourceRecurringExpenseId?: string;
  isOneTime: boolean;
  notes?: string;
}
