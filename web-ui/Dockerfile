FROM --platform=linux/aarch64 golang as builder

COPY . /app
WORKDIR /app
RUN go build

FROM --platform=linux/aarch64 debian
COPY --from=builder /app/web-ui /app/web-ui
RUN mkdir /app/data
COPY --from=builder /app/templates /app/templates
RUN useradd app
USER app
WORKDIR /app
EXPOSE 8080
CMD ["/app/web-ui"]
