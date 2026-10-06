'use client';
import { useReducer, useMemo } from 'react';

const initial = { items: [], discount: { type: 'flat', value: 0 } };

const reducer = (state, a) => {
  switch (a.type) {
    case 'ADD': {
      const ex = state.items.find(i => i.id === a.product.id);
      const items = ex
        ? state.items.map(i => i.id === ex.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...state.items, { ...a.product, quantity: 1 }];
      return { ...state, items };
    }
    case 'SET_QTY':
      return {
        ...state,
        items: state.items
          .map(i => i.id === a.id ? { ...i, quantity: Math.max(0, a.quantity) } : i)
          .filter(i => i.quantity > 0),
      };
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.id !== a.id) };
    case 'SET_DISCOUNT':
      return { ...state, discount: a.discount };
    case 'CLEAR':
      return initial;
    default:
      return state;
  }
};

export default function useCart() {
  const [state, dispatch] = useReducer(reducer, initial);

  const totals = useMemo(() => {
    const subtotal = state.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
    const tax = state.items.reduce(
      (s, i) => s + Number(i.price) * i.quantity * Number(i.tax_rate || 0) / 100, 0);
    const d = state.discount.type === 'percent'
      ? subtotal * Number(state.discount.value) / 100
      : Number(state.discount.value) || 0;
    const discount = Math.min(d, subtotal + tax);
    return { subtotal, tax, discount, total: subtotal + tax - discount };
  }, [state]);

  return { ...state, totals, dispatch };
}