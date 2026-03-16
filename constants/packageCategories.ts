export interface PackageCategory {
  id: string;
  label: string;
  icon: string;
  maxWeightKg: number;
  examples: string;
}

export const PACKAGE_CATEGORIES: PackageCategory[] = [
  {
    id: 'electronics',
    label: 'Electronics',
    icon: '💻',
    maxWeightKg: 30,
    examples: 'Laptops, phones, tablets',
  },
  {
    id: 'clothing',
    label: 'Clothing & Textiles',
    icon: '👕',
    maxWeightKg: 50,
    examples: 'Clothes, fabric, shoes',
  },
  {
    id: 'food',
    label: 'Food & Groceries',
    icon: '🥘',
    maxWeightKg: 50,
    examples: 'Packaged food, spices, olive oil',
  },
  {
    id: 'cosmetics',
    label: 'Cosmetics & Personal Care',
    icon: '💄',
    maxWeightKg: 20,
    examples: 'Perfume, skincare, makeup',
  },
  {
    id: 'documents',
    label: 'Documents & Books',
    icon: '📄',
    maxWeightKg: 5,
    examples: 'Papers, contracts, books',
  },
  {
    id: 'household',
    label: 'Household Items',
    icon: '🏠',
    maxWeightKg: 100,
    examples: 'Kitchen tools, decor, small appliances',
  },
  {
    id: 'medical',
    label: 'Medical Supplies',
    icon: '💊',
    maxWeightKg: 20,
    examples: 'Medicines, medical devices',
  },
  {
    id: 'other',
    label: 'Other',
    icon: '📦',
    maxWeightKg: 100,
    examples: 'Any other items',
  },
];
