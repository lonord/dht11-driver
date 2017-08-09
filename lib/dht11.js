const ffi = require('ffi')
const ref = require('ref')
const path = require('path')
const http = require('http')
const url = require('url')
const EventEmitter = require('events')
const log = require('debug')('DHT11')

const intPtr = ref.refType('int')

const RTLD_NOW = ffi.DynamicLibrary.FLAGS.RTLD_NOW
const RTLD_GLOBAL = ffi.DynamicLibrary.FLAGS.RTLD_GLOBAL
const mode = RTLD_NOW | RTLD_GLOBAL
const libwiringPi = ffi.DynamicLibrary('/usr/local/lib/libwiringPi' + ffi.LIB_EXT, mode)

const DHT11 = ffi.Library(path.join(__dirname, '../native/dht11'), {
	'setup': ['int', []],
	'readValue': ['int', [intPtr, intPtr]]
}, libwiringPi)

const tempPtr = ref.alloc('int')
const humPtr = ref.alloc('int')

class DHT11Driver extends EventEmitter {
	constructor() {
		super()
		this.isReading = false
		DHT11.setup()
	}

	_read() {
		this.isReading = true
		const ret = DHT11.readValue.async(tempPtr, humPtr, (err, res) => {
			this.isReading = false
			if (err) {
				log('读取失败：%s\n%O', err.message, err)
				this.emit('error', err)
				this.removeAllListeners('success')
				return
			}
			const result = {
				temp: tempPtr.deref(),
				hum: humPtr.deref()
			}
			log('读取成功：%j', result)
			this.emit('success', result)
			this.removeAllListeners('error')
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
