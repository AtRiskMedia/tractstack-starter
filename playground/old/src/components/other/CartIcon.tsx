import { useEffect, useState } from "react";
import ShoppingCartIcon from "@heroicons/react/24/outline/ShoppingCartIcon";
import { useStore } from "@nanostores/react";
import { initCart, cart } from "../../store/cart";

export const CartIcon = () => {
  const $cartPayload = useStore(cart);
  const [show, setShow] = useState(false);

  useEffect(() => {
    initCart();
    if ($cartPayload && $cartPayload.totalQuantity > 0) setShow(true);
  }, [$cartPayload]);

  if (!show) return null;
  return (
    <a title={`Shopping Cart`} href="/cart" className="pr-2 relative">
      <ShoppingCartIcon className="relative h-6 w-6 mx-2 text-mydarkgrey hover:text-myblue" />
      {$cartPayload && $cartPayload.totalQuantity > 0 ? (
        <span className="absolute z-99 top-0 right-0 h-5 w-5 text-xs rounded-full bg-mydarkgrey bg-opacity-25 text-mydarkgrey flex justify-center items-center items">
          {$cartPayload.totalQuantity}
        </span>
      ) : null}
    </a>
  );
};
