.PHONY: build up restart clean logs

build:
	docker compose build

up:
	docker compose up -d

restart:
	docker compose restart

clean:
	docker compose down -v --remove-orphans
	docker image prune -a -f

logs:
	docker compose logs -f
