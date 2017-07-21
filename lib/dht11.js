const ffi = require('ffi')
const ref = require('ref')
const path = require('path')
const http = require('http')
const url = require('url')

const intPtr = ref.refType('int')

const RTLD_NOW = ffi.DynamicLibrary.FLAGS.RTLD_NOW
const RTLD_GLOBAL = ffi.DynamicLibrary.FLAGS.RTLD_GLOBAL
const mode = RTLD_NOW | RTLD_GLOBAL
const libwiringPi = ffi.DynamicLibrary('/usr/local/lib/libwiringPi' + ffi.LIB_EXT, mode)

const DHT11 = ffi.Library(path.join(__dirname, '../native/dht11'), {
	'readValue': ['int', [intPtr, intPtr]]
}, libwiringPi)

function getData() {
	return new Promise((resolve, reject) => {
		const tempPtr = ref.alloc('int')
		const humPtr = ref.alloc('int')
		const ret = DHT11.readValue.async(tempPtr, humPtr, (err, res) => {
			if (err) {
				reject(err)
				return
			}
			const temp = tempPtr.deref()
			const hum = humPtr.deref()
			resolve({
				temp: temp,
				hum: hum
			})
		})
	})
}

module.exports = (host, port) => {
	const server = http.createServer((req, res) => {
		const reqUrl = url.parse(req.url)
		if (reqUrl.pathname === '/http') {
			getData().then(data => {
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