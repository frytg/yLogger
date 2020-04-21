# yLogger

Configure logging to GCP Logs within scalable microservices

## ADVANTAGES

Forget manual configurations to catch your logging entries for GCP Logging. Copy and paste three lines of code to every script and let it handle the rest.

## INSTALL

- Add package to your project `npm i ylogger --save`
- Create a _yLoggerCongig.js_ from this template:

```js
module.exports = {
   "yPushInUse": 			true,
   "yPushUrl": 			"YOUR_HTTPS_URL",
   "yPushToken": 			"YOUR_TOKEN",

   "loggingProjectID":		"YOUR_PROJECT_FOR_GCP_LOGGING",
   "loggingKeyFilename":		"./keys/YOUR_IAM_KEY_FOR_GCP_LOGGING",
   "serviceName": 			"YOUR_MICROSERVICE_NAME",
   "serviceStage":			"YOUR_STAGE"
};
```

- Make sure that the path for loggingKeyFilename is correct, this often causes trouble
- Now import the library and config to your code:

```js
const yLoggerConfig 			= require('./yLoggerConfig');
const logger 				= new yLogger(yLoggerConfig).log;
   ```

- To create a log entry, simple call
  
```js
logger("ERROR_LEVEL", "FUNCTION_NAME", "DESCRIPTION", LOGGING_OBJECT);
```

e.g.

```js
logger("error", "redisError", "connection couldn't be established", {error: err});
```

- You can choose from the following log levels:  
   _debug / info / warning / error / critical_
- If your FUNCTION_NAME is 'sys', then yPush will be triggered.

## LICENSE

This project is available under the [hippocratic-license](https://github.com/EthicalSource/hippocratic-license); see [LICENSE](LICENSE).

## AUTHOR

- **Daniel Freytag** - [Github](https://github.com/FRYTG) / [Twitter](https://twitter.com/FRYTG)
- Developed at [**SWR Südwestrundfunk**](https://www.swr.de)
