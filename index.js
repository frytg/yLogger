/*

	yLogger

	AUTHOR		Daniel Freytag
				https://twitter.com/FRYTG
				https://github.com/FRYTG

*/

var 	request = 	require('request');
const 	os 		= 	require('os');

var 	logAgent;
var 	errorAgent;
var 	sessionOptions;


// Helpers
const helpers = {
	removeNonWord: function(str){
		return str.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, '');
	},

	lowerCase: function(str){
		return str.toLowerCase();
	},

	upperCase = function(str){
	return str.toUpperCase();
	},

	camelCase = function(str){
		str = helpers.removeNonWord(str)
			.replace(/\-/g, ' ') //convert all hyphens to spaces
			.replace(/\s[a-z]/g, helpers.upperCase) //convert first char of each word to UPPERCASE
			.replace(/\s+/g, '') //remove spaces
			.replace(/^[A-Z]/g, helpers.lowerCase); //convert first char to lowercase
		return str;
	}
};


helpers.

helpers.


function sendDevBot(url, token, text) {
    var options = {
      uri: url,
      method: 'POST',
      json: {
		  'text': text,
		  'token': token
	  }
    };

    request(options, function (error, response, body) {
    	if (!error && response.statusCode != 200) { console.error(error); } else {
    	    console.log("sendDevBot: " + text);
    	}
    });
}

function yLogger(options) {
	/*
	 * projectID
	 * keyFilename
	 * serviceName
	 *
	*/

	const {Logging} = require('@google-cloud/logging');
	const logging = new Logging({
		projectId: options.projectID,
		keyFilename: options.keyFilename
	});
	logAgent = logging.log(options.serviceName);

	// Load Google Cloud Error Reporting
	const ErrorReporting = require('@google-cloud/error-reporting').ErrorReporting;
	errorAgent = new ErrorReporting({
		projectId: options.projectID,
		keyFilename: options.keyFilename,
		ignoreEnvironmentCheck: true
	});

	sessionOptions = options;

}

yLogger.prototype.log = function (level, label, text, data) {
	/*
	 *	Level:	debug / info / warning / error / critical
	 *	Label:	sys / function
	 *	Text:	String
	 *	Data:	Debugging
	 */

	var payload = {
		message: this.serviceName + ":" + label + "/ " + text,
		serviceContext: {
			serviceName: this.serviceName,
			label: label
		},
		data: data,
		task: label
	};
	const entry = logAgent.entry({resource: {type: "global", labels: {device: __dirname } } }, payload);

	if(level == "error") { 				logAgent.error(entry).then(() => { 		console.error(`Logged: ${text}`); }).catch(err => { 	console.error('ERROR:', err); });
	} else if (level == "info") { 		logAgent.info(entry).then(() => { 		console.info(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "critical") { 	logAgent.critical(entry).then(() => { 	console.critical(`Logged: ${text}`); }).catch(err => { 	console.error('ERROR:', err); });
	} else if (level == "warning") { 	logAgent.warning(entry).then(() => { 	console.warn(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "debug") { 		logAgent.debug(entry).then(() => { 		console.log(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else { 							logAgent.write(entry).then(() => { 		console.log(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); }); }

	if(label == 'sys' && sessionOptions.yPushInUse) { sendDevBot(sessionOptions.yPushUrl, sessionOptions.yPushToken, '*' + this.serviceName + "*: " + text); }

	if(level == "critical" || level == "error") {

		var message = "";
		for(key in data) {
			if(typeof (data[key]) == "object") {

				if(typeof (data[key]) == "object") {
					for(key2 in data[key]) { message += "at " + key + "." + key2 + "(" + JSON.stringify(data[key][key2]) + ")\n"; }
				} else { message += "at " + key + "(" + data[key] + ")\n"; }

			} else { message += "at " + key + "(" + data[key] + ")\n"; }
		}

		const errorEvent = errorAgent.event();
		errorEvent.setServiceContext(os.hostname() + "-" + label, this.serviceStage);
		errorEvent.setMessage(helpers.camelCase(os.hostname() + " " + label + " " + text) + ": " + text + "\n" + message);
		errorEvent.setUser(level + "@" + os.hostname()) + "-" + this.serviceStage;
		errorEvent.setFunctionName(label + "/" + helpers.camelCase(text));
		errorAgent.report(errorEvent, () => {
		  console.log('Opened new Issue in Google Cloud Error Reporting!');
		});
	}
};



module.exports = yLogger;
