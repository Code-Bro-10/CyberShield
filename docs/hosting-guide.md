# CyberShield Cloud Hosting & Deployment Guide

This guide details how to host **CyberShield** online so anyone around the world can access your live SOC dashboard, REST APIs, and real-time alert feed.

---

## 🌟 Recommended Hosting Platforms (Free & Low-Cost)

| Platform | Best For | Tier / Cost | Setup Effort |
|---|---|---|---|
| **Render.com** (Recommended) | Full-stack unified service (React + Node + Socket.IO) | Free tier available | ⭐️ 2 minutes (1-Click) |
| **Railway.app** | Full-stack with optional cloud Redis & MongoDB | Free trial / \$5 mo | ⭐️⭐️ 3 minutes |
| **Vercel + Render** | High-speed CDN frontend + Render backend | Free tier | ⭐️⭐️ 5 minutes |
| **Cloud VPS (AWS / Oracle / DigitalOcean)** | Production Docker Compose deployment | Free tier (AWS EC2 / Oracle) | ⭐️⭐️⭐️ 10 minutes |

---

## Option 1: Render.com (Easiest & Free)

Because CyberShield's backend is configured to automatically serve the compiled React SPA from `frontend/dist`, you can deploy the entire application (Frontend, Backend, and Socket.IO) as **a single unified Web Service on Render**!

### Step-by-Step:
1. Go to **[render.com](https://render.com/)** and sign in with your GitHub account.
2. Click **"New +"** in the top right and select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and select your repository:
   `https://github.com/Code-Bro-10/CyberShield`
4. Fill in the service configuration:
   - **Name**: `cybershield` (or your choice)
   - **Language / Runtime**: `Node`
   - **Branch**: `main`
   - **Region**: Closest to you (e.g. Frankfurt, Oregon, Singapore)
   - **Build Command**:
     ```bash
     npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Plan**: Select **Free**.
5. Under **Environment Variables**, add:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `cybershield_super_secret_jwt_key_2026_soc_enterprise`
   - `AGENT_SHARED_SECRET`: `cybershield-agent-key-secret-999`
   *(Optional: If you have a MongoDB Atlas connection string or Redis Cloud URL, add `MONGO_URI` and `REDIS_URL`. If omitted, CyberShield automatically uses its high-performance in-memory database and stream broker!)*
6. Click **"Create Web Service"**.
7. Render will install dependencies, build the React app, start the server, and provide a live URL like:
   **`https://cybershield-xxxx.onrender.com`**

---

## Option 2: Railway.app

1. Go to **[railway.app](https://railway.app/)** and sign in with GitHub.
2. Click **"New Project"** -> **"Deploy from GitHub repo"**.
3. Select `Code-Bro-10/CyberShield`.
4. In Settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. In Variables, add:
   - `NODE_ENV`: `production`
   - `PORT`: `${{PORT}}`
6. Click **"Generate Domain"** under Networking to get your public `https://cybershield-production.up.railway.app` URL.

---

## Option 3: Split Deployment (Vercel Frontend + Render Backend)

If you prefer hosting the React static frontend on Vercel's global edge network:

### 1. Deploy Backend on Render:
- Set Root Directory to `backend`.
- Build Command: `npm install`
- Start Command: `npm start`
- Note the backend URL: `https://cybershield-api.onrender.com`

### 2. Deploy Frontend on Vercel:
- Go to [vercel.com](https://vercel.com/) -> **Add New Project** -> Select `CyberShield`.
- Set Root Directory to `frontend`.
- Framework Preset: `Vite`.
- Under Environment Variables:
  - `VITE_API_BASE_URL`: `https://cybershield-api.onrender.com`
- Click **Deploy**.

---

## Option 4: Linux Cloud VPS (AWS EC2, Oracle Cloud Free Tier, DigitalOcean)

If you have a Linux server:

1. SSH into your VPS:
   ```bash
   ssh ubuntu@your-server-ip
   ```
2. Clone the repository:
   ```bash
   git clone https://github.com/Code-Bro-10/CyberShield.git
   cd CyberShield
   ```
3. Deploy with Docker Compose (includes production MongoDB and Redis):
   ```bash
   docker compose up -d --build
   ```
4. Configure Nginx or open ports `5000` / `5173` in your security group. Your SOC dashboard is immediately accessible at `http://your-server-ip:5173`!
