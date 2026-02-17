/**
 * E-commerce event helpers
 */
import { EventPayload } from './collect';

export type EcommerceAction = 'view_item' | 'add_to_cart' | 'remove_from_cart' | 'begin_checkout' | 'purchase' | 'refund';

export interface EcommerceData {
  order_id?: string;
  total?: number;
  revenue?: number;
  currency?: string;
  items?: Array<{
    id: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }>;
  [key: string]: any;
}

export function createEcommercePayload(
  action: EcommerceAction,
  data: EcommerceData
): Partial<EventPayload> {
  return {
    event_type: 'ecommerce',
    event_name: action,
    ecommerce_action: action,
    order_id: data.order_id || null,
    revenue: data.total ?? data.revenue ?? null,
    currency: data.currency || 'EUR',
    ecommerce_items: data.items || null,
    event_data: data,
  };
}
