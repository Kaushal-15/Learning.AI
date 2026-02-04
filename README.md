# Learning.AI Platform

## 🚀 Deployment Status
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fyour-repo)

This project is configured for seamless deployment on Vercel.

**Production URL**: `https://learning-ai-tau.vercel.app/`

## 🛠 Project Structure
- **Frontend**: Vite + React (`app/frontend`)
- **Backend**: Express.js (`app/Backend`)

## 💻 Local Developement

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally or URI)

### Setup
1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd Learning.ai
    ```

2.  **Backend Setup**:
    ```bash
    cd app/Backend
    npm install
    # Create .env file with MONGODB_URI, etc.
    npm start
    ```

3.  **Frontend Setup**:
    ```bash
    cd app/frontend
    npm install
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

## ☁️ Deployment Guide (Vercel)

### Automatic Deployment
The repository is configured with `vercel.json` to deploy both the frontend and backend in a single Vercel project.

1.  Connect your GitHub repository to Vercel.
2.  Import the project.
3.  **Settings**:
    -   **Root Directory**: Leave as `./` (Repsoitory Root)
    -   **Framework Preset**: Other (or Vercel default)
    -   **Environment Variables**: Add all backend secrets (e.g. `MONGODB_URI`, `JWT_SECRET`) in the Vercel Project Settings.
4.  **Deploy**.

### CI/CD
A GitHub Actions workflow (`.github/workflows/ci.yml`) is set up to automatically build and test your application on every push to `main`.
