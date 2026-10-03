export type UserRole = 'USER' | 'ADMIN';
export interface User {
  id: string;
  emailVerified: boolean;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
  minecraftNickname?: string;
  minecraftUuid?: string;
}
export const productCategories = ['VIPs', 'Chaves', 'Pacotes', 'Cosméticos'] as const;
export type ProductCategory = (typeof productCategories)[number];
export interface Product {
  id: number;
  revision?: number;
  server?: string;
  purchasable?: boolean;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: ProductCategory;
  imageUrl?: string;
  active: boolean;
}
export type PromotionStatus = 'SCHEDULED' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
export interface Promotion {
  id: number;
  revision?: number;
  name: string;
  productId: number;
  originalPrice: number;
  promotionalPrice: number;
  startsAt: string;
  endsAt: string;
  status: PromotionStatus;
}
export interface Order {
  id: number;
  userId: string;
  productName: string;
  price: number;
  purchasedAt: string;
  paymentStatus: 'SIMULATED';
  deliveryStatus: 'SIMULATED';
}
