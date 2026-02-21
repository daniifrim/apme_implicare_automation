// Docker Buildx bake configuration for multi-platform builds
// Usage: docker buildx bake --push

variable "IMAGE_NAME" {
  default = "ghcr.io/daniifrim/apme-implicare-web"
}

variable "IMAGE_TAG" {
  default = "latest"
}

group "default" {
  targets = ["app"]
}

target "app" {
  dockerfile = "Dockerfile"
  context = "."
  tags = ["${IMAGE_NAME}:${IMAGE_TAG}"]
  platforms = ["linux/amd64"]
  cache-from = [
    "type=gha,scope=apme-implicare",
    "type=registry,ref=${IMAGE_NAME}:cache"
  ]
  cache-to = [
    "type=gha,scope=apme-implicare,mode=max",
    "type=registry,ref=${IMAGE_NAME}:cache,mode=max"
  ]
  output = ["type=registry"]
}

target "app-local" {
  dockerfile = "Dockerfile"
  context = "."
  tags = ["${IMAGE_NAME}:${IMAGE_TAG}"]
  platforms = ["linux/amd64"]
  cache-from = [
    "type=gha,scope=apme-implicare"
  ]
  output = ["type=docker"]
}
