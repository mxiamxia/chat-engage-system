#### Description

co-enagement trying to engage agent to all other channel clients

-------------------
#### Preparation

* check config.js file for all the URLs
* check the app robot mattermost id and password


#### Install
* npm install
* npm install -g forever (if forever is not installed on server)


If your package.json file contains "start": "node ./bin/www"
Use the following command to bring up your app with forever

```bash
forever start --minUptime 1000 --spinSleepTime 1000 ./bin/www
```

Check list of forever process using the command

```bash
forever list
```

Stop the forever process using the command. We can find the pid from forever list command

```bash
forever stop <pid>
```

### Mattermost server
1. ssh 进入 192.168.0.55;  账号 : mattermost, 密码：asdqwe
2. cd /opt/mattermost
3. ./shutdown.sh
4. ./startup.sh

nohup npm start &