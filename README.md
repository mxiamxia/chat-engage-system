#### Description

co-enagement trying to engage agent to all other channel clients

-------------------
#### Preparation

* check config.js file for all the URLs
* check the app robot mattermost id and password


#### Install

Engagement Service Installation Instruction

1. Check out co-engagement source code from GIT server,

2. Install all the necessary software
  * Node JS & NPM
  * Redis server (v3.x)
  * Mongo DB server

3.	Edit the ‘config.js’ file under the project root directory for the following items,
  -	CM_URL       (prolog cm url)
  -	mongodb     (MongoDB url)
  -	redis_host    (redis cache server url)		
  -	process.env.PORT
  -	process.env.MATTERMOST_HOST
  -	process.env.MATTERMOST_GROUP
  -	process.env.MATTERMOST_USER
  -	process.env.MATTERMOST_PASSWORD
  -	process.env.MATTERMOST_INVITETOKEN 
  -	process.env.MATTERMOST_AGENT_GROUP 
  -	etc,

4.	Run the following command under the project folder to install the dependency libs
  -	 "npm install"

5.	Compile and Start the engage server by gulp module, I created a gulp script to compile, minify/compress the js/css file and start the Node server with one step. Under the project root folder, run the following command to bring up the service.
  -	"forever start --minUptime 1000 --spinSleepTime 1000 node_modules/gulp/bin/gulp.js prod"




6.	Stop the service, run the following commands,
  -	forever list
  -	forever stop <PID>

7.	Service startup verification, two steps below,
  -	Check the exception.err log file under the project root folder, if there is any new exceptions during the startup
  -	Check http://server_host_ip:port/
  
### Testing  
  Coverage test script
```bash  
  istanbul cover _mocha --recursive test/*
```
  Load testing
```bash 
  http://localhost:4012/api/createMultipleUsers?nums=5&&username=test
  siege --concurrent=50 --reps=10 -f urls.txt
```




