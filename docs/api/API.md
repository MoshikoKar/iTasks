# API Reference

## Tasks

### GET /api/tasks

Returns tasks for the authenticated user according to RBAC. Supports optional filtering and pagination.

**Primary (recommended) usage: cursor-based pagination**

- **Query parameters**
  - `cursor` (optional): Opaque cursor from the previous response (`pagination.nextCursor`) for the next page.
  - `limit` (optional): Page size; default `50`, max `100`.
  - `assigneeId` (optional): Filter by assignee (must be permitted by RBAC).

- **Response (paginated)**  
  `200 OK`  
  ```json
  {
    "tasks": [ ... ],
    "pagination": {
      "hasNextPage": true,
      "nextCursor": "<taskId>",
      "limit": 50
    }
  }
  ```

**Legacy (deprecated) usage: no cursor/limit**

If `cursor` and `limit` are omitted, the API returns a bounded list for backward compatibility:

- At most **500** tasks are returned, ordered by `createdAt` descending, then `id` ascending.
- If more tasks exist, the response includes `"truncated": true` and `pagination.hasNextPage` / `pagination.nextCursor` so clients can switch to cursor-based pagination for the rest.

**Recommendation:** All new and existing callers should use `cursor` and `limit` so responses are bounded and consistent. Unpaginated usage is deprecated and may be removed in a future release.
