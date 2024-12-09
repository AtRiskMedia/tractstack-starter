/* eslint-disable @typescript-eslint/no-explicit-any */
import { AssemblyAI } from "assemblyai";

const client = new AssemblyAI({
  apiKey: import.meta.env.PRIVATE_ASSEMBLYAI_API_KEY,
});

export async function runLemurTask(params: {
  prompt: string;
  context?: string | Record<string, any>;
  final_model?: string;
  input_text?: string;
  max_output_size?: number;
  temperature?: number;
  transcript_ids?: string[];
}) {
  try {
    const result = await client.lemur.task(params);
    return result;
  } catch (error) {
    console.error("Error in runLemurTask:", error);
    throw error;
  }
}

//const response2 = await fetch('/api/aai/lemurTask', {
//  method: 'POST',
//  headers: {
//    'Content-Type': 'application/json',
//  },
//  body: JSON.stringify({
//  prompt: `You are writing copy for a high traffic internet website. Write for an audience who is reading this website copy and is very interested in what it has to offer. Create a markdown summary of the given text following this structure: Start with a # Heading 1 web page title that's appropriate for SEO. Next a ## Heading 2 containing a catchy, concise title that encapsulates the main theme. Follow with a single paragraph that provides an overall short description, setting the context for the entire piece. Create 3-5 ### Heading 3 sections, each focusing on a key aspect or subtopic of the main theme. Each heading should be followed by one or two paragraphs expanding on that subtopic. Optionally, include a #### Heading 4 subsection under one or more of the ### Heading 3 sections if there's a need to dive deeper into a specific point. This should also be followed by one or two paragraphs. Ensure all content is in pure markdown format, without any HTML tags or special formatting. Adjust the number of sections and subsections based on the length and complexity of the original text: For shorter texts (under 500 words), use fewer sections. For longer texts (over 2000 words), use more sections and subsections. Keep the overall structure and flow coherent, ensuring each section logically leads to the next. Use paragraphs instead of bullet points or lists for the main content under each heading. Maintain a consistent tone and style throughout the summary, matching the original text's voice where appropriate. Aim for a comprehensive yet concise summary that captures the essence of the original text while adhering to this structured format.`,
//  input_text: ``,
//  }),
//});
//
//const result = await response2.json();
//console.log(result.response);
//console.log(result.usage);
//
