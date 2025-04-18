export interface PlankDimensions {
  thickness: number;
  width: number;
  length: number;
  pricePerPlank: number;
  woodTypeId: string;
  notes: string;
  taxPercentage: number;
  isPriceWithVAT: boolean;
}

export interface WoodType {
  id: string;
  name: string;
  description: string | null;
  density: number | null;
  grade: 'A' | 'B' | 'C' | 'D';
  origin: string | null;
}

export interface CalculationResult {
  id: string;
  userId: string;
  dimensions: PlankDimensions;
  volumeM3: number;
  planksPerM3: number;
  pricePerM3: number;
  pricePerM3WithTax: number;
  timestamp: string;
  woodType: WoodType;
  notes: string;
  taxPercentage: number;
} 