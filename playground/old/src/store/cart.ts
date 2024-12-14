import type { z } from "zod";
import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import { getCart, addCartLines, createCart, removeCartLines } from "../utils/shopify/shopify";
import type { CartResult } from "../utils/shopify/schemas";

export const isCartUpdating = atom(false);

const emptyCart = {
  id: "",
  checkoutUrl: "",
  totalQuantity: 0,
  lines: { nodes: [] },
  cost: { subtotalAmount: { amount: "", currencyCode: "" } },
};

export const cart = persistentAtom<z.infer<typeof CartResult>>("cart", emptyCart, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export async function initCart() {
  const sessionStarted = sessionStorage.getItem("sessionStarted");
  if (!sessionStarted) {
    sessionStorage.setItem("sessionStarted", "true");
    const localCart = cart.get();
    const cartId = localCart?.id;
    if (cartId) {
      const data = await getCart(cartId);

      if (data) {
        cart.set({
          id: data.id,
          cost: data.cost,
          checkoutUrl: data.checkoutUrl,
          totalQuantity: data.totalQuantity,
          lines: data.lines,
        });
      } else {
        cart.set(emptyCart);
      }
    }
  }
}

export async function addCartItem(item: { id: string; quantity: number }) {
  const localCart = cart.get();
  const cartId = localCart?.id;

  isCartUpdating.set(true);

  if (!cartId) {
    const cartData = await createCart(item.id, item.quantity);

    if (cartData) {
      cart.set({
        ...cart.get(),
        id: cartData.id,
        cost: cartData.cost,
        checkoutUrl: cartData.checkoutUrl,
        totalQuantity: cartData.totalQuantity,
        lines: cartData.lines,
      });
      isCartUpdating.set(false);
    }
  } else {
    const cartData = await addCartLines(cartId, item.id, item.quantity);

    if (cartData) {
      cart.set({
        ...cart.get(),
        id: cartData.id,
        cost: cartData.cost,
        checkoutUrl: cartData.checkoutUrl,
        totalQuantity: cartData.totalQuantity,
        lines: cartData.lines,
      });
      isCartUpdating.set(false);
    }
  }
}

export async function removeCartItems(lineIds: string[]) {
  const localCart = cart.get();
  const cartId = localCart?.id;

  isCartUpdating.set(true);

  if (cartId) {
    const cartData = await removeCartLines(cartId, lineIds);

    if (cartData) {
      cart.set({
        ...cart.get(),
        id: cartData.id,
        cost: cartData.cost,
        checkoutUrl: cartData.checkoutUrl,
        totalQuantity: cartData.totalQuantity,
        lines: cartData.lines,
      });
      isCartUpdating.set(false);
    }
  }
}
