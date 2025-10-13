import type { WoodType } from './calculations';

export type ReceiptStatus = 'CREATED' | 'PENDING' | 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface WoodReceipt {
  id: string;
  wood_type_id: string;
  supplier: string;
  receipt_date: string;
  purchase_date?: string; // For frontend compatibility
  purchase_order?: string; // Made optional since it's a new column
  lot_number: string;
  status: ReceiptStatus; // Changed to use the ReceiptStatus type
  notes?: string;
  created_by?: string;
  total_volume_m3?: number; // Estimated volume
  total_pieces?: number; // Estimated pieces
  estimatedVolumeM3?: number; // Backend field name
  estimatedPieces?: number; // Backend field name
  actualVolumeM3?: number; // Actual volume after processing
  actualPieces?: number; // Actual pieces after processing
  total_amount: number;
  created_at?: string;
  updated_at?: string;
  wood_type?: {
    id: string;
    name: string;
  };
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