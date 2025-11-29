// artık hiçbir şey yapmayan middleware
function browserCheck(req, res, next) {
  next(); // doğrudan bir sonraki middleware'e geç
}

module.exports = browserCheck;