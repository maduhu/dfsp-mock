const hapi = require('hapi')
const joi = require('joi')
/*eslint no-console:0 */
const server = new hapi.Server()
server.connection({ port: 8021 })

function directoryFailActionHandler (request, reply, source, error) {
  return reply({
    'jsonrpc': '2.0',
    'id': '',
    'error': {
      'type': 'parsingerror',
      'code': 400,
      'errorPrint': 'The request could not be read by our software.',
      'message': 'Parsing error'
    },
    'debug': {
      'cause': {
        'error': {
          'code': 400,
          'message': 'An application generated message related to the error',
          'errorPrint': 'This is the exception message from the top level exception',
          'type': 'parsingerror'
        }
      },
      'stackInfo': []
    }
  })
}

server.route([
  {
    path: '/directory/user/get',
    method: 'get',
    handler: (request, reply) => {
      return reply({
        'name': 'Chris Griffin',
        'account': 'http://receivingdfsp.com/griffin_12345',
        'currency': 'USD'
      })
    },
    config: {
      validate: {
        query: joi.object({
          uri: joi.string().valid('http://centraldirectory.com/griffin').required()
        }),
        failAction: (request, reply, source, error) => {
          return reply({
            'error': {
              'message': 'Account not found for userURI=' + request.query.uri
            }
          })
        }
      }
    }
  },
  {
    path: '/directory/user/get',
    method: 'post',
    handler: (request, reply) => {
      if (request.payload.params.userURI === 'number:fail') {
        return reply({
          'error': {
            'message': 'Account not found for userURI=' + request.payload.params.userURI
          }
        })
      }
      return reply({
        'jsonrpc': '2.0',
        'id': request.payload.id,
        'result': {
          'name': 'Chris Griffin',
          'account': 'http://receivingdfsp.com/' + request.payload.params.userURI.split(':').pop(),
          'currency': 'USD'
        }
      })
    },
    config: {
      validate: {
        payload: joi.object({
          'jsonrpc': joi.string().valid('2.0'),
          'id': joi.string().required(),
          'method': joi.string().required(),
          'params': joi.object({
            'userURI': joi.string().required()
          }).required()
        }),
        failAction: directoryFailActionHandler
      }
    }
  },
  {
    path: '/directory/user/add',
    method: 'post',
    handler: (request, reply) => {
      return reply({
        'jsonrpc': '2.0',
        'id': 'b207c574-4d6b-4a64-9740-b0cac7de7c54',
        'result': {
          'message': 'Updated ' + request.payload.users.length + ' entities based on request'
        }
      })
    },
    config: {
      validate: {
        payload: joi.object({
          'users': joi.array().items(
            joi.object({
              'uri': joi.string().required(),
              'name': joi.string().required(),
              'account': joi.string().required(),
              'currency': joi.string().required()
            })
          )
        }),
        failAction: directoryFailActionHandler
      }
    }
  },
  {
    path: '/spspclient/query',
    method: 'get',
    handler: (request, reply) => {
      var receiver = request.query.receiver.split('/').pop()
      if (receiver === 'fail') {
        return reply({
          'id': 'Error',
          'message': 'Error getting receiver details, receiver responded with: undefined getaddrinfo ENOTFOUND ' + receiver + ' ' + receiver + ':80',
          'debug': {}
        })
      }
      return reply({
        'currencyCode': 'USD',
        'imageUrl': 'http://mediaserver.com/demo/images/' + receiver + '-profile-pic.jpg',
        'currencySymbol': '$',
        'name': receiver + ' Taylor',
        'type': 'payee',
        'address': 'levelone.dfsp2.' + receiver
      })
    }
  },
  {
    path: '/spspclient/quoteSourceAmount',
    method: 'get',
    handler: (request, reply) => {
      var receiverUri = request.query.receiver
      var sourceAmount = request.query.sourceAmount
      var receiver = receiverUri.split('/').pop()

      if (!sourceAmount) {
        return reply({
          'id': 'BadRequest',
          'message': 'sourceAmount query string parameter is required'
        })
      }
      if (!receiverUri || !receiver) {
        return reply({
          'error': {
            'id': 'Bad request',
            'message': 'Failed to process request for interopID=2b39b6ab-8a9f-4a8d-9257-9ca2d73c2561: Required query parameter receiver not specified'
          },
          'debug': {}
        })
      }
      return reply({
        'destinationAmount': sourceAmount * 0.975
      })
    }
  },
  {
    path: '/spspclient/quoteDestinationAmount',
    method: 'get',
    handler: (request, reply) => {
      var receiverUri = request.query.receiver
      var destinationAmount = request.query.destinationAmount
      var receiver = receiverUri.split('/').pop()

      if (!destinationAmount) {
        return reply({
          'id': 'BadRequest',
          'message': 'destinationAmount query string parameter is required'
        })
      }
      if (!receiverUri || !receiver) {
        return reply({
          'error': {
            'id': 'Bad request',
            'message': 'Failed to process request for interopID=2b39b6ab-8a9f-4a8d-9257-9ca2d73c2561: Required query parameter receiver not specified'
          },
          'debug': {}
        })
      }
      return reply({
        'sourceAmount': destinationAmount * 1.025
      })
    }
  },
  {
    path: '/spspclient/setup',
    method: 'post',
    handler: (request, reply) => {
      var receiver = request.payload.receiver.split('/').pop()
      if (receiver === 'fail') {
        return reply({
          'id': 'Error',
          'message': 'Error getting receiver details, receiver responded with: 500 Internal Server Error',
          'debug': {}
        })
      }
      var date = new Date()
      return reply({
        'id': '9b5b6198-52ab-4c05-a875-72cf7448dc51',
        'receiver': request.payload.receiver,
        'sourceAmount': (request.payload.destinationAmount * 1.025).toString(),
        'destinationAmount': request.payload.destinationAmount,
        'address': 'levelone.dfsp2.' + receiver + '.9b5b6198-52ab-4c05-a875-72cf7448dc51',
        'memo': request.payload.memo,
        'expiresAt': date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDay() + 'T' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '.199Z',
        'condition': 'cc:0:3:qLvNojWtv8zQuhJ0XuTVJMl_OBUmFZFJumhvuDxSk44:32',
        'sourceAccount': request.payload.sourceAccount
      })
    },
    config: {
      validate: {
        payload: joi.object({
          'receiver': joi.string().required(),
          'sourceAccount': joi.string().required(),
          'destinationAmount': joi.string().required(),
          'memo': joi.string().allow(''),
          'sourceIdentifier': joi.string().required()
        }),
        failAction: directoryFailActionHandler
      }
    }
  },
  {
    path: '/spspclient/payments/{paymentId}',
    method: 'put',
    handler: (request, reply) => {
      var receiver = request.payload.receiver.split('/').pop()
      if (receiver === 'fail') {
        return reply({
          'id': 'Error',
          'message': 'Error getting receiver details, receiver responded with: 500 Internal Server Error',
          'debug': {}
        })
      }
      return reply({
        'id': request.payload.id,
        'address': request.payload.address,
        'destinationAmount': request.payload.destinationAmount,
        'sourceAmount': request.payload.sourceAmount,
        'sourceAccount': request.payload.sourceAccount,
        'expiresAt': request.payload.expiresAt,
        'additionalHeaders': 'asdf98zxcvlknannasdpfi09qwoijasdfk09xcv009as7zxcv',
        'condition': request.payload.condition,
        'fulfillment': 'cf:0:qUAo3BNo49adBtbYTab2L5jAWLpAhnrkNQamsMYjWvM',
        'status': 'executed'
      })
    },
    config: {
      validate: {
        payload: joi.object({
          'id': joi.string().required(),
          'receiver': joi.string().required(),
          'sourceAmount': joi.string().required(),
          'destinationAmount': joi.string().required(),
          'address': joi.string().required(),
          'memo': joi.string().allow(''),
          'expiresAt': joi.string().required(),
          'condition': joi.string().required(),
          'sourceAccount': joi.string().required()
        }),
        failAction: directoryFailActionHandler
      }
    }
  }
])

server.start((err) => {
  if (err) {
    throw err
  }
})

module.exports = Promise.resolve({
 stop: function() {
   server.stop()
   return Promise.resolve()
 }
})
