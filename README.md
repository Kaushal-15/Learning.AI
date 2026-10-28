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

## 📦 Cloud Storage Configuration (Proctoring Recordings)

The exam proctoring system streams webcam recording chunks directly from the student's browser to S3-compatible cloud object storage using presigned PUT URLs, eliminating serverless upload bottlenecks and memory leaks.

### Required Environment Variables
Configure the following environment variables in your server environment (e.g. Vercel / local `.env`):

| Variable | Description | Example / Default |
|---|---|---|
| `STORAGE_BUCKET` | The S3 / R2 bucket name | `learning-ai-file-upload` |
| `STORAGE_REGION` | AWS region or Cloudflare `auto` | `ap-south-1` or `us-east-1` |
| `STORAGE_ACCESS_KEY_ID` | AWS IAM or R2 access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `STORAGE_SECRET_ACCESS_KEY` | AWS IAM or R2 secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `STORAGE_ENDPOINT` | *(Optional)* S3-compatible endpoint (required for Cloudflare R2 / MinIO) | `https://<account_id>.r2.cloudflarestorage.com` |
| `RECORDING_ENABLED` | Set to `false` to disable recording across the platform | `true` |

### S3 / R2 Bucket CORS Configuration
Configure CORS on your private S3 bucket to allow direct browser PUT uploads:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://learning-ai-tau.vercel.app", "http://localhost:5173"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Bucket Lifecycle Policy Recommendation
Proctoring video chunks (`recordings/<examId>/<userId>/<sessionId>/<chunkIndex>.webm`) consume significant storage over time. It is strongly recommended to configure an S3 / R2 Lifecycle Rule to automatically delete expired recordings after an audit retention period:

- **Rule Scope**: Prefix `recordings/`
- **Action**: Expire / Delete current versions after **30 days** (or **60 days** based on institutional audit requirements).
- **Incomplete Multipart Uploads**: Abort and clean up incomplete multipart uploads after **3 days**.

