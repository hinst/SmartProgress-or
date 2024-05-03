kubectl create configmap web-router-config --from-file=Caddyfile -o yaml --dry-run=client | kubectl apply -f -
kubectl apply -f web-router.yaml
kubectl rollout restart deployment web-router

kubectl apply -f smart-progress-or.yaml
kubectl apply -f ../downloader/deployment.yaml
kubectl apply -f ../web-ui/deployment.yaml
kubectl rollout restart deployment --namespace=smart-progress-or web-ui