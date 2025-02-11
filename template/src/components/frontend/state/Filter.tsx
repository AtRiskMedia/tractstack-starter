import type { BeliefDatum } from "../../../types";
import { useFilterPane } from "@/components/frontend/state/UseFilterPane.ts";

const Filter = (props: {
  id: string;
  heldBeliefsFilter: BeliefDatum;
  withheldBeliefsFilter: BeliefDatum;
}) => {
  const { id, heldBeliefsFilter, withheldBeliefsFilter } = props;

  useFilterPane(id, heldBeliefsFilter, withheldBeliefsFilter);

  return null;
};

export default Filter;
