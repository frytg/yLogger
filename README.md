# yLogger

[![LICENSE](https://img.shields.io/npm/l/ylogger.svg)](https://github.com/frytg/ylogger/)
[![SIZE](https://img.shields.io/bundlephobia/min/ylogger.svg)](https://www.npmjs.com/package/ylogger)
[![VERSION](https://img.shields.io/npm/v/ylogger.svg)](https://www.npmjs.com/package/ylogger)
#### Configure logging to GCP Logs within scalable microservices



## ADVANTAGES
Forget manual configurations to catch your logging entries for GCP Logging. Copy and paste three lines of code to every script and let it handle the rest.

## INSTALL
- Add package to your project `npm i ylogger --save`
- Create a _yLoggerCongig.js_ from this template:
   ```
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
   ```
   const yLoggerConfig 			= require('./yLoggerConfig');
   const logger 				= new yLogger(yLoggerConfig).log;
   ```
- To create a log entry, simple call
   ```
   logger("ERROR_LEVEL", "FUNCTION_NAME", "DESCRIPTION", LOGGING_OBJECT);
   ```
   e.g.
   ```
   logger("error", "redisError", "connection couldn't be established", {error: err});
   ```
- You can choose from the following log levels:  
   _debug / info / warning / error / critical_
- If your FUNCTION_NAME is 'sys', then yPush will be triggered.



## LICENSE

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


## AUTHOR

- **Daniel Freytag** - [Github](https://github.com/FRYTG) / [Twitter](https://twitter.com/FRYTG)
