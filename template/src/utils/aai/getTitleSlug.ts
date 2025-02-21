import { findUniqueSlug } from "@/utils/common/helpers";

interface TitleSlugResponse {
  title: string;
  slug: string;
}

interface LemurResponse {
  success: boolean;
  data: {
    response:
      | string
      | {
          title: string;
          slug: string;
        };
  };
}

/**
 * Generates a title and slug for content using the AI API
 * @param markdownContent The markdown content to generate a title and slug for
 * @param existingSlugs Array of existing slugs to avoid duplicates
 * @returns Promise with the generated title and slug or null if generation failed
 */
export async function getTitleSlug(
  markdownContent: string,
  existingSlugs: string[]
): Promise<TitleSlugResponse | null> {
  if (!markdownContent || markdownContent.trim() === "..." || markdownContent.trim().length === 0) {
    return null;
  }

  try {
    // Call the askLemur API to generate a title and slug
    const response = await fetch("/api/aai/askLemur", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Generate a concise title (maximum 40-50 characters) and a URL-friendly slug (lowercase, only letters, numbers, and dashes, no spaces) that captures the essence of this markdown content. Return only a JSON object with "title" and "slug" keys. 
        
Example response format:
{
  "title": "Short Descriptive Title",
  "slug": "short-descriptive-title"
}`,
        input_text: markdownContent,
        final_model: "anthropic/claude-3-5-sonnet",
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as LemurResponse;
      if (data.success && data.data?.response) {
        // Parse the response - it might be a string that needs JSON parsing
        let titleData;
        try {
          // Check if the response is already a parsed object
          if (typeof data.data.response === "string") {
            titleData = JSON.parse(data.data.response);
          } else {
            titleData = data.data.response;
          }

          // Update with unique slugs
          if (titleData.title && titleData.slug) {
            return {
              title: findUniqueSlug(titleData.title, existingSlugs),
              slug: findUniqueSlug(titleData.slug, existingSlugs),
            };
          }
        } catch (parseError) {
          console.error("Error parsing title data:", parseError);
        }
      }
    }
  } catch (error) {
    console.error("Error generating title:", error);
  }

  return null;
}
