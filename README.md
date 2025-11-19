# Kubernetes AI Dashboard

A beautiful, production-ready web application that provides real-time Kubernetes cluster insights and AI-powered analysis.

## ✨ Features

- **Real-Time Monitoring:** View live metrics for nodes, workloads (Deployments & StatefulSets), and namespaces.
- **AI Assistant:** Ask natural language questions about your cluster and get intelligent, actionable insights.
- **Demo Mode:** Explore the UI and its features with realistic mock data without needing to connect to a live cluster.
- **Secure Connection:** Connect to any Kubernetes cluster by providing your `kubeconfig`. Your credentials are stored securely in a server-side session.
- **Modern UI:** A clean and responsive interface built with React, MUI, and Tailwind CSS, with support for light and dark themes.

## 🚀 Getting Started

This project is a monorepo containing both the frontend and backend.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (v9 or later)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd k8s-ai-dashboard
    ```

2.  **Install dependencies:**
    From the root of the project, run:
    ```bash
    npm install
    ```
    This will install all dependencies for both the frontend and backend workspaces.

### Running the Application

To run both the frontend and backend servers in development mode, run the following command from the root of the project:

```bash
npm run dev
```

- The **frontend** will be available at `http://localhost:5173`.
- The **backend** will be running on `http://localhost:3001`.

The Vite dev server is configured to proxy all API requests from `/api` to the backend, so you can interact with the application seamlessly.

## 🛠️ Project Structure

The project is a monorepo with the following structure:

```
/
├── packages/
│   ├── frontend/   # React application (UI)
│   └── backend/    # Node.js/Express application (API)
├── .gitignore
├── package.json    # Root package.json for managing workspaces
└── README.md
```

### Frontend

-   **Framework:** [React](https://react.dev/) (with Vite)
-   **UI Library:** [MUI](https://mui.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Data Fetching:** [TanStack Query](https://tanstack.com/query/latest)

### Backend

-   **Framework:** [Express.js](https://expressjs.com/)
-   **Kubernetes Client:** [`@kubernetes/client-node`](https://github.com/kubernetes-client/javascript)
-   **AI Providers:** [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Google Gemini](https://ai.google/discover/gemini/)

## 🐳 Docker & Kubernetes Deployment

Para informações sobre build de imagens Docker e deploy em Kubernetes, consulte:
- **[DOCKER.md](./DOCKER.md)** - Guia completo de build e configuração de imagens
- **Dockerfiles separados:**
  - Backend: `packages/backend/Dockerfile`
  - Frontend: `packages/frontend/Dockerfile`

### Quick Start com Docker

```bash
# Build das imagens
./scripts/build-images.sh

# Ou usar docker-compose
docker-compose up -d
```

### Variáveis de Ambiente

**Backend (packages/backend):**
- `SESSION_SECRET` - **Obrigatório** - Chave secreta para sessões
- `NODE_ENV` - Ambiente (development/production)
- `PORT` - Porta do servidor (padrão: 3001)

**Frontend (packages/frontend):**
- `VITE_API_URL` - URL da API backend (vazio = mesmo domínio)

Consulte `.env.example` para mais detalhes.
