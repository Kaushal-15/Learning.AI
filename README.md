# Learning.AI Platform

## 🚀 Deployment Status
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fyour-repo)

This project is configured for seamless deployment on Vercel.

**Production Frontend URL**: `https://learning-ai-rswf.vercel.app/`
**Backend API URL**: `https://learning-ai-mocha.vercel.app/`

## 🛠 Project Structure
- **Frontend**: Vite + React (`app/frontend`)
- **Backend**: Express.js serverless (`app/Backend`)

## 💻 Local Development

### Prerequisites
- Node.js (v22+)
- MongoDB (running locally or MongoDB Atlas URI)

### Setup
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Learning.ai
   ```

2. **Backend Setup**:
   ```bash
   cd app/Backend
   npm install
   # Create .env file with MONGODB_URI, etc.
   npm start
   ```

3. **Frontend Setup**:
   ```bash
   cd app/frontend
   npm install
   npm run dev
   ```
   Access the app at `http://localhost:5173`.

## ☁️ Deployment Guide (Vercel)

### Automatic Deployment
The repository is configured with two decoupled Vercel projects:
1. **Backend Serverless Lambda**: Root `vercel.json` rewrites all requests to `/api/index`, which delegates to `app/Backend/server.js`.
2. **Frontend SPA**: `app/frontend/vercel.json` proxies `/api/*` and `/auth/*` to the backend project (`https://learning-ai-mocha.vercel.app/`) and serves the SPA from `/index.html`.

### Compound Database Indexes
To maintain maximum database performance in serverless production, run the one-off index creation script:
```bash
node scripts/create-indexes.js
```
This sets up:
- `examsessions`: `{ examId: 1, userId: 1, status: 1 }`
- `examsessions`: `{ examId: 1, studentId: 1, status: 1 }`
- `camerarecordings`: `{ sessionId: 1, status: 1 }`

## 📦 Cloud Storage Configuration (Proctoring Recordings & Biometrics)

The exam proctoring system streams webcam recording chunks and biometric verification snapshots directly from the student's browser to S3-compatible cloud object storage using presigned PUT URLs, eliminating serverless upload bottlenecks, memory exhaustion, and local filesystem dependencies.

### Required Environment Variables
Configure the following environment variables in your server environment (e.g. Vercel Project Settings / local `app/Backend/.env`):

| Variable | Description | Example / Default |
|---|---|---|
| `STORAGE_BUCKET` | The S3 / Cloudflare R2 bucket name | `learning-ai-file-upload` |
| `STORAGE_REGION` | AWS region or Cloudflare `auto` | `ap-south-1` or `auto` |
| `STORAGE_ACCESS_KEY_ID` | AWS IAM or R2 access key ID | `AKIAIOSFODNN7EXAMPLE` |
| `STORAGE_SECRET_ACCESS_KEY` | AWS IAM or R2 secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `STORAGE_ENDPOINT` | *(Optional)* S3-compatible endpoint (required for Cloudflare R2 / MinIO) | `https://<account_id>.r2.cloudflarestorage.com` |
| `RECORDING_ENABLED` | Set to `false` to disable recording globally across the platform | `true` |

### S3 / Cloudflare R2 Bucket CORS Configuration
Configure CORS on your private S3 / R2 bucket to allow direct browser PUT uploads from authorized origins:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "https://learning-ai-rswf.vercel.app",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Bucket Lifecycle Policy Recommendation
Proctoring video chunks (`recordings/<examId>/<userId>/<sessionId>/<chunkIndex>.webm`) and biometric snapshots (`biometrics/<examId>/<userId>/...`) consume significant storage. It is strongly recommended to configure an S3 / R2 Lifecycle Rule to automatically delete expired recordings after an audit retention period:

- **Rule 1 — Expire Recordings**:
  - **Scope**: Prefix `recordings/`
  - **Action**: Expire / Delete current versions after **30 days**.
- **Rule 2 — Abort Incomplete Multipart Uploads**:
  - **Scope**: Entire bucket
  - **Action**: Abort and clean up incomplete multipart uploads after **3 days**.
