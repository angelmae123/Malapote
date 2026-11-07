
export const CART_KEY = "agristock_cart";
export const CART_CHANGE_EVENT = "agristock-cart-change";

export function getSackWeight(item) {
  return Number(item?.sack_size_kg ?? item?.sack_weight_kg ?? 0);
}

export function getSellableStock(item) {
  const stockKg = Math.max(0, Number(item?.stock_quantity || 0));
  const sackWeight = getSackWeight(item);

  // Loose rice: available quantity is in kilograms.
  if (sackWeight <= 0) {
    return stockKg;
  }

  // Sack products: only complete sacks can be sold.
  return Math.floor(stockKg / sackWeight);
}

export function readCart() {
  const storedCart = window.localStorage.getItem(CART_KEY);

  if (!storedCart) return [];

  const cart = JSON.parse(storedCart);

  if (!Array.isArray(cart)) {
    throw new Error("Saved cart data is invalid.");
  }

  return cart;
}

export function writeCart(items) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function getCartItemCount(items) {
  return items.reduce(
    (total, item) =>
      total + Math.max(0, Number(item.quantity || 0)),
    0,
  );
}

export function addProductToCart(product, cart, quantity = 1) {
  const stock = getSellableStock(product);
  const selectedQuantity = Number(quantity);
  const sackWeight = getSackWeight(product);
  const unit = sackWeight > 0 ? "sacks" : "kg";

  if (!Number.isInteger(selectedQuantity) || selectedQuantity < 1) {
    throw new Error("Please enter a valid quantity.");
  }

  if (stock <= 0) {
    throw new Error("This product is currently out of stock.");
  }

  const productId = String(product.id);

  const existing = cart.find(
    (item) => String(item.id ?? item.product_id) === productId,
  );

  const currentQuantity = existing
    ? Number(existing.quantity || 0)
    : 0;

  const newQuantity = currentQuantity + selectedQuantity;

  if (newQuantity > stock) {
    throw new Error(
      `Only ${stock} ${unit} are available. You already have ${currentQuantity} in your cart.`,
    );
  }

  if (existing) {
    return cart.map((item) =>
      String(item.id ?? item.product_id) === productId
        ? {
            ...item,
            quantity: newQuantity,
            stock_quantity: Number(product.stock_quantity || 0),
            sack_quantity: stock,
            sack_size_kg: sackWeight,
            sack_weight_kg: sackWeight,
            available_quantity: stock,
          }
        : item,
    );
  }

  return [
    ...cart,
    {
      ...product,
      id: product.id,
      product_name: product.product_name,
      price: Number(product.price || 0),
      quantity: selectedQuantity,
      stock_quantity: Number(product.stock_quantity || 0),
      sack_quantity: sackWeight > 0 ? stock : 0,
      sack_size_kg: sackWeight,
      sack_weight_kg: sackWeight,
      available_quantity: stock,
    },
  ];
}
