docker:
		@echo "Removing previous..."
		-docker stop tgbots-app
		-docker rm tgbots-app
		-docker rmi tgbots:latest
		@echo "Building new..."
		docker build -t tgbots .
		docker run -d --name tgbots-app tgbots