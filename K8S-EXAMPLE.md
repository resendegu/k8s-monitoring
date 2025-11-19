# Exemplo de Deployment para Kubernetes

Este é um exemplo básico de como fazer o deploy dos containers no Kubernetes.
Você pode adaptar conforme suas necessidades (Ingress, TLS, recursos, etc).

## Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-monitoring-backend
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: k8s-monitoring-backend
  template:
    metadata:
      labels:
        app: k8s-monitoring-backend
    spec:
      containers:
      - name: backend
        image: your-registry/k8s-monitoring-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3001"
        - name: SESSION_SECRET
          valueFrom:
            secretKeyRef:
              name: k8s-monitoring-secrets
              key: session-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/check-status
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/check-status
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: monitoring
spec:
  selector:
    app: k8s-monitoring-backend
  ports:
  - port: 3001
    targetPort: 3001
```

## Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k8s-monitoring-frontend
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: k8s-monitoring-frontend
  template:
    metadata:
      labels:
        app: k8s-monitoring-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/k8s-monitoring-frontend:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "64Mi"
            cpu: "50m"
          limits:
            memory: "128Mi"
            cpu: "100m"
        livenessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: monitoring
spec:
  selector:
    app: k8s-monitoring-frontend
  ports:
  - port: 80
    targetPort: 8080
```

## Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: k8s-monitoring-secrets
  namespace: monitoring
type: Opaque
stringData:
  session-secret: "your-super-secret-key-change-this"
```

## Ingress (Exemplo com Nginx Ingress)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: k8s-monitoring
  namespace: monitoring
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  rules:
  - host: k8s-dashboard.yourdomain.com
    http:
      paths:
      # API routes go to backend
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 3001
      # All other routes go to frontend
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

## RBAC (Para o app acessar o cluster)

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: k8s-monitoring
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: k8s-monitoring-viewer
rules:
- apiGroups: [""]
  resources: ["nodes", "pods", "services", "namespaces", "events"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["apps"]
  resources: ["deployments", "statefulsets", "daemonsets"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["batch"]
  resources: ["jobs", "cronjobs"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["metrics.k8s.io"]
  resources: ["nodes", "pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: k8s-monitoring-viewer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: k8s-monitoring-viewer
subjects:
- kind: ServiceAccount
  name: k8s-monitoring
  namespace: monitoring
```

## Deploy

```bash
# Criar namespace
kubectl create namespace monitoring

# Aplicar os manifests
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f secrets.yaml
kubectl apply -f ingress.yaml
kubectl apply -f rbac.yaml

# Verificar status
kubectl get pods -n monitoring
kubectl get svc -n monitoring
kubectl get ingress -n monitoring
```
