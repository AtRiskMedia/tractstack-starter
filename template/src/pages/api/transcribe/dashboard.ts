import type {APIRoute} from "astro";

export const GET: APIRoute = async ({params, request}): Promise<any> => {
    const apiKey = import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY; // Your AssemblyAI API key
    console.log("dashboard  get");

    const transcriptsEndPoint = `https://api.assemblyai.com/v2/transcript`;
    const response = await fetch(transcriptsEndPoint, {
        headers: {
            Authorization: apiKey,
        },
    });

    try {
        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }
        const json = await response.json();
        return new Response(JSON.stringify(json), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: unknown) {
        console.error("/api/transcribe/dashboard error: " + error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}