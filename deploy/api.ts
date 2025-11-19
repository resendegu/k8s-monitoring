/* eslint-disable prettier/prettier */
import { env, StatelessApp } from '@cubos/kube-templates';

const isPrd = env.BRANCH_NAME === 'main';
const namespace = 'ai-k8s-monitor'
const imageUri = `${env.REGISTRY}/${env.BACKEND_IMAGE_NAME}:sha-${env.COMMIT_SHA.substring(0, 7)}`
//const publicUrl = 'k8s-dash.resende.app'


export default [
  new StatelessApp(
    {
      name: 'api-k8s',
      namespace,
    },
    {
      command: ["node", "dist/index.js"],

      image: imageUri,
      imagePullSecrets: ['ghcr-registry'],
      secretEnvs: ['k8s-monitoring-env'],
      topologySpreadConstraints: [
        {
          labelSelector: {
            matchLabels: {
              app: 'api-k8s',
            },
          },
          maxSkew: 1,
          topologyKey: 'oci.oraclecloud.com/fault-domain',
          whenUnsatisfiable: 'ScheduleAnyway',
        },
      ],
      replicas: 1,
      cpu: {
        request: '50m',
        limit: '200m',
      },
      memory: {
        request: '50Mi',
        limit: '300Mi',
      },
      ports: [
        {
          port: 3001,
          serviceType: 'NodePort',
          type: 'http' as const,
          //publicUrl,
          //tlsCert: 'ebd-backend-cert',
          ingressAnnotations: {
            'cert-manager.io/cluster-issuer': 'letsencrypt-dns01-issuer',
          },
        },
      ],
      check: {
        port: 3001,
      },
    },
  ),
];
