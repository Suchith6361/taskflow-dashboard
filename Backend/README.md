# TaskFlow API

Node.js 22, Express, and MySQL REST API for the TaskFlow application. The API is kept separate from `Frontend/`.

## Prerequisites

- Node.js 22 or newer and npm.
- MySQL 8.0 or newer.
- A MySQL database and least-privilege application user. Do not use MySQL `root` for the API.

## Local setup

From the repository root, change into `Backend/` and install dependencies:

```powershell
cd Backend
npm install
Copy-Item .env.example .env
```

Edit `Backend/.env` locally. Fill in the password for `taskflow_app` and a cryptographically random `JWT_SECRET` of at least 32 characters. Never commit `.env` or paste secrets into chat.

Create the database and application account as a MySQL administrator, substituting a password locally:

```sql
CREATE DATABASE taskflow CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'taskflow_app'@'localhost' IDENTIFIED BY 'your-local-password';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON taskflow.* TO 'taskflow_app'@'localhost';
FLUSH PRIVILEGES;
```

If the database or application account already exists, do not recreate it. Grant only the required privileges. Migrations use `CREATE TABLE IF NOT EXISTS` and a migration ledger; they do not drop tables or reset data. Review the SQL before applying it to a database containing pre-existing application tables.

## Run

```powershell
npm run migrate
npm run dev
```

The API listens on `http://localhost:5000` by default. `GET /api/health` executes a database query and returns 200 when connected or 503 with a sanitized message when unavailable. `npm start` runs without file watching.

## Authentication

Register or log in to receive a one-hour JWT. Send it on protected requests as:

```http
Authorization: Bearer <token>
```

The token subject is the user ID. The API accepts only HS256 JWTs signed with `JWT_SECRET`; ownership is derived from the verified token, never from request-supplied user IDs. Tokens are returned in JSON and are not stored by this backend. Keep them out of logs and do not place secrets in frontend source. This bearer-token approach is a straightforward API baseline; XSS on a client that stores tokens can expose them, so token storage and refresh/session design should be assessed before production use. There is no refresh-token flow or email verification in this assignment phase.

## Endpoints

Successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Task lists also include `meta.pagination`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | No | Application/database health |
| POST | `/api/auth/register` | No | Create an account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/auth/me` | Yes | Current user |
| GET, POST | `/api/projects` | Yes | List/create projects |
| GET, PUT, DELETE | `/api/projects/:id` | Yes | Read/update/delete a project |
| GET, POST | `/api/tasks` | Yes | List/create tasks |
| GET, PUT, DELETE | `/api/tasks/:id` | Yes | Read/update/delete a task |
| PATCH | `/api/tasks/:id/status` | Yes | Change task status |
| GET | `/api/dashboard/stats` | Yes | Current user's dashboard totals |

Registration example:

```json
{
  "name": "Ava Example",
  "email": "ava@example.com",
  "password": "a-long-local-password"
}
```

Login returns the same user shape and a token:

```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Ava Example", "email": "ava@example.com" },
    "token": "<signed-jwt>"
  }
}
```

Project create/update body: `{ "name": "Website refresh", "description": "Optional details" }`. Deleting a project cascades to its tasks.

Task create/update body:

```json
{
  "projectId": 1,
  "title": "Review the home page",
  "description": null,
  "status": "todo",
  "priority": "medium",
  "dueDate": null
}
```

Task listing supports `search`, `status` (`todo`, `in_progress`, `done`), `priority` (`low`, `medium`, `high`), `page`, and `pageSize` (maximum 100). For example: `/api/tasks?search=review&status=todo&priority=high&page=1&pageSize=20`. The dashboard overdue count excludes completed tasks and compares dates with MySQL's current date.

## Tests

Run database-independent tests with:

```powershell
npm test
```

Integration tests are skipped unless `TEST_DB_NAME` is set explicitly. Create a dedicated, disposable database (for example, `taskflow_test`) and grant the application user access to it. Configure `TEST_DB_NAME=taskflow_test` in `.env`; the guard compares database names case-insensitively and refuses the configured development database. Integration tests run the additive migrations and only delete the uniquely identified rows they create; they never drop a database or table. Then run:

```powershell
npm run test:integration
```

The configuration guard refuses to use the same database name for tests and the development DB. Do not set `TEST_DB_NAME=taskflow`.

## Security and implementation notes

- Passwords are hashed with bcryptjs (12 rounds); plaintext passwords and hashes are never returned.
- Login/register are rate-limited, CORS allows only `CLIENT_URL`, and Helmet sets standard security headers.
- SQL values are parameterized; filter choices are schema-validated and pagination is bounded.
- Project and task reads/mutations check the token user's ownership. Inaccessible resources return 404.
- The database password and JWT secret are required from environment configuration and never logged.
- Database migration DDL is additive and is tracked in `schema_migrations`. MySQL DDL auto-commits, so migrations are restartable through `IF NOT EXISTS` statements; inspect a failed migration before retrying.
- The frontend still uses its temporary localStorage mock data. Frontend API integration is intentionally a separate phase.
