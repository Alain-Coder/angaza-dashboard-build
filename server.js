const { createServer } = require('http')
const { createServer: createHttpsServer } = require('https')
const fs = require('fs')
const { parse } = require('url')
const next = require('next')


const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = process.env.PORT || (dev ? 3001 : 80)
const httpsPort = process.env.HTTPS_PORT || 443
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// SSL Certificate configuration
let httpsOptions = null
if (process.env.SSL_KEY && process.env.SSL_CERT) {
  try {
    httpsOptions = {
      key: process.env.SSL_KEY,
      cert: process.env.SSL_CERT,
      ...(process.env.SSL_CA && { ca: process.env.SSL_CA })
    }
    console.log('SSL certificates loaded successfully from environment variables')
  } catch (error) {
    console.warn('Failed to load SSL certificates:', error.message)
    console.warn('Falling back to HTTP only')
  }
}
app.prepare().then(() => {
  const requestHandler = async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      const { pathname, query } = parsedUrl
      if (pathname === '/a') {
        await app.render(req, res, '/a', query)
      } else if (pathname === '/b') {
        await app.render(req, res, '/b', query)
      } else {
        await handle(req, res, parsedUrl)
      }
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }

  // Create HTTPS server if certificates are available
  if (httpsOptions) {
    createHttpsServer(httpsOptions, requestHandler)
      .once('error', (err) => {
        console.error('HTTPS Server error:', err)
        process.exit(1)
      })
      .listen(httpsPort, '0.0.0.0', () => {
        console.log(`> HTTPS Server ready on https://dashboard.angazafoundation.org:${httpsPort}`)
      })
    
    // Create HTTP server for redirects
    createServer((req, res) => {
      const redirectUrl = `https://dashboard.angazafoundation.org${httpsPort === 443 ? '' : `:${httpsPort}`}${req.url}`
      res.writeHead(301, { Location: redirectUrl })
      res.end()
    })
      .once('error', (err) => {
        console.error('HTTP Redirect server error:', err)
      })
      .listen(port, '0.0.0.0', () => {
        console.log(`> HTTP Redirect server ready on http://dashboard.angazafoundation.org:${port} -> HTTPS`)
      })
  } else {
    // Fallback to HTTP if no SSL certificates
    console.warn('No SSL certificates found, starting HTTP server only')
    console.warn('PayChangu integration may not work without HTTPS')
    
    createServer(requestHandler)
      .once('error', (err) => {
        console.error('HTTP Server error:', err)
        process.exit(1)
      })
      .listen(port, '0.0.0.0', () => {
        console.log(`> HTTP Server ready on http://dashboard.angazafoundation.org:${port}`)
      })
  }
})