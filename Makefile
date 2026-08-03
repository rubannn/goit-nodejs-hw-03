.PHONY: build up stop restart clean logs

build:
	docker compose build

up:
	docker compose up -d

stop:
	docker compose stop

restart:
	docker compose restart

clean:
	docker compose down -v --remove-orphans
	docker image prune -a -f

logs:
	docker compose logs -f
