import {
  //TOKEN,
  //REFRESHTOKEN,
  CONCIERGE_AUTH,
  //CONCIERGE_SYNC_INTERVAL,
} from "../constant";

export async function conciergeSync() {
  const res = await fetch(CONCIERGE_AUTH);
  const data = await res.json();
  console.log(data);
  return true;
}
