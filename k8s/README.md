# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Discord Free Games Bot.

## Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl CLI tool
- kustomize (bundled with kubectl v1.14+)
- Discord Bot Token and Client ID
- Access to pull images from GitHub Container Registry (ghcr.io)

## Quick Start

### 1. Configure Secrets

Before deploying, you need to set your Discord bot credentials. You have two options:

#### Option A: Edit secret.yaml
Edit `secret.yaml` and replace the placeholder values:
```yaml
stringData:
  DISCORD_TOKEN: "your_discord_bot_token_here"
  CLIENT_ID: "your_discord_client_id_here"
```

#### Option B: Create secret with kubectl (Recommended)
```bash
kubectl create secret generic discord-bot-secret \
  --from-literal=DISCORD_TOKEN=your_actual_token \
  --from-literal=CLIENT_ID=your_actual_client_id \
  -n discord-bot
```

If using Option B, comment out or remove the `secret.yaml` from `kustomization.yaml`.

### 2. Configure Bot Settings (Optional)

Edit `configmap.yaml` to customize:
- Guild ID (optional, for development)
- Log level (DEBUG or INFO)
- Initial bot configuration (channel, enabled services)

### 3. Deploy with Kustomize

Deploy all resources using kustomize:
```bash
# Apply all manifests
kubectl apply -k .

# Verify deployment
kubectl get all -n discord-bot
kubectl get pods -n discord-bot
kubectl logs -f deployment/discord-bot -n discord-bot
```

### 4. Deploy Commands to Discord

After the bot is running, you need to register the slash commands with Discord:

```bash
# Get pod name
POD_NAME=$(kubectl get pod -n discord-bot -l app=discord-bot -o jsonpath="{.items[0].metadata.name}")

# Run deploy commands
kubectl exec -it $POD_NAME -n discord-bot -- node dist/deploy-commands.js
```

## File Structure

```
k8s/
├── README.md           # This file
├── kustomization.yaml  # Kustomize configuration
├── namespace.yaml      # Discord bot namespace
├── configmap.yaml      # Bot configuration
├── secret.yaml         # Discord credentials (template)
└── deployment.yaml     # Bot deployment
```

## Manifest Details

### namespace.yaml
Creates a dedicated namespace `discord-bot` for isolating the bot resources.

### configmap.yaml
Contains non-sensitive configuration:
- Environment variables (GUILD_ID, LOG_LEVEL)
- Initial bot configuration (config.json)

### secret.yaml
Contains sensitive Discord credentials:
- DISCORD_TOKEN: Your Discord bot token
- CLIENT_ID: Your Discord application client ID

**⚠️ Warning**: Do not commit actual secrets to version control!

### deployment.yaml
Defines the bot deployment with:
- Single replica (bots should not run multiple instances)
- Resource limits (512Mi RAM, 500m CPU)
- Volume mounts for persistent data
- Environment variables from ConfigMap and Secret

### kustomization.yaml
Kustomize configuration that:
- Combines all manifests
- Applies common labels
- Configures the namespace
- Allows image tag customization

## Customization

### Using a Specific Release Version

Edit `kustomization.yaml` to use a specific release tag:
```yaml
images:
  - name: ghcr.io/vibecoding-inc/discord-featureschleuder
    newTag: v1.0.0  # Change from 'latest' to specific version
```

### Adjusting Resources

Edit `deployment.yaml` to modify resource limits:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

### Using Persistent Storage

By default, the bot uses `emptyDir` for data storage. To use persistent storage:

1. Create a PersistentVolumeClaim:
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: discord-bot-data
  namespace: discord-bot
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

2. Update `deployment.yaml` to use the PVC:
```yaml
volumes:
- name: data
  persistentVolumeClaim:
    claimName: discord-bot-data
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n discord-bot
kubectl describe pod <pod-name> -n discord-bot
```

### View Logs
```bash
# Follow logs
kubectl logs -f deployment/discord-bot -n discord-bot

# View recent logs
kubectl logs --tail=100 deployment/discord-bot -n discord-bot
```

### Check Configuration
```bash
# View ConfigMap
kubectl get configmap discord-bot-config -n discord-bot -o yaml

# View Secret (base64 encoded)
kubectl get secret discord-bot-secret -n discord-bot -o yaml
```

### Image Pull Issues

If you encounter image pull errors:
```bash
# For private repositories, create an image pull secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=your-github-username \
  --docker-password=your-github-token \
  -n discord-bot

# Then reference it in deployment.yaml
spec:
  imagePullSecrets:
  - name: ghcr-secret
```

### Bot Not Responding

1. Verify the bot token is correct
2. Check that the bot has proper permissions in Discord
3. Ensure slash commands are deployed
4. Verify the bot is online in Discord

## Updating the Bot

### Update to Latest Version
```bash
kubectl rollout restart deployment/discord-bot -n discord-bot
```

### Update to Specific Version
```bash
# Edit kustomization.yaml to change the image tag
kubectl apply -k .
```

### Monitor Rollout
```bash
kubectl rollout status deployment/discord-bot -n discord-bot
```

## Cleanup

To remove all bot resources:
```bash
# Delete all resources
kubectl delete -k .

# Or delete the namespace (removes everything)
kubectl delete namespace discord-bot
```

## Security Notes

1. **Never commit secrets**: The `secret.yaml` file contains placeholder values only
2. **Use RBAC**: Consider creating a ServiceAccount with minimal permissions
3. **Network Policies**: Implement network policies to restrict bot traffic
4. **Image Scanning**: Scan Docker images for vulnerabilities before deployment
5. **Regular Updates**: Keep the bot and dependencies up to date

## GitHub Container Registry Authentication

The bot images are hosted on GitHub Container Registry (ghcr.io). For public repositories, no authentication is needed. For private repositories:

```bash
# Create a GitHub Personal Access Token with 'read:packages' scope
# Then create a pull secret:
kubectl create secret docker-registry ghcr-login \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --docker-email=YOUR_EMAIL \
  -n discord-bot
```

Add to deployment.yaml:
```yaml
spec:
  imagePullSecrets:
  - name: ghcr-login
```

## Support

For issues or questions:
1. Check the main [README.md](../README.md)
2. Review the [GitHub Issues](https://github.com/vibecoding-inc/discord-featureschleuder/issues)
3. Check bot logs for error messages
