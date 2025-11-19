# Docker Build & Deploy Scripts

Scripts para facilitar o build e deploy das imagens Docker.

## Build das Imagens

### Opção 1: Script automatizado

```bash
# Build com registry padrão (local)
./scripts/build-images.sh

# Build com registry customizado
REGISTRY=myregistry.azurecr.io/ VERSION=1.0.0 ./scripts/build-images.sh

# Build com URL da API customizada para o frontend
VITE_API_URL=https://api.myapp.com ./scripts/build-images.sh
```

### Opção 2: Build manual

**Backend:**
```bash
cd packages/backend
docker build -t k8s-monitoring-backend:latest .
```

**Frontend:**
```bash
cd packages/frontend

# Para produção (API no mesmo domínio)
docker build -t k8s-monitoring-frontend:latest .

# Para apontar para API externa
docker build --build-arg VITE_API_URL=https://api.myapp.com \
  -t k8s-monitoring-frontend:latest .
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
