const router = require("express").Router();
const userController = require("../controllers/userCtrl");
const auth = require("../middleware/auth");
router.post("/register", userController.register);
router.get("/refresh_token", userController.refreshtoken);
router.post("/login", userController.login);
router.get("/logout", userController.logout);
router.get("/getuser", auth, userController.getuser);
module.exports = router;
