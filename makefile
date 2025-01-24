dev: 	
	@npm run server

start-db:
	@docker compose up -d

stop-db:
	@docker compose down

redis-cli:
	@docker exec -it foodie-node-api-redis-1 redis-cli

run-webhook:
	@stripe listen --forward-to localhost:5006/api/stripe/webhook

run-failed-payment:
	@stripe trigger invoice.payment_failed

db-snapshot:
	@bash cmd/create-db-snaphot.sh
