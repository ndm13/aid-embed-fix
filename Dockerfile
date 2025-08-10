FROM debian:latest
WORKDIR /app
COPY ./static/* ./static/
COPY ./templates/* ./templates/
COPY ./build/server ./
EXPOSE 8000
CMD ["./server"]