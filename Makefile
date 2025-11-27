run: clean
	@echo ".> Fetching..."
	git pull
	@echo ".> Rebuilding without cache..."
	# docker-compose build --no-cache
	# docker-compose up -d
	docker-compose up -d --build

clean: stop
	@echo ".> Cleaning..."
	-docker-compose down

stop:
	@echo ".> Stopping..."
	-docker-compose stop

logs:
	@echo ".> Listening..."
	docker-compose logs -f app