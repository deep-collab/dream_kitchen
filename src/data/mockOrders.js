// SAMPLE orders for the Phase 1 Track Order demo. Phase 2 reads real orders from Supabase.
export const ORDER_STATUSES = ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']

export const mockOrders = [
  { id: 'DK-0101', phone: '9876543210', status: 'preparing', deliveryDate: null, daysFromNow: 2 },
  { id: 'DK-0102', phone: '9876543210', status: 'out_for_delivery', deliveryDate: null, daysFromNow: 0 },
]
