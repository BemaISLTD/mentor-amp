# MentorAMP Frontend

## Run locally

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create `.env.local` in the project root and set the backend API URL:

   ```env
   VITE_API_BASE_URL=http://localhost:8001
   ```

   Use the URL for the backend instance you want the frontend to connect to.

3. Start the development server:

   ```sh
   pnpm dev
   ```

## M3 governance workflows

Formula Studio, Expected Results benchmark management, and run reconciliation are available from the left navigation. See [M3 Frontend Workflows](./docs/M3_FRONTEND_IMPLEMENTATION.md) for routes, API behavior, permissions, and backend contract notes.
