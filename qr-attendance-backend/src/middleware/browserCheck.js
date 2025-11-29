const { verifyBrowser } = require("../utils/security");

function browserCheck(req, res, next) {
  try {
    const result = verifyBrowser(req);

    if (!result.ok) {
      return res.status(400).json({
        error: "Tarayıcı veya işletim sistemi engellendi",
        details: result.reason
      });
    }

    next(); // tarayıcı uygunsa devam et
  } catch (err) {
    console.error("browserCheck error:", err);
    return res.status(500).json({
      error: "Sunucu hatası (browserCheck)."
    });
  }
}

module.exports = browserCheck;
