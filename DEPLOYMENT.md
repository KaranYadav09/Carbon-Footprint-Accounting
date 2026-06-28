# EcoTrace Deployment Guide

This guide explains how to deploy the EcoTrace application using **Supabase** (Database), **Hugging Face Spaces** (Backend), and **Vercel** (Frontend).

---

## 🛠️ Prerequisites

Before you begin, make sure you have:
1.  A **Supabase** account.
2.  A **Hugging Face** account.
3.  A **Vercel** account.
4.  Your code pushed to a GitHub repository.

---

## 1️⃣ Database Setup (Supabase)

1.  Create a new project in [Supabase](https://supabase.com/).
2.  Go to **Project Settings** (Gear icon ⚙️) -> **Database**.
3.  **⚠️ IMPORTANT FOR HUGGING FACE**: Hugging face containers use **IPv4**. Direct connection in Supabase is moving to **IPv6**. You **MUST** use the **Connection Pooler** string!
4.  Scroll down to the **Connection pooling** section.
5.  Copy the **Session mode** connection string.
6.  Ensure to replace `[YOUR-PASSWORD]` with your actual Database password inside the string!
7.  Go to **Project Settings** -> **API** and copy your **Project URL** (`SUPABASE_URL`) and **anon key** (`SUPABASE_KEY`).

---

## 2️⃣ Backend Deployment (Hugging Face Spaces)

We deploy the Flask backend to Hugging Face using a **Docker Space**.

1.  Go to Hugging Face and click **New** -> **Space**.
2.  Enter a name for your Space.
3.  Select **Docker** as the SDK.
4.  Select **Blank** (Templates are not needed as we have a `Dockerfile`).
5.  Once created, click on **Settings** in your Space.
6.  Scroll down to **Variables and Secrets**. Add the following:

| Type | Name | Value |
| :--- | :--- | :--- |
| **Secret** | `DATABASE_URL` | Your Supabase connection string (URI) |
| **Secret** | `SUPABASE_URL` | Your Supabase Project URL |
| **Secret** | `SUPABASE_KEY` | Your Supabase anon key |
| **Secret** | `GEMINI_API_KEY` | Your Gemini API Key (for recommendations) |
| **Secret** | `JWT_SECRET_KEY` | A random strong string for authentication |

7.  Push your code to the Hugging Face Space Git repository (or sync it via GitHub actions).
    > [!NOTE]
    > The `Dockerfile` in the root is configured to build the backend and run it on port `7860`.

8.  Once built, your backend will be live at:
    `https://[username]-[space-name].hf.space`

---

## 3️⃣ Frontend Deployment (Vercel)

1.  Log in to [Vercel](https://vercel.com/) and click **Add New** -> **Project**.
2.  Import your GitHub repository.
3.  In the configuration step:
    -   **Framework Preset**: Vite (detected automatically).
    -   **Root Directory**: Set this to **`client`** (Click "Edit" and select the `client` folder).
4.  Expand **Environment Variables** and add:

| Name | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://[username]-[space-name].hf.space` | **DO NOT** include a trailing slash `/` |

5.  Click **Deploy**.

---

## 💡 Troubleshooting & Notes

-   **CORS Issues**: Ensure the backend allows requests from your Vercel URL. Flask is configured with `CORS(app)`, which allows all origins by default.
-   **SPA Refresh 404s**: We have added `client/vercel.json` to handle rewrites for React Router.
-   **PaddleOCR Memory**: Hugging Face Spaces Free tier provides 16GB RAM. If PaddleOCR runs into memory issues, consider utilizing lighter models or upgrading the Space hardware.
