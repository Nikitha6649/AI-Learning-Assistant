
'use server';

import { z } from 'zod';
import { generateMultimodalResponse } from '@/ai/flows/generate-multimodal-response';
import { type FormState, initialFormState } from '@/lib/form-state';

// Schema for data received from the client-side FormData
const querySchema = z.object({
  queryText: z.string().optional(),
  queryImageDataUri: z.string().optional()
    .refine(val => !val || val.startsWith('data:image/'), {
      message: "Image data must be a valid data URI starting with 'data:image/'."
    })
    .refine(val => !val || val.length < 10 * 1024 * 1024, { // Approx 10MB limit for data URI string
      message: "Image data is too large (max 10MB data URI).",
    }),
});


export async function submitQueryAction(prevState: FormState | undefined, formData: FormData): Promise<FormState> {
  const rawFormData = {
    queryText: formData.get('queryText') as string || undefined,
    queryImageDataUri: formData.get('queryImageDataUri') as string || undefined,
  };

  const validatedFields = querySchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      ...initialFormState,
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validation failed.",
      timestamp: Date.now(),
    };
  }
  
  const { queryText, queryImageDataUri } = validatedFields.data;

  // This check is vital: ensure at least one piece of data is present
  if (!queryText && !queryImageDataUri) {
    return {
      ...initialFormState,
      errors: { server: ["Please provide a text query or an image."] },
      message: "Missing input.",
      timestamp: Date.now(),
    }
  }

  try {
    const response = await generateMultimodalResponse({
      queryText: queryText,
      queryImageDataUri: queryImageDataUri, // queryImageDataUri is now directly from FormData
    });
    return {
      ...response,
      message: "Query processed successfully.",
      errors: null, // Clear previous errors on success
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error calling AI model:", error);
    return {
      ...initialFormState,
      errors: { server: ["An error occurred while processing your query. Please try again."] },
      message: "AI processing failed.",
      timestamp: Date.now(),
    };
  }
}
