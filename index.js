const hapi = require('hapi')
const joi = require('joi')
const server = new hapi.Server()
const request = require('request')
const ILP = require('ilp')
const Packet = require('ilp-packet')
const config = require('rc')('ut_dfsp_api_dev', {
  cluster: 'dfsp1-test'
})
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
    path: '/resources',
    method: 'get',
    handler: (request, reply) => {
      return reply(
        [
          {
            name: 'DFSP1',
            spspUrl: 'http://localhost:8010',
            shortName: 'dfsp1-test',
            default: true
          },
          {
            name: 'DFSP2',
            spspUrl: 'http://localhost:8010',
            shortName: 'dfsp2-test',
            default: false
          }
        ]
      )
    },
    config: {
      validate: {
        query: joi.object().keys({
          identifier: joi.string().required()
        }),
        failAction: (request, reply, source, error) => {
          return reply({
            'error': {
              'message': 'Bad request'
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
          'currency': 'USD',
          // Should be implemented by modusBox to return the DFSP address too
          'dfsp': 'http://localhost:8010'
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
    path: '/resources',
    method: 'post',
    handler: (request, reply) => {
      let dfsp = request.payload.identifier.split('-')[0]
      return reply({
        name: "localhost DFSP",
        spspUrl: 'http://localhost:8010',
        shortName: dfsp || 'dfsp1-test',
        default: true
      })
    },
    config: {
      validate: {
        payload: joi.object().keys({
          identifier: joi.string().required()
        }),
        failAction: directoryFailActionHandler
      }
    }
  },
  {
    path: '/resources',
    method: 'put',
    handler: (request, reply) => {
      let dfsp = request.payload.dfsp
      return reply([
          {
            name: 'DFSP1',
            spspUrl: 'http://localhost:8010',
            shortName: 'dfsp1-test',
            default: dfsp == 'dfsp1-test'
          },
          {
            name: 'DFSP2',
            spspUrl: 'http://localhost:8010',
            shortName: 'dfsp2-test',
            default: dfsp == 'dfsp2-test'
          }
        ])
    },
    config: {
      validate: {
        payload: joi.object().keys({
          identifier: joi.string().required(),
          default: joi.bool().required(),
          dfsp: joi.string().required()
        }),
        failAction: directoryFailActionHandler
      }
    }
  },
  {
    path: '/spspclient/query',
    method: 'get',
    handler: (req, reply) => {
      var receiver = req.query.receiver.split('/').pop()
      if (receiver === 'fail') {
        return reply({
          'id': 'Error',
          'message': 'Error getting receiver details, receiver responded with: undefined getaddrinfo ENOTFOUND ' + receiver + ' ' + receiver + ':80',
          'debug': {}
        })
      }
      request({
        url: req.query.receiver,
        method: 'GET',
        json: true,
        headers: {
          Authorization: 'Basic ' + new Buffer(config.cluster + ':' + config.cluster).toString('base64')
        }
      }, function (error, message, response) {
        if (error) {
          return reply({
            'error': {
              'message': error
            }
          })
        }
        return reply(response)
      })

      // return reply({
      //   'currencyCode': 'USD',
      //   'imageUrl': 'http://mediaserver.com/demo/images/' + receiver + '-profile-pic.jpg',
      //   'currencySymbol': '$',
      //   'name': receiver,
      //   'type': 'payee',
      //   'address': 'levelone.dfsp2.' + receiver,
      //   'amount': '13',
      //   'firstName': 'First Name',
      //   'lastName': 'Last Name',
      //   'merchantIdentifier': 'mock_123456789',
      //   'account': 'http://localhost:8014/accounts/' + receiver
      // })
    }
  },
  {
    path: '/spspclient/quoteSourceAmount',
    method: 'get',
    handler: (request, reply) => {
      var identifier = request.query.identifier
      var identifierType = request.query.identifierType
      var sourceAmount = request.query.sourceAmount

      if (!sourceAmount) {
        return reply({
          'id': 'BadRequest',
          'message': 'sourceAmount query string parameter is required'
        })
      }
      if (!identifierType) {
        return reply({
          'id': 'BadRequest',
          'message': 'identifierType query string parameter is required'
        })
      }
      if (!identifier) {
        return reply({
          'error': {
            'id': 'Bad request',
            'message': 'Failed to process request for interopID=2b39b6ab-8a9f-4a8d-9257-9ca2d73c2561: Required query parameter identifier not specified'
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
      var identifier = request.query.identifier
      var identifierType = request.query.identifierType
      var destinationAmount = request.query.destinationAmount

      if (!destinationAmount) {
        return reply({
          'id': 'BadRequest',
          'message': 'destinationAmount query string parameter is required'
        })
      }
      if (!identifierType) {
        return reply({
          'id': 'BadRequest',
          'message': 'identifierType query string parameter is required'
        })
      }
      if (!identifier) {
        return reply({
          'error': {
            'id': 'Bad request',
            'message': 'Failed to process request for interopID=2b39b6ab-8a9f-4a8d-9257-9ca2d73c2561: Required query parameter identifier not specified'
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
    path: '/spspclient/payments/{paymentId}',
    method: 'put',
    handler: (req, reply) => {
      var receiver = req.payload.receiver.split('/').pop()
      if (receiver === 'fail') {
        return reply({
          'id': 'Error',
          'message': 'Error getting receiver details, receiver responded with: 500 Internal Server Error',
          'debug': {}
        })
      }

      request({
        url: req.payload.receiver,
        method: 'GET',
        json: true,
        headers: {
          Authorization: 'Basic ' + new Buffer(config.cluster + ':' + config.cluster).toString('base64')
        }
      }, function (error, message, response) {
        if (error) {
          return reply({
            'error': {
              'message': error
            }
          })
        }
        request({
          url: 'http://localhost:8014/ledger/transfers/' + req.params.paymentId,
          method: 'PUT',
          json: {
            'id': 'http://localhost:8014/ledger/transfers/' + req.params.paymentId,
            'ledger': 'http://localhost:8014/ledger',
            'debits': [
              {
                'account': req.payload.sourceAccount,
                'amount': Number(req.payload.destinationAmount),
                'memo': {},
                'authorized': true
              }
            ],
            'credits': [
              {
                'account': response.account,
                'memo': {
                  ilp: Packet.serializeIlpPayment({
                    account: req.payload.receiver,
                    amount: req.payload.destinationAmount,
                    data: ILP.PSK.createDetails({
                      publicHeaders: { 'Payment-Id': req.params.paymentId },
                      headers: {
                        'Content-Length': JSON.stringify(req.payload.memo).length,
                        'Content-Type': 'application/json',
                        'Sender-Identifier': req.payload.sourceIdentifier
                      },
                      disableEncryption: true,
                      data: Buffer.from(JSON.stringify(req.payload.memo))
                    })
                  }).toString('base64')
                },
                'amount': Number(req.payload.destinationAmount)
              }
            ],
            'execution_condition': 'ni:///sha-256;47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU?fpt=preimage-sha-256&cost=0',
            'cancellation_condition': null,
            'expires_at': new Date()
          }
        }, function (error, message, response) {
          if (error) {
            return reply({
              'error': {
                'message': error
              }
            })
          }
          request({
            url: 'http://localhost:8014/ledger/transfers/' + req.params.paymentId + '/fulfillment',
            method: 'PUT',
            body: 'oAKAAA',
            headers: { 'Content-type': 'text/plain' }
          }, function (error, message, response) {
            if (error) {
              return reply({
                'error': {
                  'message': error
                }
              })
            }
            return reply({
              'id': req.params.paymentId,
              'address': req.payload.address,
              'destinationAmount': req.payload.destinationAmount,
              'sourceAmount': req.payload.sourceAmount,
              'sourceAccount': req.payload.sourceAccount,
              'expiresAt': req.payload.expiresAt,
              'additionalHeaders': 'asdf98zxcvlknannasdpfi09qwoijasdfk09xcv009as7zxcv',
              'condition': req.payload.condition,
              'fulfillment': 'oCKAINnWMdlw8Vpvz8jMBdIOguJls1lMo6kBT6ERSrh11MDK',
              'status': 'executed'
            })
          })
        })
      })
    },
    config: {
      validate: {
        payload: joi.object({
          'receiver': joi.string().required(),
          'sourceAccount': joi.string().required(),
          'sourceAmount': joi.string().required(),
          'destinationAmount': joi.string().required(),
          'memo': joi.string().allow(''),
          'sourceIdentifier': joi.string().required()
        }),
        failAction: directoryFailActionHandler
      }
    }
  },
  {
    path: '/spspclient/invoices',
    method: 'post',
    handler: (req, reply) => {
      request({
        url: 'http://localhost:8010/invoices',
        method: 'post',
        headers: {
          Authorization: 'Basic ' + new Buffer(config.cluster + ':' + config.cluster).toString('base64')
        },
        json: {
          invoiceUrl: 'http://localhost:8010/receivers/invoices/' + req.payload.invoiceId,
          memo: req.payload.memo,
          senderIdentifier: req.payload.senderIdentifier
        }
      }, function (error, message, response) {
        if (error) {
          return reply({
            'error': {
              'message': error
            }
          })
        }
        reply(response)
      })
    },
    config: {
      validate: {
        payload: joi.object({
          'invoiceId': joi.string().required(),
          'memo': joi.string().required(),
          'submissionUrl': joi.string().required(),
          'senderIdentifier': joi.string().required()
        })
      }
    }
  }
])

module.exports = new Promise(function(resolve, reject) {
  server.start((err) => {
    if (err) {
      reject(err)
    } else {
      resolve(true)
    }
  })
})
.then(() => {
  return {
    stop: function () {
      return Promise.resolve(server.stop())
    }
  }
})

