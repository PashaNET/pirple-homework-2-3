
/**
 * Server 
 */

//Dependencies
const StringDecoder = require('string_decoder').StringDecoder,
      path = require('path'),
      url = require('url'),
      http = require('http'),
      https = require('https'),
      fs = require('fs'),
      config = require('./config'),
      routers = require('./routers'),
      helpers = require('./servises/helpers');

//Container for server methods
let server = {};

server.unifiedServer = (req, res) => {
    let buffer = '',
        parsedUrl = url.parse(req.url, true),
        requestedPathname = parsedUrl.pathname.replace(/^\/+|\/+$/g, ''),
        method = req.method.toLocaleLowerCase(),
        decoder = new StringDecoder('utf-8');

    req.on('data', (data) => {
      buffer += decoder.write(data);
    });
    
    req.on('end', () => {
      //get payloadData depending on method
      let payload = (['get', 'delete'].indexOf(method) > -1) ? parsedUrl.query : helpers.safeJsonParse(buffer);
      
      //define params for handler
      let data = {
        payload: payload,
        method: method,
        headers: req.headers
      };
      
      //choose controller from routers object
      const chosenHandler = typeof(routers[requestedPathname]) !== 'undefined' ? routers[requestedPathname] : routers['notFound'];
      
      //TODO add to each handler token verification
      //get token from header
      //need email - how to get email? global user object
      //TODO create authController and keep auth data there 
      
      chosenHandler(data, (statusCode, data) => {
        statusCode = typeof(statusCode) == 'number' ? statusCode : 200;//TODO create constants with codes
        data = typeof(data) == 'object' ? data : {};//TODO add method to helpers
        let responseData = JSON.stringify(data);
  
        res.setHeader('Content-type', 'application/json');
        res.writeHead(statusCode);
        res.end(responseData);
      });
    });
  }

  server.initHttpServer = () => {
    //Initialize http server
    server.httpServer = http.createServer((req, res) => {
      server.unifiedServer(req, res);
    });

    //Set http-server listen to port
    server.httpServer.listen(config.httpPort, () => {
      console.log('Server started on port ' + config.httpPort + ' with ' + config.envName + ' evn' );
    });
  }

  server.initHttpsServer = () => {
    //Define pathes to 'key' and 'cert' for https-server
    let httpsServerParams = {
      key : fs.readFileSync(path.join(__dirname, './../https/key.pem')),
      cert : fs.readFileSync(path.join(__dirname, './../https/cert.pem'))
    }

    //Initialize https server
    server.httpsServer = https.createServer(httpsServerParams, (req, res) => {
      server.unifiedServer(req, res);
    });

    //Set https-server listen to port
    server.httpsServer.listen(config.httpsPort, () => {
      console.log('Server started on port ' + config.httpsPort + ' with ' + config.envName + ' evn' );
    });
  }

  server.init = () => {
    server.initHttpServer();
    server.initHttpsServer();
  }

  module.exports = server;