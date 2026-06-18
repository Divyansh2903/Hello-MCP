import { z } from "zod";

export const todoSchema = z.object({
  id: z.string().describe("Todo id (uuid)"),
  userId: z.string().describe("Owner's Supabase user id"),
  title: z.string().describe("Todo title"),
  completed: z.boolean().describe("Whether the todo is completed"),
  createdAt: z.string().describe("ISO-8601 creation timestamp"),
  updatedAt: z.string().describe("ISO-8601 last-updated timestamp"),
});

export const propSchema = z.object({
  todos: z.array(todoSchema).describe("The user's todos, newest first"),
  totalCount: z.number().describe("Total number of todos"),
  completedCount: z.number().describe("Number of completed todos"),
});

export type Todo = z.infer<typeof todoSchema>;
export type TodoListProps = z.infer<typeof propSchema>;
