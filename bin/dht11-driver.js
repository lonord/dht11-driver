#!/usr/bin/env node

const program = require('commander')
const package = require('../package.json')
const createServer = require('../lib/dht11')

program
	.version(package.version)
	.option('-h, --host <value>', 'Host for listen, default 127.0.0.1')
	.option('-p, --port <n>', 'Port for listen, default 13000')
	.parse(process.argv)

const host = program.host || '127.0.0.1'
let port = parseInt(program.port)
if (isNaN(port)) {
	port = 13000
}

createServer(host, port)
