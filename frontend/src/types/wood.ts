export interface WoodType {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  qrCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WoodTypeFormData {
  name: string;
  description?: string;
  price: number;
  stock: number;
} 