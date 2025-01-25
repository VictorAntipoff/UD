export interface WoodType {
  id: string;
  name: string;
  description: string | null;
  density: number | null;
  grade: 'A' | 'B' | 'C' | 'D';
  origin: string | null;
}

export interface PlankDimensions {
  thickness: number;
  width: number;
  length: number;
  pricePerPlank: number;
  woodTypeId: string;
  notes: string;
}

export interface CalculationResult {
  dimensions: PlankDimensions;
  volumeM3: number;
  planksPerM3: number;
  pricePerM3: number;
  timestamp: string;
  woodType: WoodType;
  notes: string;
  id: string;
  userId: string;
} 