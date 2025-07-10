'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating charts based on user queries.
 *
 * - generateChartFromQuery - A function that handles the chart generation process.
 * - GenerateChartFromQueryInput - The input type for the generateChartFromQuery function.
 * - GenerateChartFromQueryOutput - The return type for the generateChartFromQuery function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateChartFromQueryInputSchema = z.object({
  query: z.string().describe('The query to generate a chart for.'),
});
export type GenerateChartFromQueryInput = z.infer<typeof GenerateChartFromQueryInputSchema>;

const GenerateChartFromQueryOutputSchema = z.object({
  chartDataUri: z
    .string()
    .describe(
      'The chart as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
    ),
  textExplanation: z.string().describe('The textual explanation of the chart.'),
});
export type GenerateChartFromQueryOutput = z.infer<typeof GenerateChartFromQueryOutputSchema>;

export async function generateChartFromQuery(input: GenerateChartFromQueryInput): Promise<GenerateChartFromQueryOutput> {
  return generateChartFromQueryFlow(input);
}

const generateChartPrompt = ai.definePrompt({
  name: 'generateChartPrompt',
  input: {schema: GenerateChartFromQueryInputSchema},
  output: {schema: GenerateChartFromQueryOutputSchema},
  prompt: `You are an AI assistant that generates charts based on user queries. Given a query, generate a chart and provide a textual explanation of the chart. Return the chart as a data URI.

Query: {{{query}}}

Consider what kind of chart could best convey the information requested in the query.  The chart should contain real data - if the query does not contain specific data, make up sample data which satisfies the constraints of the query.  Do not include any personally identifying information, or any information that violates anyone's privacy or any laws.

Chart (as data URI): {{media url=chartDataUri}}
Textual Explanation: {{{textExplanation}}}`,
});

const generateChartFromQueryFlow = ai.defineFlow(
  {
    name: 'generateChartFromQueryFlow',
    inputSchema: GenerateChartFromQueryInputSchema,
    outputSchema: GenerateChartFromQueryOutputSchema,
  },
  async input => {
    // Generate chart image using Gemini 2.0 Flash and store its data URI.
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate a chart based on the following query: ${input.query}`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const {output} = await generateChartPrompt({
      ...input,
      chartDataUri: media.url,
      textExplanation: `Here is a chart generated from the query: ${input.query}`,
    });

    return output!;
  }
);
