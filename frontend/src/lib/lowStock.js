export const LOW_STOCK_THRESHOLDS = {
  sacks: 5,
  looseRiceKg: 100,
};

export function getLowStockInfo(record) {
  const category = String(
    record?.category || record?.inventory_category || ""
  ).toLowerCase();

  if (category.includes("bran") || category.includes("broken")) {
    return null;
  }

  const sackSize = Number(
    record?.sack_weight_kg ?? record?.sack_size_kg ?? 0
  );

  if (sackSize > 0) {
    const sacks = Number(
      record?.sack_quantity ?? record?.available_sacks ?? 0
    );

    return sacks <= LOW_STOCK_THRESHOLDS.sacks
      ? { quantity: sacks, unit: "sacks" }
      : null;
  }

  const stock = Number(
    record?.stock_quantity ?? record?.available_stock ?? 0
  );

  return stock <= LOW_STOCK_THRESHOLDS.looseRiceKg
    ? { quantity: stock, unit: "kg" }
    : null;
}
