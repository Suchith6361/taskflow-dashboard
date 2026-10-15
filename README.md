\# TaskFlow â€” Project Management Application



TaskFlow is a full-stack project management application for organizing projects and tasks, tracking progress, and viewing dashboard statistics.



\## Technology Stack



\*\*Frontend\*\*

\- Next.js App Router, React, TypeScript

\- Tailwind CSS and existing reusable UI components

\- React Query for server state and cache management



\*\*Backend\*\*

\- Node.js and Express

\- REST API with JWT authentication

\- bcrypt password hashing and request validation



\*\*Database\*\*

\- MySQL 8

\- Versioned SQL migrations



\## Features



\- User registration and login

\- Authenticated, user-scoped project management

\- Create, view, update, and delete projects

\- Create, view, update, and delete tasks

\- Task statuses: To Do, In Progress, Done

\- Task priorities: Low, Medium, High

\- Search tasks by title and filter by status and priority

\- Dashboard statistics and project progress

\- Loading, error, and empty states



\## Project Structure



```text

Task Flow/

â”œâ”€â”€ Frontend/     # Next.js application and existing UI

â”œâ”€â”€ Backend/      # Express API, migrations, and tests

â””â”€â”€ README.md     # Project setup and documentation

```



\## Prerequisites



\- Node.js and npm

\- MySQL 8

\- Git



\## Setup



\### 1. Configure the database



Create a MySQL database named `taskflow` and a dedicated application user with appropriate privileges.



Run the backend migrations to create the required tables:



```powershell

cd Backend

npm install

```



Copy `.env.example` to `.env` and configure the database connection and a cryptographically random JWT secret of at least 32 characters. Never commit `.env`.



Run the migration:



```powershell

npm run migrate

```



Start the API:



```powershell

npm start

```



The API runs on port `5000` by default.



\### 2. Configure the frontend



In a separate terminal:



```powershell

cd Frontend

npm install

```



Copy `.env.example` to `.env.local` if needed. Configure the public API base URL:



```text

NEXT\_PUBLIC\_API\_BASE\_URL=http://localhost:5000/api

```



Start the Next.js development server:



```powershell

npm run next:dev

```



Open `http://localhost:3000`.



\## Testing



Run frontend tests:



```powershell

cd Frontend

npm test

```



Run the production build:



```powershell

npm run next:build

```



Run backend tests:



```powershell

cd Backend

npm test

```



Database integration tests require a separately configured test database. Follow the backend documentation before running them.



\## API Overview



The API is mounted under `/api`.



| Feature | Endpoint |

|---|---|

| Register | `POST /auth/register` |

| Login | `POST /auth/login` |

| Current user | `GET /auth/me` |

| List/create projects | `GET /projects`, `POST /projects` |

| Read/update/delete project | `/projects/:id` |

| List/create tasks | `GET /tasks`, `POST /tasks` |

| Read/update/delete task | `/tasks/:id` |

| Update task status | `PATCH /tasks/:id/status` |

| Dashboard statistics | `GET /dashboard/stats` |

| Health check | `GET /health` |



Protected endpoints require a bearer access token. See `Backend/README.md` for detailed API contracts, configuration, and database instructions.



\## Security Notes



\- Database credentials and JWT secrets belong only in local environment files.

\- Backend authorization must enforce ownership of projects and tasks.

\- Browser token storage currently uses `localStorage`; an XSS vulnerability could expose a token until expiry.

\- Logout clears the local session but does not revoke an already-issued stateless JWT.



\## Architecture



The Next.js frontend calls the Express REST API. The backend validates requests, authenticates users, enforces resource ownership, and accesses MySQL through the backend data layer. Database schema changes are managed through versioned migrations.
