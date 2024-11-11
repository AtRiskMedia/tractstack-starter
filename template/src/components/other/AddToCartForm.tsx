import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { addCartItem, isCartUpdating, cart } from "../../store/cart";
import type { FormEvent } from "react";

export const AddToCartForm = ({
  variantId,
  variantQuantityAvailable,
  variantAvailableForSale,
}: {
  variantId: string;
  variantQuantityAvailable: number;
  variantAvailableForSale: boolean;
}) => {
  const [show, setShow] = useState(false);
  const $isCartUpdating = useStore(isCartUpdating);
  const $cart = useStore(cart);
  // Check if the variant is already in the cart and if there are any units left
  const variantInCart =
    $cart && $cart.lines?.nodes.filter((item) => item.merchandise.id === variantId)[0];
  const noQuantityLeft = variantInCart && variantQuantityAvailable <= variantInCart?.quantity;

  function addToCart(e: FormEvent<HTMLFormElement>) {
    e.preventDefault;
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const { id, quantity } = Object.fromEntries(formData);
    const item = {
      id: id as string,
      quantity: parseInt(quantity as string),
    };
    addCartItem(item);
  }

  useEffect(() => {
    if (!show) setShow(true);
  }, []);

  if (!show) return <div />;

  return (
    <form onSubmit={(e) => addToCart(e)}>
      <input type="hidden" name="id" value={variantId} />
      <input type="hidden" name="quantity" value="1" />

      <button
        type="submit"
        className="button mt-10 w-full rounded-md bg-myorange/10 px-3 py-5 hover:bg-black hover:text-white"
        disabled={$isCartUpdating || noQuantityLeft || !variantAvailableForSale}
      >
        {$isCartUpdating ? (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : null}
        {variantAvailableForSale ? `Add to bag` : `Sold out`}
      </button>

      {noQuantityLeft ? (
        <div className="text-center text-red-600">
          <small>
            All units left are in your{" "}
            <a href="/cart" className="underline hover:text-myblue">
              cart
            </a>
          </small>
        </div>
      ) : null}
    </form>
  );
};
