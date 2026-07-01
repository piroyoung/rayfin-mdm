# Rayfin Data Access

How this skill accesses data with the Rayfin typed client. This file owns the
architecture of data access — where it lives and how it is shaped. It does
**not** own the Rayfin data model itself: entity decorators (`@entity`,
`@uuid`, `@text`, `@role`, …), RLS policy DSL, known limitations, and schema
migration belong to the bundled `rayfin` skill and its MCP tools
(`search_docs`, `get_doc`). Consult those before designing entities or queries.

## The One Rule

All data access goes through a **repository port** (domain) implemented by a
**Rayfin adapter** (infrastructure). Use cases and components depend on the
port, never on `client.data`.

```text
use case ──▶ TodoRepository (port, domain/repositories)
                 ▲
                 │ implements
     RayfinTodoRepository (adapter, infrastructure/data) ──▶ client.data.Todo
```

Never call `client.data.<Entity>`, `RayfinClient`, `fetch`, or hand-written
GraphQL outside `src/infrastructure/`.

## Port Shape

Define the port in domain terms — verbs the app understands, domain/view models
in and out. Keep the Rayfin query DSL out of the signature.

```ts
// src/domain/repositories/todo-repository.ts
import type { Todo, NewTodo } from "@/domain/models/todo";

export interface TodoRepository {
  list(): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  create(input: NewTodo): Promise<Todo>;
  setCompleted(id: string, isCompleted: boolean): Promise<Todo>;
  remove(id: string): Promise<void>;
}
```

## Adapter Shape

Implement the port with the typed client. Keep query composition, session
reads, ownership scoping, and mapping here.

```ts
// src/infrastructure/data/rayfin-todo-repository.ts
import type { TodoRepository } from "@/domain/repositories/todo-repository";
import type { Todo, NewTodo } from "@/domain/models/todo";
import type { RayfinClientFacade } from "@/infrastructure/rayfin/client";
import { toTodo } from "./todo-mapper";

export class RayfinTodoRepository implements TodoRepository {
  constructor(private readonly client: RayfinClientFacade) {}

  async list(): Promise<Todo[]> {
    const rows = await this.client.data.Todo
      .select(["id", "title", "isCompleted", "createdAt"])
      .orderBy({ createdAt: "desc" })
      .execute();
    return rows.map(toTodo);
  }

  async create(input: NewTodo): Promise<Todo> {
    const session = this.client.getSession();
    if (!session.isAuthenticated || !session.user) {
      throw new NotAuthenticatedError();
    }
    const row = await this.client.data.Todo.create({
      title: input.title,
      isCompleted: false,
      createdAt: new Date(),
      user_id: session.user.id, // ownership scoping for RLS
    });
    return toTodo(row);
  }

  async setCompleted(id: string, isCompleted: boolean): Promise<Todo> {
    await this.client.data.Todo.update({ id }, { isCompleted });
    const row = await this.client.data.Todo.findById(id);
    return toTodo(row);
  }

  async remove(id: string): Promise<void> {
    await this.client.data.Todo.delete({ id });
  }
}
```

## Query Rules

Follow the Rayfin client conventions inside the adapter (verify specifics via
the `rayfin` skill / MCP, which are version-locked to the installed packages):

- query chain order: `.select()` → `.where()` → `.orderBy()` → `.execute()`
- single record by id: `client.data.Entity.findById(id)` (not `findByPk`)
- filter by FK columns using `{property}_id` (e.g. `customer_id`), not dot-paths
- dot-paths are for `.select()` projection only
- sort directions are lowercase `'asc'` / `'desc'`
- cursor pagination: `.first(n).executePaginated()`

Treat every result crossing back into the app as a DTO to be mapped, not as a
live entity with identity.

## Ownership, Auth, And RLS

- Rayfin enforces per-user access server-side via `@role(policy: …)` on the
  entity. Keep that policy in `rayfin/data` (platform concern).
- In the adapter, set `user_id` from the current session (`claims.sub`) on
  create, and rely on the server policy for read/update/delete scoping.
- Read the Fabric session through the client facade
  (`this.client.getSession()`), not through a module global.
- `user_id` sourced from `claims.sub` is a `@text()` field on the entity, not a
  FK — this is a platform detail; the adapter just supplies the value.

## Mapping (Anti-Corruption)

Convert Rayfin rows and `claims` into domain/view models at the adapter
boundary.

```ts
// src/infrastructure/data/todo-mapper.ts
export const toTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  isCompleted: row.isCompleted,
  createdAt: new Date(row.createdAt), // convert transport shape
});
```

Keep it shallow. When the Rayfin row and the view model are identical, return
the row typed as the domain model instead of writing a no-op mapper. Add an
explicit mapper only for renames, `Date` conversion, computed fields, or claim
extraction. Do not over-map.

## Local-Dev Strategy

The template supports a local backend where todos live in memory. Model this as
a **Strategy**: a second repository implementation behind the same port,
selected in the composition root.

```ts
// src/infrastructure/config/create-repositories.ts
export function createRepositories(client: RayfinClientFacade, config: Config) {
  const todos: TodoRepository = config.localDev
    ? new InMemoryTodoRepository()
    : new RayfinTodoRepository(client);
  return { todos } as const;
}
```

Do not scatter `if (isLocalBackend())` checks through use cases or components;
keep the branch in the factory.

## Error Handling

- translate Rayfin/network failures into meaningful application errors in the
  adapter (e.g. `NotAuthenticatedError`, `TodoNotFoundError`)
- let the use case map those into view-facing pending/error states
- never let a component catch a raw SDK error

## Anti-Patterns

- `client.data.<Entity>` or `RayfinClient` imported in a component, page, use
  case, or domain module
- raw `fetch()` or hand-built GraphQL for data operations
- returning Rayfin entity objects across the use-case boundary
- ownership scoping (`user_id`) applied in a component instead of the adapter
- caching the session in a module-level variable
- duplicating the entity decorator model inside `domain` (it lives in
  `rayfin/data`, owned by the `rayfin` skill)
