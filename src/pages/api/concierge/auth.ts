import type { APIRoute } from "astro";

/*
export const GET: APIRoute = ({ params, request }) => {
  console.log(`GET`, params);
  return new Response(
    JSON.stringify({
      message: "This was a GET!",
    })
  );
};
*/

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("Content-Type") === "application/json") {
    const body = await request.json();
    const fingerprint = body.fingerprint?.fingerprint;

    // now connect to concierge backend via ?
    console.log(`this is where we talk to the backend`);
    console.log(
      `need to add refreshToken + jwt cookies, then fetch the backend`
    );

    const message = fingerprint
      ? `Your fingerprint was: ${fingerprint}`
      : `No fingerprint provided`;

    return new Response(
      JSON.stringify({
        message,
      }),
      {
        status: 200,
      }
    );
  }
  return new Response(null, { status: 400 });
};
