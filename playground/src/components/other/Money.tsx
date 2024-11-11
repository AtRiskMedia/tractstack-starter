import type { z } from "zod";
import type { MoneyV2Result } from "../../utils/shopify/schemas";

export const Money = ({
  price,
  showCurrency = false,
}: {
  price: z.infer<typeof MoneyV2Result>;
  showCurrency?: boolean;
}) => {
  const formatPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currencyCode,
    currencyDisplay: showCurrency ? "symbol" : "narrowSymbol",
  }).format(parseFloat(price.amount));

  return <span>{formatPrice}</span>;
};
