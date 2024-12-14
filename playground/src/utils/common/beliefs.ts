import type { BeliefOptionDatum } from "../../types";

const likert: BeliefOptionDatum[] = [
  {
    id: 1,
    slug: `STRONGLY_AGREES`,
    name: `Strongly agree`,
    color: `bg-teal-400`,
  },
  { id: 2, slug: `AGREES`, name: `Agree`, color: `bg-lime-400` },
  {
    id: 3,
    slug: `NEITHER_AGREES_NOR_DISAGREES`,
    name: `Neither agree nor disagree`,
    color: `bg-slate-200`,
  },
  { id: 4, slug: `DISAGREES`, name: `Disagree`, color: `bg-amber-400` },
  {
    id: 5,
    slug: `STRONGLY_DISAGREES`,
    name: `Strongly disagree`,
    color: `bg-red-400`,
  },
];

const agreement: BeliefOptionDatum[] = [
  { id: 1, slug: `AGREES`, name: `Agree`, color: `bg-lime-400` },
  { id: 2, slug: `DISAGREES`, name: `Disagree`, color: `bg-amber-400` },
];

const interest: BeliefOptionDatum[] = [
  { id: 1, slug: `INTERESTED`, name: `Interested`, color: `bg-lime-400` },
  {
    id: 2,
    slug: `NOT_INTERESTED`,
    name: `Not Interested`,
    color: `bg-amber-400`,
  },
];

const yn: BeliefOptionDatum[] = [
  { id: 1, slug: `BELIEVES_YES`, name: `Yes`, color: `bg-lime-400` },
  { id: 2, slug: `BELIEVES_NO`, name: `No`, color: `bg-amber-400` },
];

const tf: BeliefOptionDatum[] = [
  { id: 1, slug: `BELIEVES_TRUE`, name: `True`, color: `bg-lime-400` },
  { id: 2, slug: `BELIEVES_FALSE`, name: `False`, color: `bg-amber-400` },
];

const heldBeliefsTitles: { [key: string]: string } = {
  likert: `Agree or Disagree?`,
  agreement: `Agree or Disagree?`,
  interest: `Are you Interested?`,
  yn: `Yes or No?`,
  tf: `True or False?`,
};

const heldBeliefsScales = { likert, agreement, interest, yn, tf };

export { heldBeliefsScales, heldBeliefsTitles };
