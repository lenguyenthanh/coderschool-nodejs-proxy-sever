const http = require('http')
const request = require('request')
const argv = require('yargs')
                .usage('Usage: node $0 [options]')
				.alias('h','host').describe('h', 'The host of the destination server.')
				.alias('p','port').describe('p', 'The port of the destination server.')
				.alias('u','url').describe('u', 'A single url that overrides the host and port.')
				.alias('f','logfile').describe('f', 'Specify a file path to redirect loggin to.')
				.alias('l','loglevel').describe('l', 'Specify the level of logger.')
				.help('h')
                .alias('h', 'help')
    			.example('node index.js -h=127.0.0.1 -p 8000')
				.argv

const fs = require('fs')
const winston = require('winston')

const DESTINATION_HEADER = 'x-destination-url'
const localhost = '127.0.0.1'
const scheme = 'http://'

const host = argv.host || localhost 
const port = argv.port || (host === localhost ? 8000 : 80)
const hostPortUrl = scheme + host + ':' + port
const destinationUrl = argv.url || hostPortUrl

winston.level = argv.loglevel || 'debug'
const logFile = argv.logfile
if(logFile) {
    winston.add(winston.transports.File, { filename: logFile })
    winston.remove(winston.transports.Console)
}

const echoServer = http.createServer((req, res) => {
    winston.debug('Echo Server\n')
    winston.debug('Request Headers: ' + JSON.stringify(req.headers) + '\n')
    for( let header in req.headers) {
        res.setHeader(header, req.headers[header])
    }
    req.pipe(res)
})

echoServer.listen(8000)
winston.info('Echo Server listening @ 127.0.0.1:8000\n')

const proxyServer = http.createServer((req, res) => {
    winston.debug('Proxy Server\n')

    let url = getDestinationUrl(req.headers[DESTINATION_HEADER])
    const options = {
        url: url + req.url
    }

    const outboundRequest = request(options) 

    req.pipe(request(options))
        .pipe(res)
})

const getDestinationUrl = (headerUrl) => {
    if(headerUrl) {
        return scheme + headerUrl
    } else {
        return destinationUrl
    }
}

proxyServer.listen(9000)
winston.info('Proxy Server listening @ 127.0.0.1:9000\n')
