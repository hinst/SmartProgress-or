kubectl apply -f caddy.yaml
kubectl apply -f caddy-service.yaml
kubectl rollout restart deployment web-router

kubectl apply -f smart-progress-or.yaml
kubectl apply -f ../web-ui/deployment.yaml
kubectl apply -f ../web-ui/service.yaml
kubectl rollout restart deployment --namespace=smart-progress-or web-ui