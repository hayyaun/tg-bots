run: clean
		@echo ".> Fetching..."
		git pull
		@echo ".> Building..."
		docker build -t tgbots .
		docker run -d --name tgbots-app tgbots

clean: stop
		@echo ".> Cleaning..."
		-docker rm tgbots-app
		-docker rmi tgbots:latest

stop:
		@echo ".> Stopping..."
		docker stop tgbots-app

logs:
		@echo ".> Listening..."
		docker logs tgbots-app --follow