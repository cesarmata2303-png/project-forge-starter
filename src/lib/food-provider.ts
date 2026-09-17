import type { Food } from "@/types/nutrition";

/** Stable boundary for replacing the bundled catalog with a licensed provider. */
export interface FoodProvider {
  search(query: string, limit?: number): Promise<Food[]>;
  findByBarcode(barcode: string): Promise<Food | null>;
}

export class ForgeFoodProvider implements FoodProvider {
  async search(query: string, limit = 30): Promise<Food[]> {
    const response = await fetch(`/api/foods?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!response.ok) throw new Error("Food search failed.");
    return response.json() as Promise<Food[]>;
  }

  async findByBarcode(barcode: string): Promise<Food | null> {
    const response = await fetch(`/api/foods?barcode=${encodeURIComponent(barcode)}`);
    if (!response.ok) throw new Error("Barcode lookup failed.");
    const foods = await response.json() as Food[];
    return foods[0] ?? null;
  }
}
