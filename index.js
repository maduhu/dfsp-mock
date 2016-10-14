const hapi = require('hapi')
const joi = require('joi')

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
    method: 'post',
    handler: (request, reply) => {
      if (request.payload.params.userURI !== 'http://centraldirectory.com/griffin') {
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
          'account': 'http://receivingdfsp.com/griffin_12345',
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
  }
])

server.start((err) => {
  if (err) {
    throw err
  }
})
