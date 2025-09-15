
export enum GigStatus {
  Pending = 'Pending',
  Paid = 'Paid',
}

export interface FileAttachment {
  name: string;
  type: string;
  dataUrl: string;
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
}

export type GigFilterStatus = 'All' | 'Pending' | 'Paid' | 'Overdue';

export interface ParsedGig {
  name: string;
  supplierName?: string;
  paymentAmount: number;
  eventDate: string; // YYYY-MM-DD
}