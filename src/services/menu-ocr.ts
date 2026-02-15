// Menu OCR Service Interface & Mock Implementation

export interface MenuOcrItem {
  name: string
  price?: number
  category?: string
}

export interface MenuOcrService {
  extractItemsFromImage(file: File | Blob): Promise<MenuOcrItem[]>
}

/**
 * Mock implementation that returns sample menu items.
 * Replace with a real OCR provider (e.g., Google Vision, AWS Textract) later.
 */
export class MockMenuOcrService implements MenuOcrService {
  async extractItemsFromImage(_file: File | Blob): Promise<MenuOcrItem[]> {
    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return [
      { name: 'Caesar Salad', price: 12.99, category: 'Appetizer' },
      { name: 'Margherita Pizza', price: 16.99, category: 'Main' },
      { name: 'Grilled Salmon', price: 24.99, category: 'Main' },
      { name: 'Mushroom Risotto', price: 18.99, category: 'Main' },
      { name: 'Tiramisu', price: 9.99, category: 'Dessert' },
      { name: 'Garlic Bread', price: 7.99, category: 'Appetizer' },
      { name: 'Lemonade', price: 4.99, category: 'Drink' },
    ]
  }
}
