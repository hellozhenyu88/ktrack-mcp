export type TabType = 'home' | 'marketplace' | 'wallet' | 'profile' | 'advisor';

export interface Task {
  id: string;
  title: string;
  company: string;
  budget: string;
  deadline: string;
  status: 'open' | 'applied' | 'in-progress' | 'completed';
  category: string;
  location: string;
  description?: string;
  requirements?: string[];
  duration?: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  status: 'pending' | 'completed';
  description: string;
}

export interface Milestone {
  id: string;
  name: string;
  amount: number;
  status: 'pending' | 'completed';
}

export interface TaskDetail extends Task {
  milestones: Milestone[];
  contractStatus: 'unsigned' | 'signed';
  taxWithheld: number;
}

export type PlatformType = 'freelancer' | 'enterprise' | 'admin' | 'website';
