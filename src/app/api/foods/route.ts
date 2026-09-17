import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Food } from "@/types/nutrition";

// Load foods once at module level (cached in memory between requests)
let foodsCache: Food[] | null = null;

function loadFoods(): Food[] {
  if (foodsCache) return foodsCache;
  const filePath = path.join(process.cwd(), "src", "data", "foods.json");
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    foodsCache = JSON.parse(raw) as Food[];
    return foodsCache;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.toLowerCase().trim() ?? "";
  const id = searchParams.get("id");
  const ids = searchParams.get("ids");
  const barcode = searchParams.get("barcode") ?? (/^\d{8,14}$/.test(query) ? query : null);
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);

  const foods = loadFoods();

  if (barcode) {
    const food = foods.find((item) => item.barcode === barcode);
    return NextResponse.json(food ? [food] : []);
  }

  // Lookup by single ID
  if (id) {
    const food = foods.find((f) => f.id === id);
    return NextResponse.json(food ?? null);
  }

  // Lookup by multiple IDs
  if (ids) {
    const idList = ids.split(",");
    const found = foods.filter((f) => idList.includes(f.id));
    return NextResponse.json(found);
  }

  // Search
  if (!query) {
    return NextResponse.json([]);
  }

  const terms = query.split(" ").filter(Boolean);
  const results = foods
    .filter((food) => {
      const name = food.name.toLowerCase();
      return terms.every((term) => name.includes(term));
    })
    .slice(0, limit);

  return NextResponse.json(results);
}
