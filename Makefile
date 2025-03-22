docker:
		docker stop tgbots-app
		docker rm tgbots-app
		docker rmi tgbots:latest
		docker build -t tgbots .
		docker run -d --name tgbots-app tgbots