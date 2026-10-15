# TaskFlow Dashboard

Build a professional project management web application called TaskFlow using React, TypeScript, Tailwind CSS, and shadcn/ui.

Design

Create a polished, modern SaaS dashboard inspired by Linear and modern project management tools. Use a dark navy sidebar, light workspace background, white cards, subtle borders, rounded corners, clean typography, and blue primary buttons. Make it responsive.

Pages

Dashboard: total projects, total tasks, completed tasks, overdue tasks, recent projects, and task status overview.

Projects: project cards with name, description, creation date, task counts, and progress. Include create, edit, delete dialogs.

Tasks: task table with title, description, project, status, priority, and due date. Include create, edit, delete, and status updates.

Login and Register: clean authentication forms with validation.

Functionality

Task statuses: To Do, In Progress, Done.

Priorities: Low, Medium, High.

Search tasks by title.

Combine status and priority filters.

Show useful loading, error, and empty states.

Update dashboard statistics when tasks change.

Add confirmation before destructive actions.

Use reusable React components and TypeScript types.

Organize the code into pages, components, types, and services.

Use mock data only for this initial UI prototype.

Keep data access behind a service layer so we can later connect a separate Node.js + Express REST API and MySQL database.

Do not use Supabase, Firebase, or any managed backend.

Do not claim authentication is secure until a real backend is implemented.

Generate a complete, functional frontend prototype with a consistent design across all pages.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bfdf5ab4-0c81-4dfd-947c-14d2ea5154cf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
