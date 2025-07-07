module.exports = {
  '/alfresco2': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyRes: function(proxyRes, req, res) {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    },
    onProxyReq: function(proxyReq, req, res) {
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
          'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
      }
    }
  },
  '/alfresco': {
    target: 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/api': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    timeout: 60000,
    onProxyRes: function(proxyRes, req, res) {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    },
    onProxyReq: function(proxyReq, req, res) {
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
          'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
      }
    }
  },
  '/auth': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    onProxyRes: function(proxyRes, req, res) {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
    },
    onProxyReq: function(proxyReq, req, res) {
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
          'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
      }
    }
  },
  '/najeh': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/upload': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/my-projects': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/validate-gitlab-url': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/project-details': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/notifications': {
    target: 'http://localhost:8082',
    secure: false, 
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/users': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/roles': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/projects': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    pathRewrite: {
      '^/projects': '/api/projects'
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  },
  '/documents': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    buffer: true,
    pathRewrite: {
      '^/documents': '/api/documents'
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  },
  '/api/documents': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    buffer: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  },
  '/gitlab': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  },
  '/api/gitlab': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  },
  '/add-member': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  }
};
