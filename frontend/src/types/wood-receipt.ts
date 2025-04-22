import type { WoodType } from './calculations';

export type ReceiptStatus = 'PENDING' | 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface WoodReceipt {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  wood_type_id: string;
  wood_type?: WoodType;
  supplier: string;
  purchase_date: string;
  purchase_order: string;
  total_volume_m3: number;
  total_pieces: number;
  notes: string;
  status: ReceiptStatus;
  lot_number: string;
  invoice_number: string;
  documents: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface WoodReceiptItem {
  id: string;
  receipt_id: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  volume_m3: number;
  grade: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WoodSlicingOperation {
  id: string;
  receipt_item_id: string;
  status: 'planned' | 'in_progress' | 'completed';
  planned_quantity: number;
  completed_quantity: number;
  waste_percentage: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
} 