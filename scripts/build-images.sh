#!/bin/bash

# Build script para criar as imagens Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
REGISTRY=${REGISTRY:-""}
VERSION=${VERSION:-"latest"}
BACKEND_IMAGE="${REGISTRY}k8s-monitoring-backend:${VERSION}"
FRONTEND_IMAGE="${REGISTRY}k8s-monitoring-frontend:${VERSION}"

echo -e "${GREEN}🐳 Building Docker images...${NC}"
echo ""

# Build Backend
echo -e "${YELLOW}📦 Building Backend image...${NC}"
docker build -t "${BACKEND_IMAGE}" \
  -f packages/backend/Dockerfile \
  packages/backend/

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Backend image built successfully: ${BACKEND_IMAGE}${NC}"
else
  echo -e "${RED}❌ Failed to build backend image${NC}"
  exit 1
fi

echo ""

# Build Frontend
echo -e "${YELLOW}📦 Building Frontend image...${NC}"
docker build -t "${FRONTEND_IMAGE}" \
  --build-arg VITE_API_URL="${VITE_API_URL:-}" \
  -f packages/frontend/Dockerfile \
  packages/frontend/

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend image built successfully: ${FRONTEND_IMAGE}${NC}"
else
  echo -e "${RED}❌ Failed to build frontend image${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 All images built successfully!${NC}"
echo ""
echo "Images created:"
echo "  - ${BACKEND_IMAGE}"
echo "  - ${FRONTEND_IMAGE}"
echo ""
echo "To push to registry:"
echo "  docker push ${BACKEND_IMAGE}"
echo "  docker push ${FRONTEND_IMAGE}"
