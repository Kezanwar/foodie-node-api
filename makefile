dev: 	
	@docker start foodie-redis
	@npm run server

create-redis:
	@docker run -p 6379:6379 --name foodie-redis -d -it redis/redis-stack-server:latest

stop-redis:
	@docker stop foodie-redis

redis-cli:
	@docker exec -it foodie-redis redis-cli

run-webhook:
	@stripe listen --forward-to localhost:5006/api/stripe/webhook

run-failed-payment:
	@stripe trigger invoice.payment_failed

db-snapshot:
	@bash cmd/create-db-snaphot.sh
