/*

	yLogger

	AUTHOR		Daniel Freytag
				https://twitter.com/FRYTG
				https://github.com/FRYTG

*/

var request = 	require('request');
const os 	= 	require('os');


// Helpers
function removeNonWord(str){
  return str.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, '');
}

function lowerCase(str){
  return str.toLowerCase();
}

function upperCase(str){
  return str.toUpperCase();
}

function camelCase(str){
  str = removeNonWord(str)
      .replace(/\-/g, ' ') //convert all hyphens to spaces
      .replace(/\s[a-z]/g, upperCase) //convert first char of each word to UPPERCASE
      .replace(/\s+/g, '') //remove spaces
      .replace(/^[A-Z]/g, lowerCase); //convert first char to lowercase
  return str;
}


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
	this.logAgent = logging.log(options.serviceName);

	// Load Google Cloud Error Reporting
	const ErrorReporting = require('@google-cloud/error-reporting').ErrorReporting;
	this.errorAgent = new ErrorReporting({
		projectId: options.projectID,
		keyFilename: options.keyFilename,
		ignoreEnvironmentCheck: true
	});


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
		serviceContext: {service: label},
		data: data,
		task: label
	};
	const entry = log.entry({resource: {type: "global", labels: {device: __dirname } } }, payload);

	if(level == "error") { 				log.error(entry).then(() => { 		console.error(`Logged: ${text}`); }).catch(err => { 	console.error('ERROR:', err); });
	} else if (level == "info") { 		log.info(entry).then(() => { 		console.info(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "critical") { 	log.critical(entry).then(() => { 	console.critical(`Logged: ${text}`); }).catch(err => { 	console.error('ERROR:', err); });
	} else if (level == "warning") { 	log.warning(entry).then(() => { 	console.warn(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else if (level == "debug") { 		log.debug(entry).then(() => { 		console.log(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); });
	} else { 							log.write(entry).then(() => { 		console.log(`Logged: ${text}`); }).catch(err => { 		console.error('ERROR:', err); }); }

	if(label == 'sys') {				sendDevBot('*' + this.serviceName + "*: " + text); }

	if(level == "critical" || level == "error") {

		var message = "";
		for(key in data) {
			if(typeof (data[key]) == "object") {

				if(typeof (data[key]) == "object") {
					for(key2 in data[key]) { message += "at " + key + "." + key2 + "(" + JSON.stringify(data[key][key2]) + ")\n"; }
				} else { message += "at " + key + "(" + data[key] + ")\n"; }

			} else { message += "at " + key + "(" + data[key] + ")\n"; }
		}

		const errorEvent = errors.event();
		errorEvent.setServiceContext(os.hostname() + "-" + label, this.serviceStage);
		errorEvent.setMessage(camelCase(os.hostname() + " " + label + " " + text) + ": " + text + "\n" + message);
		errorEvent.setUser(level + "@" + os.hostname()) + "-" + this.serviceStage;
		errorEvent.setFunctionName(label + "/" + camelCase(text));
		errors.report(errorEvent, () => {
		  console.log('Opened new Issue in Google Cloud Error Reporting!');
		});
	}
};



module.exports = yLogger;
