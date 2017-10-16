const path = require('path')
const fs = require('fs')
const util = require('util')
const http = require('http')
const url = require('url')
const EventEmitter = require('events')
const log = require('debug')('DHT11')

const readFile = util.promisify(fs.readFile)

function readDHT11Value() {
	return Promise.all([
		readFile('/sys/bus/iio/devices/iio\:device0/in_temp_input', 'utf8'),
		readFile('/sys/bus/iio/devices/iio\:device0/in_humidityrelative_input', 'utf8')
	])
}

class DHT11Driver extends EventEmitter {
	constructor() {
		super()
		this.isReading = false
	}

	_read() {
		this.isReading = true
		readDHT11Value().then(results => {
			let temp = parseInt(results[0])
			let hum = parseInt(results[1])
			if (isNaN(temp)) {
				temp = 0
			} else {
				temp = Math.floor(temp / 1000)
			}
			if (isNaN(hum)) {
				hum = 0
			} else {
				hum = Math.floor(hum / 1000)
			}
			const result = {
				temp: temp,
				hum: hum
			}
			log('读取成功：%j', result)
			this.emit('success', result)
			this.removeAllListeners('error')
		}).catch(err => {
			log('读取失败：%s\n%O', err.message, err)
			this.emit('error', err)
			this.removeAllListeners('success')
		})
	}

	getData() {
		return new Promise((resolve, reject) => {
			this.once('success', resolve)
			this.once('error', reject)
			if (!this.isReading) {
				log('开始读取')
				this._read()
			} else {
				log('合并读取操作')
			}
		})
	}
}

const driver = new DHT11Driver()

module.exports = (host, port) => {
	const server = http.createServer((req, res) => {
		const reqUrl = url.parse(req.url)
		if (reqUrl.pathname === '/http') {
			driver.getData().then(data => {
				res.writeHead(200, { 'Content-Type': 'text/json' })
				res.write(JSON.stringify(data))
				res.end()
			}).catch(() => {
				res.writeHead(500, { 'Content-Type': 'text/text' })
				res.end('Server error')
			})
		}
		else {
			res.writeHead(404, { 'Content-Type': 'text/text' })
			res.end('Not found')
		}
	})

	server.listen(port, host, () => {
		console.log(`> DHT11 driver is listening http://${host}:${port}`)
	})
}
