
import type { GenerateMultimodalResponseOutput } from '@/ai/flows/generate-multimodal-response';

export interface FormState extends Partial<GenerateMultimodalResponseOutput> {
  message?: string | null;
  errors?: {
    queryText?: string[];
    queryImageDataUri?: string[]; // Changed from queryImage to queryImageDataUri
    server?: string[];
  } | null;
  timestamp?: number;
}

export const initialFormState: FormState = {
  message: null,
  errors: null,
  textResponse: null,
  chartDataUri: null,
  timestamp: 0, 
};
