export type Todo = {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_BASE_URL must be set");
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function fetchTodos(accessToken: string): Promise<Todo[]> {
  const response = await fetch(`${apiBaseUrl}/todos`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { todos: Todo[] };
  return data.todos;
}

export async function createTodo(
  accessToken: string,
  title: string,
): Promise<Todo> {
  const response = await fetch(`${apiBaseUrl}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as Todo;
}

export async function updateTodo(
  accessToken: string,
  id: string,
  completed: boolean,
): Promise<Todo> {
  const response = await fetch(`${apiBaseUrl}/todos/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ completed }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as Todo;
}

export async function deleteTodo(
  accessToken: string,
  id: string,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/todos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}
