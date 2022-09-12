var http = require('http');

var nStatic = require('node-static');

var fileServer = new nStatic.Server('./public');

http.createServer(function (req, res) {
    templates: {
        index: 'index.html'     // optional, defaults to 'index.html'
      }

    fileServer.serve(req, res);

}).listen(5555);
