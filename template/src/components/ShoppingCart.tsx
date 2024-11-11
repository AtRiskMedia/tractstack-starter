import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { cart, removeCartItems, isCartUpdating } from "../store/cart";
import { Money } from "./other/Money";
import { ShopifyImage } from "./other/ShopifyImage";

const ShoppingCart = () => {
  const $isCartUpdating = useStore(isCartUpdating);
  const $cart = useStore(cart);

  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
  }, []);

  function removeItem(id: string) {
    removeCartItems([id]);
  }

  if (!show) return <div />;
  return (
    <div className="max-w-lg mx-auto py-16">
      <div className="flex-1">
        <div className="px-5">
          {$cart && $cart.lines?.nodes.length > 0 ? (
            <ul role="list" className="divide-y divide-slate-100 {cartIsUpdatingClass}">
              {$cart.lines?.nodes.map((item) => (
                <li className="grid py-8 grid-cols-12 gap-3" key={item.id}>
                  <div className="overflow-hidden rounded-lg col-span-3 lg:col-span-2">
                    <ShopifyImage
                      image={item.merchandise.image}
                      classList="object-cover h-full object-center aspect-1"
                      sizes="(min-width: 100px) 100px"
                      loading="lazy"
                    />
                  </div>
                  <div className="col-span-7 lg:col-span-8 flex flex-col gap-2">
                    <a
                      className="hover:underline w-fit"
                      href={`/products/${item.merchandise.product.handle}`}
                    >
                      {item.merchandise.product.title}
                    </a>
                    <p className="text-xs">
                      <Money price={item.cost.amountPerQuantity} />
                    </p>
                  </div>
                  <div className="col-span-2 items-end flex justify-between flex-col">
                    <button
                      onClick={() => {
                        removeItem(item.id);
                      }}
                      type="button"
                      disabled={$isCartUpdating}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    </button>
                    <div>
                      <p className="">
                        <Money price={item.cost.totalAmount} />
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center mt-20">
              <p className="text-mydarkgrey">Your cart is empty</p>
            </div>
          )}
        </div>
      </div>

      <div className="">
        {$cart && $cart.lines?.nodes.length > 0 ? (
          <div className="border-t border-slate-200 py-6 px-4 xs:px-6">
            <div className="flex justify-between text-base text-mydarkgrey">
              <p>Subtotal</p>
              <p>
                <Money price={$cart.cost.subtotalAmount} showCurrency={true} />
              </p>
            </div>
            <p className="mt-0.5 text-sm text-mydarkgrey">
              Shipping and taxes calculated at checkout.
            </p>
            <div className="py-16 text-center">
              <a
                href={$cart.checkoutUrl}
                className="button mt-10 w-full rounded-md bg-myorange/10 px-10 py-3 hover:bg-black hover:text-white"
              >
                Checkout
              </a>
            </div>

            <div className="text-center">
              <a href="/" className="text-xs text-black hover:text-myblue">
                Continue Shopping
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ShoppingCart;
