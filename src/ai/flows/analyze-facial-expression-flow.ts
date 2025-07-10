
'use server';
/**
 * @fileOverview A Genkit flow to analyze facial expressions from an image to estimate student engagement.
 *
 * - analyzeFacialExpression - A function that handles the facial expression analysis.
 * - AnalyzeFacialExpressionInput - The input type for the analyzeFacialExpression function.
 * - AnalyzeFacialExpressionOutput - The return type for the analyzeFacialExpression function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeFacialExpressionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A still photo frame from a video, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeFacialExpressionInput = z.infer<typeof AnalyzeFacialExpressionInputSchema>;

const AnalyzeFacialExpressionOutputSchema = z.object({
  engagementScore: z.number().min(0).max(100).describe('Estimated engagement level (0-100).'),
  attentionScore: z.number().min(0).max(100).describe('Estimated attention level (0-100).'),
  confusionScore: z.number().min(0).max(100).describe('Estimated confusion level (0-100).'),
  teachingRecommendation: z.string().describe('A brief, actionable teaching recommendation based on the scores.'),
});
export type AnalyzeFacialExpressionOutput = z.infer<typeof AnalyzeFacialExpressionOutputSchema>;

export async function analyzeFacialExpression(input: AnalyzeFacialExpressionInput): Promise<AnalyzeFacialExpressionOutput> {
  return analyzeFacialExpressionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'facialExpressionAnalysisPrompt',
  input: {schema: AnalyzeFacialExpressionInputSchema},
  output: {schema: AnalyzeFacialExpressionOutputSchema},
  prompt: `You are an expert in educational psychology and facial expression analysis.
Analyze the provided image of a student's face from a live camera feed.
Based on their facial expression, estimate their current level of engagement, attention, and confusion as percentages (0-100).
Also, provide a brief, actionable teaching recommendation derived from these scores.

Consider the following cues:
- Engagement cues: eye contact with screen/content, alert posture, positive expressions (slight smile, nodding).
- Attention cues: focused gaze, minimal signs of distraction.
- Confusion cues: furrowed brow, squinting, head tilt, slightly parted lips, glazed or wandering eyes.

If the image is unclear, or no face is clearly visible, return scores of 0 and a recommendation to check camera positioning.

Input Image:
{{media url=photoDataUri}}

Output the scores as numbers between 0 and 100.
The teaching recommendation should be concise.
`,
});

const analyzeFacialExpressionFlow = ai.defineFlow(
  {
    name: 'analyzeFacialExpressionFlow',
    inputSchema: AnalyzeFacialExpressionInputSchema,
    outputSchema: AnalyzeFacialExpressionOutputSchema,
  },
  async (input) => {
    // In a real-world scenario, you might add more sophisticated image validation or pre-processing here.
    if (!input.photoDataUri.startsWith('data:image/')) {
      return {
        engagementScore: 0,
        attentionScore: 0,
        confusionScore: 0,
        teachingRecommendation: "Invalid image data. Please ensure the camera is working correctly.",
      };
    }
    
    try {
      const {output} = await prompt(input);
      if (!output) {
          return {
              engagementScore: 0,
              attentionScore: 0,
              confusionScore: 0,
              teachingRecommendation: "Could not analyze expression. Please try again or check camera.",
            };
      }
      return output;
    } catch (error) {
      console.error('Error during facial expression analysis flow:', error);
      // Return a default error state to the client without crashing the app.
      // The frontend will show this message and retry on the next interval.
      return {
        engagementScore: 0,
        attentionScore: 0,
        confusionScore: 0,
        teachingRecommendation: 'AI model is temporarily unavailable. Will retry automatically.',
      };
    }
  }
);
