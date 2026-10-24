// Pure cart helpers: they return new arrays/objects and never touch state or the DOM.

export const discountedPrice = ({ price, discountPercentage = 0 }) => price * (1 - discountPercentage / 100);

export const lineTotal = (line) => discountedPrice(line) * line.quantity;

const toLine = (product, quantity) => ({
  id: product.id,
  title: product.title,
  price: product.price,
  discountPercentage: product.discountPercentage ?? 0,
  thumbnail: product.thumbnail,
  stock: product.stock,
  minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
  quantity,
});

// Returns an error message, or '' when the quantity can be added.
export function checkAddable(cart, product, quantity) {
  const minimum = product.minimumOrderQuantity ?? 1;
  const inCart = cart.find((line) => line.id === product.id)?.quantity ?? 0;
  if (!Number.isInteger(quantity) || quantity < 1) return 'Enter a whole number of 1 or more.';
  if (inCart === 0 && quantity < minimum) return `The minimum order is ${minimum}.`;
  if (inCart + quantity > product.stock) {
    return `Only ${product.stock} in stock${inCart ? ` (${inCart} already in your cart)` : ''}.`;
  }
  return '';
}

export function addLine(cart, product, quantity) {
  const exists = cart.some((line) => line.id === product.id);
  return exists
    ? cart.map((line) => (line.id === product.id ? { ...line, quantity: line.quantity + quantity } : line))
    : [...cart, toLine(product, quantity)];
}

export const changeQuantity = (cart, id, delta) =>
  cart.map((line) => (line.id !== id ? line : {
    ...line,
    quantity: Math.min(line.stock, Math.max(line.minimumOrderQuantity, line.quantity + delta)),
  }));

export const removeLine = (cart, id) => cart.filter((line) => line.id !== id);

export function cartTotals(cart) {
  return cart.reduce((totals, line) => {
    const gross = line.price * line.quantity;
    const net = lineTotal(line);
    return { subtotal: totals.subtotal + gross, discount: totals.discount + (gross - net), total: totals.total + net };
  }, { subtotal: 0, discount: 0, total: 0 });
}
