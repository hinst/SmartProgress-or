FROM --platform=linux/aarch64 golang as builder

COPY . /app
WORKDIR /app
RUN go build

FROM --platform=linux/aarch64 debian
COPY --from=builder /app/web-ui /app/web-ui
COPY --from=builder /app/data /app/data
CMD ["/app/web-ui"]
