
class CodeError extends Error {
  constructor(number, message) {
    super(message);
    this.code = number;
  }
}

CodeError.GetDataError = new CodeError(10201, 'Get Data Failed');
CodeError.SetDataError = new CodeError(10202, 'Set Data Failed');

module.exports = CodeError;
