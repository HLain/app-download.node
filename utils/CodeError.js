
class CodeError extends Error {
  constructor(number, message) {
    super(message);

    this.code = number;
  }
}

CodeError.GET_DATA_ERROR = new CodeError(10201, 'Get Data Failed');
CodeError.SET_DATA_ERROR = new CodeError(10202, 'Set Data Failed');
CodeError.DATA_NOT_FOUND = new CodeError(10204, 'Data Not Found');

CodeError.BAD_PARAMETERS = new CodeError(11000, 'Parameter error');

module.exports = CodeError;
