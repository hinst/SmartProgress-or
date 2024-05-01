kubectl apply -f ../web-ui/deployment.yaml
kubectl apply -f ../web-ui/service.yaml
kubectl rollout restart deployment smart-progress-or-web-ui