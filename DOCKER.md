# Docker Build & Deploy Scripts

Scripts para facilitar o build e deploy das imagens Docker.

## 🏗️ Arquitetura Monorepo

Este projeto usa **npm workspaces** com `package-lock.json` na raiz. Os Dockerfiles são otimizados para:
- ✅ Instalar dependências usando o package-lock.json da raiz
- ✅ Aproveitar cache de layers do Docker
- ✅ Builds separados para Backend e Frontend
- ✅ Apenas copiar o necessário para cada imagem

## Build das Imagens

### Opção 1: Script automatizado

**⚠️ IMPORTANTE: Execute da raiz do projeto**

```bash
# Build com registry padrão (local)
./scripts/build-images.sh

# Build com registry customizado
REGISTRY=myregistry.azurecr.io/ VERSION=1.0.0 ./scripts/build-images.sh

# Build com URL da API customizada para o frontend
VITE_API_URL=https://api.myapp.com ./scripts/build-images.sh
```

### Opção 2: Build manual

**⚠️ Execute da raiz do projeto, não dentro de packages/**

**Backend:**
```bash
# Da raiz do projeto
docker build -f packages/backend/Dockerfile -t k8s-monitoring-backend:latest .
```

**Frontend:**
```bash
# Da raiz do projeto
docker build -f packages/frontend/Dockerfile -t k8s-monitoring-frontend:latest .

# Para apontar para API externa
docker build -f packages/frontend/Dockerfile \
  --build-arg VITE_API_URL=https://api.myapp.com \
  -t k8s-monitoring-frontend:latest .
```

### Opção 3: Docker Compose

```bash
# Da raiz do projeto
docker-compose up -d
```

## Variáveis de Ambiente

### Backend
| Variável | Descrição | Padrão | Obrigatório |
|----------|-----------|--------|-------------|
| `NODE_ENV` | Ambiente de execução | `production` | Não |
| `PORT` | Porta do servidor | `3001` | Não |
| `SESSION_SECRET` | Chave secreta para sessões | - | ⚠️ **Sim** |
| `ALLOWED_ORIGINS` | Origins permitidos (CORS) | - | Não |

### Frontend
| Variável | Descrição | Padrão | Obrigatório |
|----------|-----------|--------|-------------|
| `VITE_API_URL` | URL da API backend | `""` (mesmo domínio) | Não |

## Executar Localmente com Docker

### Backend
```bash
docker run -d \
  -p 3001:3001 \
  -e SESSION_SECRET="your-secret-here" \
  -e NODE_ENV="production" \
  --name k8s-monitoring-backend \
  k8s-monitoring-backend:latest
```

### Frontend
```bash
docker run -d \
  -p 8080:8080 \
  -e BACKEND_URL="http://backend:3001" \
  --name k8s-monitoring-frontend \
  k8s-monitoring-frontend:latest
```

### Com Docker Compose
```bash
docker-compose up -d
```

## Push para Registry

```bash
# Azure Container Registry
docker tag k8s-monitoring-backend:latest myregistry.azurecr.io/k8s-monitoring-backend:latest
docker push myregistry.azurecr.io/k8s-monitoring-backend:latest

docker tag k8s-monitoring-frontend:latest myregistry.azurecr.io/k8s-monitoring-frontend:latest
docker push myregistry.azurecr.io/k8s-monitoring-frontend:latest
```

## Arquitetura

```
┌─────────────────┐
│   Frontend      │
│   (Nginx)       │
│   Port: 8080    │
└────────┬────────┘
         │ /api/* → proxy
         ↓
┌─────────────────┐
│   Backend       │
│   (Express)     │
│   Port: 3001    │
└─────────────────┘
```

## Desenvolvimento vs Produção

### Desenvolvimento
- Frontend: Vite dev server (5173)
- Backend: Express (3001)
- Proxy: Vite proxy config

### Produção
- Frontend: Nginx (8080) → proxy /api para backend
- Backend: Express (3001)
- Proxy: Nginx reverse proxy

## Healthchecks

Ambas as imagens incluem healthchecks:

- **Backend**: `GET /api/check-status`
- **Frontend**: `GET /` (index.html)

## Security

- ✅ Non-root user
- ✅ Read-only containers recomendado
- ✅ Security headers configurados
- ✅ Secrets via environment variables ou K8s secrets
- ⚠️ Sempre mude `SESSION_SECRET` em produção
