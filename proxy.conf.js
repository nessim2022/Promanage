module.exports = {
  '/api': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    timeout: 60000,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }
  },
  '/auth': {
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
  '/alfresco': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
  },
  '/alfresco2': {
    target: 'http://localhost:8082',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug'
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
  }
};
