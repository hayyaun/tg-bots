run: clean
	@echo ".> Fetching..."
	git pull
	@echo ".> Building..."
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