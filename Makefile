docker:
		@echo ".> Fetching..."
		-git pull
		@echo ".> Cleaning..."
		-docker stop tgbots-app
		-docker rm tgbots-app
		-docker rmi tgbots:latest
		@echo ".> Building..."
		docker build -t tgbots .
		docker run -d --name tgbots-app tgbots