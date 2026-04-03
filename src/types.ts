export type TaskStatus = 'draft' | 'published' | 'bidding' | 'in_progress' | 'verifying' | 'settling' | 'completed';

export interface Milestone {
  id: string;
  name: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed';
  evidenceUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  clientName: string;
  amount: number;
  status: TaskStatus;
  deadline: string;
  milestones: Milestone[];
  createdAt: string;
  contractId?: string;
  contractStatus?: 'unsigned' | 'signed';
}

export interface Transaction {
  id: string;
  type: 'income' | 'withdrawal' | 'tax_payment' | 'fee';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  date: string;
  description: string;
  relatedTaskId?: string;
}

export interface UserProfile {
  uid: string;
  name: string;
  avatar: string;
  role: 'freelancer' | 'client';
  isVerified: boolean;
  continuousMonths: number;
  cumulativeIncomeYear: number;
  cumulativeTaxPaidYear: number;
  balance: number;
  notifications?: Notification[];
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface Invoice {
  id: string;
  taskId: string;
  amount: number;
  type: 'personal' | 'enterprise';
  status: 'pending' | 'issued' | 'failed';
  date: string;
  category: string;
  pdfUrl?: string;
}

export interface KYCStatus {
  step: 'identity' | 'face' | 'bank' | 'completed';
  status: 'pending' | 'processing' | 'verified' | 'failed';
  verifiedAt?: string;
}

export interface AnnualSettlement {
  year: number;
  totalIncome: number;
  totalTaxPaid: number;
  estimatedTax: number;
  refundOrPayment: number;
  status: 'pending' | 'calculated' | 'submitted';
}
