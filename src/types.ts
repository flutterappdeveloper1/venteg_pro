export type UnitType = 'kg' | 'piece';

export interface Product {
  id: string;
  name: string;
  unit: UnitType;
  stock: number;
  totalAddedQuantity: number; // For tracking total investment
  costPrice: number; // ক্রয় মূল্য
  sellingPrice: number; // বিক্রয় মূল্য
  category: string;
}

export type PaymentMethod = 'cod' | 'online';
export type OrderStatus = 'pending' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  customerEmail?: string; // Optional email for tracking logged in users' orders
  paymentNumber?: string; // bKash/Nagad/Rocket sender number for online payments
  trxId?: string; // Transaction ID for online payments
}

export interface SubAdmin {
  email: string;
  addedAt: string;
  addedBy: string;
}

export interface SalesRecord {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  profit: number;
  date: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  createdAt: string;
  addedBy: string;
}

