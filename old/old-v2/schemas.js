import { z } from 'zod';

export const XQueryResponseSchema = z.object({
    description: z.string().describe("A brief description of what the query does"),
    xquery: z.string()
        .startsWith('xquery version "3.1";')
        .describe("The complete XQuery expression")
});