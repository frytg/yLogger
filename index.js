/*

	yLogger

	AUTHOR		Daniel Freytag
			https://twitter.com/FRYTG
			https://github.com/FRYTG

*/

const fetch = require('node-fetch');
const os = require('os');
const stringify = require('json-stringify-safe');

var logAgent;
var errorAgent;
var yLoggerSessionOptions;

// Helpers
const helpers = {
	removeNonWord: function (str) {
		return str.replace(/[^0-9a-zA-Z\xC0-\xFF \-]/g, '');
	},

	lowerCase: function (str) {
		return str.toLowerCase();
	},

	upperCase: function (str) {
		return str.toUpperCase();
	},

	camelCase: function (str) {
		str = helpers
			.removeNonWord(str)
			.replace(/\-/g, ' ') //convert all hyphens to spaces
			.replace(/\s[a-z]/g, helpers.upperCase) //convert first char of each word to UPPERCASE
			.replace(/\s+/g, '') //remove spaces
			.replace(/^[A-Z]/g, helpers.lowerCase); //convert first char to lowercase
		return str;
	},
};

const externalLogging = {
	yPush: async function (url, token, text) {
		try {
			// build options
			let options = {
				method: 'POST',
				body: JSON.stringify({
					text: text,
					token: token,
				}),
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'yLogger/2.0.0',
				},
			};

			// send request
			let post = await fetch(url, options);

			// handle errors
			if (post.status != 200) {
				let text = await post.text();
				console.error('yPush > ' + text);
			}

			// close promise
			return Promise.resolve();
		} catch (err) {
			console.error(
				'yPush',
				JSON.stringify({
					err: err && err.stack ? err.stack : err,
					url,
					text,
				})
			);
			return Promise.reject(err);
		}
	},
};

function yLogger(options) {
	try {
		/*
		 * projectID
		 * keyFilename
		 * serviceName
		 */

		const { Logging } = require('@google-cloud/logging');
		const logging = new Logging({
			projectId: options.loggingProjectID,
			keyFilename: options.loggingKeyFilename,
		});
		logAgent = logging.log(options.serviceName);

		// Load Google Cloud Error Reporting
		const { ErrorReporting } = require('@google-cloud/error-reporting');
		errorAgent = new ErrorReporting({
			projectId: options.loggingProjectID,
			keyFilename: options.loggingKeyFilename,
			reportMode: 'always',
		});

		// update global options
		yLoggerSessionOptions = options;
	} catch (err) {
		console.error(
			'yLogger',
			'init error',
			JSON.stringify({
				err: err && err.stack ? err.stack : err,
				options,
			})
		);
	}
}

yLogger.prototype.log = async function (level, func, text, data) {
	try {
		/*
		 *	Level:	debug / info / warning / error / critical
		 *	func:	sys / function-name
		 *	Text:	String
		 *	Data:	Object
		 */

		// create inital payload
		var payload = {
			message: text,
			serviceContext: {
				serviceName: yLoggerSessionOptions.serviceName,
				serviceStage: yLoggerSessionOptions.serviceStage,
				function: func,
				host: os.hostname(),
			},
			data: data,
		};

		// wrap in log entry
		let entry = logAgent.entry(
			{
				resource: {
					type: 'global',
					labels: {
						device: __dirname,
					},
				},
			},
			payload
		);

		if (level == 'error') {
			await logAgent.error(entry);
			yLoggerSessionOptions.silent ? console.error(`Logged: ${text}`) : null;
			yLoggerSessionOptions.verbose ? console.error(text, JSON.stringify(data)) : null;
		} else if (level == 'info') {
			await logAgent.info(entry);
			yLoggerSessionOptions.silent ? console.info(`Logged: ${text}`) : null;
			yLoggerSessionOptions.verbose ? console.info(text, JSON.stringify(data)) : null;
		} else if (level == 'critical') {
			await logAgent.critical(entry);
			yLoggerSessionOptions.silent ? console.error(`Logged: ${text}`) : null;
			yLoggerSessionOptions.verbose ? console.error(text, JSON.stringify(data)) : null;
		} else if (level == 'warning') {
			await logAgent.warning(entry);
			yLoggerSessionOptions.silent ? console.warn(`Logged: ${text}`) : null;
			yLoggerSessionOptions.verbose ? console.warn(text, JSON.stringify(data)) : null;
		} else if (level == 'debug') {
			await logAgent.debug(entry);
			yLoggerSessionOptions.silent ? console.debug(`Logged: ${text}`) : null;
			yLoggerSessionOptions.verbose ? console.debug(text, JSON.stringify(data)) : null;
		} else {
			await logAgent.write(entry);
			yLoggerSessionOptions.silent ? console.log(`Logged: ${text}`) : null;
			yLoggerSessionOptions.verbose ? console.log(text, JSON.stringify(data)) : null;
		}

		// Push to yLogger if enabled
		if (func == 'sys' && yLoggerSessionOptions.yPushInUse) {
			await externalLogging.yPush(
				yLoggerSessionOptions.yPushUrl,
				yLoggerSessionOptions.yPushToken,
				'*' + yLoggerSessionOptions.serviceName + '*: ' + text
			);
		}

		if (level == 'critical' || level == 'error') {
			// Format message for Error Reporting
			let message = '';
			for (let key in data) {
				if (typeof data[key] == 'object') {
					if (typeof data[key] == 'object') {
						for (let key2 in data[key]) {
							message +=
								'at ' +
								key +
								'.' +
								key2 +
								'(' +
								stringify(data[key][key2]) +
								')\n';
						}
					} else {
						message += 'at ' + key + '(' + data[key] + ')\n';
					}
				} else {
					message += 'at ' + key + '(' + data[key] + ')\n';
				}
			}

			// build event
			let errorEvent = errorAgent.event();

			// update context
			errorEvent.setServiceContext(
				yLoggerSessionOptions.serviceName + ':' + func + ' @' + os.hostname(),
				yLoggerSessionOptions.serviceStage
			);

			// insert message
			errorEvent.setMessage(
				yLoggerSessionOptions.serviceName + ' -> ' + func + ' -> ' + text + '\n' + message
			);

			// set user (combined string)
			errorEvent.setUser(level + '@' + os.hostname()) + '-' + this.serviceStage;

			// update function name (combined string)
			errorEvent.setFunctionName(func + '/' + helpers.camelCase(text));

			// send event
			await errorAgent.report(errorEvent);
			yLoggerSessionOptions.silent
				? console.log('yLogger pushed new Issue to Google Cloud Error Reporting!')
				: null;
		}
	} catch (err) {
		console.error(
			'yLogger >',
			JSON.stringify({
				err: err && err.stack ? err.stack : err,
				level,
				func,
				text,
				data,
			})
		);
	}
};

module.exports = yLogger;
