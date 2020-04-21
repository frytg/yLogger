/*

	yLogger

	AUTHOR		Daniel Freytag
			https://twitter.com/FRYTG
			https://github.com/FRYTG

*/

var 	fetch 		= require('node-fetch')
const 	os 		= require('os')
const	stringify	= require('json-stringify-safe')

var 	logAgent
var 	errorAgent
var 	yLoggerSessionOptions


// Helpers
const helpers = {
	removeNonWord: function(str){
		return str.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, '');
	},

	lowerCase: function(str){
		return str.toLowerCase();
	},

	upperCase: function(str){
	return str.toUpperCase();
	},

	camelCase: function(str){
		str = helpers.removeNonWord(str)
			.replace(/\-/g, ' ') //convert all hyphens to spaces
			.replace(/\s[a-z]/g, helpers.upperCase) //convert first char of each word to UPPERCASE
			.replace(/\s+/g, '') //remove spaces
			.replace(/^[A-Z]/g, helpers.lowerCase); //convert first char to lowercase
		return str;
	}
};


const externalLogging = {
	yPush: async function(url, token, text) { try {
		// build options
		let options = {
			method: 'POST',
			body:	JSON.stringify({
				text:	text,
				token:	token
			}),
			headers:	{ 
				'Content-Type':	'application/json',
				'User-Agent':	'yLogger/1.7.0'
			}
		}


		// send request
		let post = await fetch(url, options)
		
		
		// handle errors
		if(post.status != 200) {
			let text = await post.text()
			console.error('yPush > ' + text)
		}


		// close promise
		return Promise.resolve()

	} catch (err) {
		console.error('externalLogging.yPush', err)
		return Promise.reject(err)
	} }
}

function yLogger(options) { try {
	/*
		* projectID
		* keyFilename
		* serviceName
	*/

	const {Logging}		= require('@google-cloud/logging')
	const logging		= new Logging({
		projectId:		options.loggingProjectID,
		keyFilename:		options.loggingKeyFilename
	})
	logAgent = logging.log(options.serviceName)


	// Load Google Cloud Error Reporting
	const {ErrorReporting}	= require('@google-cloud/error-reporting')
	errorAgent 		= new ErrorReporting({
		projectId:		options.loggingProjectID,
		keyFilename:		options.loggingKeyFilename,
		reportMode:		'always'
	})

	yLoggerSessionOptions = options

} catch (err) {
	console.error('yLogger', err)
} }

yLogger.prototype.log = function (level, func, text, data) { try {
	/*
		*	Level:	debug / info / warning / error / critical
		*	func:	sys / function-name
		*	Text:	String
		*	Data:	Object
		*/

	var payload = {
		message: text,
		serviceContext: {
			serviceName: yLoggerSessionOptions.serviceName,
			serviceStage: yLoggerSessionOptions.serviceStage,
			function: func,
			host: os.hostname()
		},
		data: data
	};
	const entry = logAgent.entry({resource: {type: "global", labels: {device: __dirname } } }, payload);

	if(level == "error") { 			logAgent.error(entry).then(() => { 		console.error(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "info") { 		logAgent.info(entry).then(() => { 		console.info(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "critical") { 	logAgent.critical(entry).then(() => { 		console.error(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "warning") { 	logAgent.warning(entry).then(() => { 		console.warn(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "debug") { 		logAgent.debug(entry).then(() => { 		console.log(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else { 				logAgent.write(entry).then(() => { 		console.log(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); }); }


	// Push to yLogger if enabled
	if(func == 'sys' && yLoggerSessionOptions.yPushInUse) {
		await externalLogging.yPush(yLoggerSessionOptions.yPushUrl, yLoggerSessionOptions.yPushToken, '*' + yLoggerSessionOptions.serviceName + "*: " + text);
	}


	if(level == "critical" || level == "error") {
		// Format message for Error Reporting
		var message = "";
		for(key in data) {
			if(typeof (data[key]) == "object") {

				if(typeof (data[key]) == "object") {
					for(key2 in data[key]) { message += "at " + key + "." + key2 + "(" + stringify(data[key][key2]) + ")\n"; }
				} else { message += "at " + key + "(" + data[key] + ")\n"; }

			} else { message += "at " + key + "(" + data[key] + ")\n"; }
		}

		// Build Event and push to Error Reporting
		const errorEvent = errorAgent.event();
		errorEvent.setServiceContext(yLoggerSessionOptions.serviceName + ":" + func + " @" + os.hostname(), yLoggerSessionOptions.serviceStage);
		errorEvent.setMessage(yLoggerSessionOptions.serviceName + " -> " + func + " -> " + text + "\n" + message);
		errorEvent.setUser(level + "@" + os.hostname()) + "-" + this.serviceStage;
		errorEvent.setFunctionName(func + "/" + helpers.camelCase(text));
		errorAgent.report(errorEvent, () => {
			console.log('Pushed new Issue to Google Cloud Error Reporting!');
		});
	}
} catch (err) {
	console.error('yLogger.prototype.log', err)
} }



module.exports = yLogger
