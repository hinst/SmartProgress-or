helmfile apply &&^
kubectl rollout restart deployment web-router &&^
kubectl rollout restart deployment --namespace=smart-progress-or web-ui
echo %ERRORLEVEL%