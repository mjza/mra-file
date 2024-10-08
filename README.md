# File API service

## Creation Steps
1. Created a `mra-file` repository in GitHub
2. Created a `mra-file` Heroku app and connected it to the repository.
3. Activated `Automatic deploys` in Heroku after connecting to the repository.
4. Used `npm init -y` to initialize a new Node.js project.
5. Installed Express, and PostgreSQL database client libraries.
```
npm install express pg
```
6. Add a `Procfile` to the application. This file is used for starting the application in Heroku and must have the following content.
Please note that Heroku does not use the start script in of the `package.json`.
```
web: NODE_ENV=production node src/index.mjs
``` 

## Install Heroku CLI
Follow the instructions in this [link](https://devcenter.heroku.com/articles/heroku-cli#verify-your-installation) and install Heroku CLI. 

## local
Copy `config/template.env` file and rename it to `config/.env`.
Update its content accordingly with respect to your system. 

## production

For the production: 
1. You must change the `XXX` in the following list accordingly from `Settings` tab of the `mra-database` application. 

2. You must change `YYY` must be replaced via [https://app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys).

```bash
heroku config:set BASE_URL=http://file.myreport.app --app mra-file
heroku config:set DB_USER=XXX --app mra-file
heroku config:set DB_HOST=XXX --app mra-file
heroku config:set DB_NAME=XXX --app mra-file
heroku config:set DB_PASSWORD=XXX --app mra-file
heroku config:set DB_PORT=5432 --app mra-file
heroku config:set DOC_URL=/docs --app mra-file
heroku config:set DOC_PASS=Zu~0WC,X,8h3Hh@s --app mra-file
heroku config:set DOC_USER=modir --app mra-file
heroku config:set NODE_ENV=production --app mra-file
heroku config:set PORT=443 --app mra-file
heroku config:set TZ=UTC --app mra-file
heroku config:set SECRET_KEY=ZZZ --app mra-file
heroku config:set AUTH_SERVER_URL=http://localhost:3000 --app mra-file
heroku config:set CORS_ALLOWED_URLS=http://localhost:2583, https://myreportapp.com, https://myreport.app --app mra-file
heroku config:set AWS_ACCESS_KEY_ID=AAA --app mra-file
heroku config:set AWS_SECRET_ACCESS_KEY=WWW --app mra-file
heroku config:set AWS_REGION=ZZZ --app mra-file
heroku config:set ACTIVATE_SWAGGER=true --app mra-file
```

Then run run the above commands in the Heroku CLI or go to the `mra-file` application, then in the `Settings` tab press on the `Reveal Config Vars` button and edit them directly. Like the following picture:
![](./images/figure3.png)


## creating SSL for localhost

```bash
openssl req -x509 -newkey rsa:4096 -keyout localhost.key -out localhost.crt -days 365 -nodes -subj "/CN=localhost"
```

## Generate a 256-bit (32-byte) random key and print it in hexadecimal format
```bash 
openssl rand -hex 32
```
This key is used as SECRET_KEY in .env file. 

## Generate documentations using JSDoc
```bash
npm run generate-docs
```

## GitHub configuration
`HEROKU_API_KEY` is the api key for accessing `mra-file` application, and `MY_PAT` is my personal access token of GitHub for tagging releases. They have been particularly set in GitHub secrets.

Use `heroku cores:create` for creating a key for setting `HEROKU_API_KEY`.

![](./images/figure4.png)

They are needed in the workflow codes that we generated for automatically tagging the releases based on the version number in Heroku. The code exist in `.github\workflows` folder. 

`main.yml` is run automatically when we push to main branch. However, after a seccessful push to Heroku, we must run the other workflow in GitHub manually. 
![](./images/figure5.png)

## Troubleshooting

If you face with this type of error in Heroku or GitHub log:

```bash
2024-10-08T23:37:02.957587+00:00 app[web.1]: ConnectionError [SequelizeConnectionError]: password authentication failed for user "khmywybwogatvd"
2024-10-08T23:37:02.957604+00:00 app[web.1]:     at Client._connectionCallback (/app/node_modules/sequelize/lib/dialects/postgres/connection-manager.js:145:24)
2024-10-08T23:37:02.957608+00:00 app[web.1]:     at Client._handleErrorWhileConnecting (/app/node_modules/pg/lib/client.js:326:19)
2024-10-08T23:37:02.957612+00:00 app[web.1]:     at Client._handleErrorMessage (/app/node_modules/pg/lib/client.js:346:19)
2024-10-08T23:37:02.957612+00:00 app[web.1]:     at Connection.emit (node:events:519:28)
2024-10-08T23:37:02.957613+00:00 app[web.1]:     at /app/node_modules/pg/lib/connection.js:116:12
2024-10-08T23:37:02.957613+00:00 app[web.1]:     at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:36:17)
2024-10-08T23:37:02.957613+00:00 app[web.1]:     at TLSSocket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
2024-10-08T23:37:02.957614+00:00 app[web.1]:     at TLSSocket.emit (node:events:519:28)
2024-10-08T23:37:02.957614+00:00 app[web.1]:     at addChunk (node:internal/streams/readable:559:12)
2024-10-08T23:37:02.957614+00:00 app[web.1]:     at readableAddChunkPushByteMode (node:internal/streams/readable:510:3) {
2024-10-08T23:37:02.957614+00:00 app[web.1]:   parent: error: password authentication failed for user "khmywybwogatvd"
2024-10-08T23:37:02.957614+00:00 app[web.1]:       at Parser.parseErrorMessage (/app/node_modules/pg-protocol/dist/parser.js:283:98)
2024-10-08T23:37:02.957614+00:00 app[web.1]:       at Parser.handlePacket (/app/node_modules/pg-protocol/dist/parser.js:122:29)
2024-10-08T23:37:02.957615+00:00 app[web.1]:       at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:35:38)
2024-10-08T23:37:02.957615+00:00 app[web.1]:       at TLSSocket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
2024-10-08T23:37:02.957615+00:00 app[web.1]:       at TLSSocket.emit (node:events:519:28)
2024-10-08T23:37:02.957615+00:00 app[web.1]:       at addChunk (node:internal/streams/readable:559:12)
2024-10-08T23:37:02.957616+00:00 app[web.1]:       at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
2024-10-08T23:37:02.957616+00:00 app[web.1]:       at Readable.push (node:internal/streams/readable:390:5)
2024-10-08T23:37:02.957616+00:00 app[web.1]:       at TLSWrap.onStreamRead (node:internal/stream_base_commons:191:23) {
2024-10-08T23:37:02.957616+00:00 app[web.1]:     length: 110,
2024-10-08T23:37:02.957617+00:00 app[web.1]:     severity: 'FATAL',
2024-10-08T23:37:02.957617+00:00 app[web.1]:     code: '28P01',
2024-10-08T23:37:02.957617+00:00 app[web.1]:     detail: undefined,
2024-10-08T23:37:02.957617+00:00 app[web.1]:     hint: undefined,
2024-10-08T23:37:02.957617+00:00 app[web.1]:     position: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     internalPosition: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     internalQuery: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     where: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     schema: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     table: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     column: undefined,
2024-10-08T23:37:02.957618+00:00 app[web.1]:     dataType: undefined,
2024-10-08T23:37:02.957619+00:00 app[web.1]:     constraint: undefined,
2024-10-08T23:37:02.957619+00:00 app[web.1]:     file: 'auth.c',
2024-10-08T23:37:02.957619+00:00 app[web.1]:     line: '329',
2024-10-08T23:37:02.957619+00:00 app[web.1]:     routine: 'auth_failed'
2024-10-08T23:37:02.957620+00:00 app[web.1]:   },
2024-10-08T23:37:02.957620+00:00 app[web.1]:   original: error: password authentication failed for user "khmywybwogatvd"
2024-10-08T23:37:02.957620+00:00 app[web.1]:       at Parser.parseErrorMessage (/app/node_modules/pg-protocol/dist/parser.js:283:98)
2024-10-08T23:37:02.957620+00:00 app[web.1]:       at Parser.handlePacket (/app/node_modules/pg-protocol/dist/parser.js:122:29)
2024-10-08T23:37:02.957620+00:00 app[web.1]:       at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:35:38)
2024-10-08T23:37:02.957620+00:00 app[web.1]:       at TLSSocket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
2024-10-08T23:37:02.957621+00:00 app[web.1]:       at TLSSocket.emit (node:events:519:28)
2024-10-08T23:37:02.957621+00:00 app[web.1]:       at addChunk (node:internal/streams/readable:559:12)
2024-10-08T23:37:02.957621+00:00 app[web.1]:       at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
2024-10-08T23:37:02.957621+00:00 app[web.1]:       at Readable.push (node:internal/streams/readable:390:5)
2024-10-08T23:37:02.957621+00:00 app[web.1]:       at TLSWrap.onStreamRead (node:internal/stream_base_commons:191:23) {
2024-10-08T23:37:02.957621+00:00 app[web.1]:     length: 110,
2024-10-08T23:37:02.957621+00:00 app[web.1]:     severity: 'FATAL',
2024-10-08T23:37:02.957622+00:00 app[web.1]:     code: '28P01',
2024-10-08T23:37:02.957622+00:00 app[web.1]:     detail: undefined,
2024-10-08T23:37:02.957622+00:00 app[web.1]:     hint: undefined,
2024-10-08T23:37:02.957622+00:00 app[web.1]:     position: undefined,
2024-10-08T23:37:02.957622+00:00 app[web.1]:     internalPosition: undefined,
2024-10-08T23:37:02.957622+00:00 app[web.1]:     internalQuery: undefined,
2024-10-08T23:37:02.957622+00:00 app[web.1]:     where: undefined,
2024-10-08T23:37:02.957623+00:00 app[web.1]:     schema: undefined,
2024-10-08T23:37:02.957623+00:00 app[web.1]:     table: undefined,
2024-10-08T23:37:02.957623+00:00 app[web.1]:     column: undefined,
2024-10-08T23:37:02.957623+00:00 app[web.1]:     dataType: undefined,
2024-10-08T23:37:02.957623+00:00 app[web.1]:     constraint: undefined,
2024-10-08T23:37:02.957623+00:00 app[web.1]:     file: 'auth.c',
2024-10-08T23:37:02.957623+00:00 app[web.1]:     line: '329',
2024-10-08T23:37:02.957624+00:00 app[web.1]:     routine: 'auth_failed'
2024-10-08T23:37:02.957624+00:00 app[web.1]:   }
2024-10-08T23:37:02.957624+00:00 app[web.1]: }
2024-10-08T23:37:03.132125+00:00 app[web.1]: /app/node_modules/sequelize/lib/dialects/postgres/connection-manager.js:145
2024-10-08T23:37:03.132126+00:00 app[web.1]:                 reject(new sequelizeErrors.ConnectionError(err));
2024-10-08T23:37:03.132127+00:00 app[web.1]:                        ^
2024-10-08T23:37:03.132127+00:00 app[web.1]: 
2024-10-08T23:37:03.132128+00:00 app[web.1]: ConnectionError [SequelizeConnectionError]: password authentication failed for user "khmywybwogatvd"
2024-10-08T23:37:03.132128+00:00 app[web.1]:     at Client._connectionCallback (/app/node_modules/sequelize/lib/dialects/postgres/connection-manager.js:145:24)
2024-10-08T23:37:03.132128+00:00 app[web.1]:     at Client._handleErrorWhileConnecting (/app/node_modules/pg/lib/client.js:326:19)
2024-10-08T23:37:03.132129+00:00 app[web.1]:     at Client._handleErrorMessage (/app/node_modules/pg/lib/client.js:346:19)
2024-10-08T23:37:03.132129+00:00 app[web.1]:     at Connection.emit (node:events:519:28)
2024-10-08T23:37:03.132129+00:00 app[web.1]:     at /app/node_modules/pg/lib/connection.js:116:12
2024-10-08T23:37:03.132130+00:00 app[web.1]:     at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:36:17)
2024-10-08T23:37:03.132130+00:00 app[web.1]:     at TLSSocket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
2024-10-08T23:37:03.132130+00:00 app[web.1]:     at TLSSocket.emit (node:events:519:28)
2024-10-08T23:37:03.132130+00:00 app[web.1]:     at addChunk (node:internal/streams/readable:559:12)
2024-10-08T23:37:03.132131+00:00 app[web.1]:     at readableAddChunkPushByteMode (node:internal/streams/readable:510:3) {
2024-10-08T23:37:03.132131+00:00 app[web.1]:   parent: error: password authentication failed for user "khmywybwogatvd"
2024-10-08T23:37:03.132131+00:00 app[web.1]:       at Parser.parseErrorMessage (/app/node_modules/pg-protocol/dist/parser.js:283:98)
2024-10-08T23:37:03.132131+00:00 app[web.1]:       at Parser.handlePacket (/app/node_modules/pg-protocol/dist/parser.js:122:29)
2024-10-08T23:37:03.132132+00:00 app[web.1]:       at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:35:38)
2024-10-08T23:37:03.132132+00:00 app[web.1]:       at TLSSocket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
2024-10-08T23:37:03.132132+00:00 app[web.1]:       at TLSSocket.emit (node:events:519:28)
2024-10-08T23:37:03.132132+00:00 app[web.1]:       at addChunk (node:internal/streams/readable:559:12)
2024-10-08T23:37:03.132133+00:00 app[web.1]:       at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
2024-10-08T23:37:03.132133+00:00 app[web.1]:       at Readable.push (node:internal/streams/readable:390:5)
2024-10-08T23:37:03.132133+00:00 app[web.1]:       at TLSWrap.onStreamRead (node:internal/stream_base_commons:191:23) {
2024-10-08T23:37:03.132133+00:00 app[web.1]:     length: 110,
2024-10-08T23:37:03.132134+00:00 app[web.1]:     severity: 'FATAL',
2024-10-08T23:37:03.132134+00:00 app[web.1]:     code: '28P01',
2024-10-08T23:37:03.132134+00:00 app[web.1]:     detail: undefined,
2024-10-08T23:37:03.132134+00:00 app[web.1]:     hint: undefined,
2024-10-08T23:37:03.132135+00:00 app[web.1]:     position: undefined,
2024-10-08T23:37:03.132135+00:00 app[web.1]:     internalPosition: undefined,
2024-10-08T23:37:03.132135+00:00 app[web.1]:     internalQuery: undefined,
2024-10-08T23:37:03.132135+00:00 app[web.1]:     where: undefined,
2024-10-08T23:37:03.132135+00:00 app[web.1]:     schema: undefined,
2024-10-08T23:37:03.132136+00:00 app[web.1]:     table: undefined,
2024-10-08T23:37:03.132136+00:00 app[web.1]:     column: undefined,
2024-10-08T23:37:03.132136+00:00 app[web.1]:     dataType: undefined,
2024-10-08T23:37:03.132136+00:00 app[web.1]:     constraint: undefined,
2024-10-08T23:37:03.132136+00:00 app[web.1]:     file: 'auth.c',
2024-10-08T23:37:03.132136+00:00 app[web.1]:     line: '329',
2024-10-08T23:37:03.132136+00:00 app[web.1]:     routine: 'auth_failed'
2024-10-08T23:37:03.132137+00:00 app[web.1]:   },
2024-10-08T23:37:03.132137+00:00 app[web.1]:   original: error: password authentication failed for user "khmywybwogatvd"
2024-10-08T23:37:03.132137+00:00 app[web.1]:       at Parser.parseErrorMessage (/app/node_modules/pg-protocol/dist/parser.js:283:98)
2024-10-08T23:37:03.132137+00:00 app[web.1]:       at Parser.handlePacket (/app/node_modules/pg-protocol/dist/parser.js:122:29)
2024-10-08T23:37:03.132137+00:00 app[web.1]:       at Parser.parse (/app/node_modules/pg-protocol/dist/parser.js:35:38)
2024-10-08T23:37:03.132137+00:00 app[web.1]:       at TLSSocket.<anonymous> (/app/node_modules/pg-protocol/dist/index.js:11:42)
2024-10-08T23:37:03.132137+00:00 app[web.1]:       at TLSSocket.emit (node:events:519:28)
2024-10-08T23:37:03.132138+00:00 app[web.1]:       at addChunk (node:internal/streams/readable:559:12)
2024-10-08T23:37:03.132138+00:00 app[web.1]:       at readableAddChunkPushByteMode (node:internal/streams/readable:510:3)
2024-10-08T23:37:03.132138+00:00 app[web.1]:       at Readable.push (node:internal/streams/readable:390:5)
2024-10-08T23:37:03.132138+00:00 app[web.1]:       at TLSWrap.onStreamRead (node:internal/stream_base_commons:191:23) {
2024-10-08T23:37:03.132138+00:00 app[web.1]:     length: 110,
2024-10-08T23:37:03.132138+00:00 app[web.1]:     severity: 'FATAL',
2024-10-08T23:37:03.132138+00:00 app[web.1]:     code: '28P01',
2024-10-08T23:37:03.132139+00:00 app[web.1]:     detail: undefined,
2024-10-08T23:37:03.132139+00:00 app[web.1]:     hint: undefined,
2024-10-08T23:37:03.132139+00:00 app[web.1]:     position: undefined,
2024-10-08T23:37:03.132139+00:00 app[web.1]:     internalPosition: undefined,
2024-10-08T23:37:03.132139+00:00 app[web.1]:     internalQuery: undefined,
2024-10-08T23:37:03.132139+00:00 app[web.1]:     where: undefined,
2024-10-08T23:37:03.132139+00:00 app[web.1]:     schema: undefined,
2024-10-08T23:37:03.132140+00:00 app[web.1]:     table: undefined,
2024-10-08T23:37:03.132140+00:00 app[web.1]:     column: undefined,
2024-10-08T23:37:03.132140+00:00 app[web.1]:     dataType: undefined,
2024-10-08T23:37:03.132140+00:00 app[web.1]:     constraint: undefined,
2024-10-08T23:37:03.132140+00:00 app[web.1]:     file: 'auth.c',
2024-10-08T23:37:03.132140+00:00 app[web.1]:     line: '329',
2024-10-08T23:37:03.132140+00:00 app[web.1]:     routine: 'auth_failed'
2024-10-08T23:37:03.132141+00:00 app[web.1]:   }
2024-10-08T23:37:03.132141+00:00 app[web.1]: }
```

It is because of DB connection data that is set wrongly in Heroku or GitHub