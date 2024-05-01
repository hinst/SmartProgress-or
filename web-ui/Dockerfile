FROM --platform=linux/aarch64 golang as builder

COPY . /app
WORKDIR /app
RUN go build

FROM --platform=linux/aarch64 debian
COPY --from=builder /app/web-ui /app/web-ui
COPY --from=builder /app/data /app/data
WORKDIR /app
CMD ["/app/web-ui"]
