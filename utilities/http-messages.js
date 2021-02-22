let httpUtil = {}

httpUtil.error = (code, message) => {
    return {
      status: 'error',
      code: code,
      message: message
    }
}

httpUtil.success = (code, message, data) => {
  return {
    status: 'ok',
    code: code,
    message: message,
    data: data
  }
}

module.exports = httpUtil;