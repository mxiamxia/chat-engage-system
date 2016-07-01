#### Description

co-enagement trying to engage agent to all other channel clients

-------------------
#### Preparation

* check config.js file for all the URLs
* check the app robot mattermost id and password


#### Install

Engagement Service Installation Instruction

1.	Check out co-engagement source code from GIT server,

2.	Install all the necessary software
a.	Node JS & NPM
b.	Redis server (v3.x)
c.	Mongo DB server

3.	Edit the ‘config.js’ file under the project root directory for the following items,
a.	CM_URL       (prolog cm url)
b.	mongodb     (MongoDB url)
c.	redis_host    (redis cache server url)		
d.	process.env.PORT
e.	process.env.MATTERMOST_HOST
f.	process.env.MATTERMOST_GROUP
g.	process.env.MATTERMOST_USER
h.	process.env.MATTERMOST_PASSWORD
i.	process.env.MATTERMOST_INVITETOKEN 
j.	process.env.MATTERMOST_AGENT_GROUP 
k.	etc,

4.	Run the following command under the project folder to install the dependency libs
•	 "npm install"

5.	Compile and Start the engage server by gulp module, I created a gulp script to compile, minify/compress the js/css file and start the Node server with one step. Under the project root folder, run the following command to bring up the service.
a.	"forever start --minUptime 1000 --spinSleepTime 1000 node_modules/gulp/bin/gulp.js prod"




6.	Stop the service, run the following commands,
a.	forever list
b.	forever stop <PID>

7.	Service startup verification, two steps below,
a.	Check the exception.err log file under the project root folder, if there is any new exceptions during the startup
b.	Check http://server_host_ip:port/



