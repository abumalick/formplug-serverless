const fs = require('fs')
const path = require('path')

const Encrypter = require('./encryption/Encrypter')
const Email = require('./email/Email')
const Request = require('./request/Request')
const JsonResponse = require('./response/JsonResponse')
const HtmlResponse = require('./response/HtmlResponse')
const RedirectResponse = require('./response/RedirectResponse')
const PlainTextResponse = require('./response/PlainTextResponse')

const config = require('./utils/config')
const logging = require('./utils/logging')

module.exports.handle = async (event, context, callback) => {
  const encrypter = new Encrypter(config.getValue('ENCRYPTION_KEY'))
  const request = new Request(event, encrypter)

  let response = null

  try {
    await request.validate()

    const recipientCount = [].concat(
      request.recipients.cc,
      request.recipients.bcc,
      request.recipients.replyTo).length

    logging.info(`sending to '${request.recipients.to}' and ${recipientCount} other recipients`)

    const email = new Email(
      config.getValue('SENDER'),
      config.getValue('SENDER_ARN'),
      config.getValueWithDefault('MSG_SUBJECT', 'You have a form submission'))

    email.build(request.recipients, request.userParameters).send()

    const message = config.getValueWithDefault(
      'MSG_RECEIVE_SUCCESS',
      'Form submission successfully made')

    if (request.responseFormat === 'json') {
      response = new JsonResponse(200, message)
    } else if (request.redirectUrl) {
      response = new RedirectResponse(302, message, request.redirectUrl)
    } else {
      try {
        response = new HtmlResponse(200, message, htmlTemplate())
      } catch (error) {
        response = new PlainTextResponse(500, message)
      }
    }
  } catch (error) {
    logging.error('error was caught while executing receive lambda', error)

    let statusCode = 500
    let message = 'An unexpected error occurred'

    if (error instanceof HttpError) {
      statusCode = error.statusCode
      message = error.message
    }

    if (request.responseFormat === 'json') {
      response = new JsonResponse(statusCode, message)
    } else {
      try {
        response = new HtmlResponse(statusCode, message, htmlTemplate())
      } catch (error) {
        response = new PlainTextResponse(statusCode, message)
      }
    }
  }

  logging.info(`returning http ${response.statusCode} response`)

  callback(null, response.build())
}

function htmlTemplate () {
  return fs.readFileSync(
    path.resolve(
      __dirname,
      'templates',
      config.getValueWithDefault('TEMPLATE', 'default.html'))).toString()
}
