const Router = require("express")
const User = require("../models/User")
const bcrypt = require("bcryptjs")
const config = require("config")
const jwt = require("jsonwebtoken")
const { check, validationResult } = require("express-validator")
const router = new Router()
const authMiddleware = require("../middleware/auth.middleware")
const fileService = require("../services/fileService")
const File = require("../models/File")

router.post("/registration",
    [
        check("email", "Uncorrect email").isEmail(),
        check("username", "Uncorrect username").isString(),
        check("password", "Password must be longer than 3 and shorter than 12").isLength({ min: 3, max: 12 }),
    ],
    async (req, res) => {
        try {
            console.log(req.body)
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: "Uncorrect request", errors })
            }

            const { email, username, password, retypePassword } = req.body

            const candidateEmail = await User.findOne({ email })

            const candidateUsername = await User.findOne({ username })


            if (candidateEmail) {
                return res.status(400).json({ message: `User with email ${email} already exist` })
            }
            if (candidateUsername) {
                return res.status(400).json({ message: `User with username ${username} already exist` })
            }
            const hashPassword = await bcrypt.hash(password, 8)
            const hashRetypePassword = await bcrypt.hash(retypePassword, 8)

            if (password === retypePassword) {
                const user = new User({ email, username, password: hashPassword, password: hashRetypePassword })
                await user.save()
                await fileService.createDir(req, new File({ user: user.id, name: "" }))
                return res.json({ message: "User was created" })
            } else {
                return res.status(400).json({ message: "Passwords do not match" })
            }


        } catch (e) {
            console.log(e)
            res.send({ message: "Server Error!" })
        }
    })

router.post("/login",
    async (req, res) => {
        try {
            const { email, password } = req.body
            const user = await User.findOne({ email })
            // const userU = await User.findOne({ username })

            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }

            const isPassValid = bcrypt.compareSync(password, user.password)
            if (!isPassValid) {
                return res.status(400).json({ message: "Invalid password" })
            }
            const token = jwt.sign({ id: user.id }, config.get("secretKey"), { expiresIn: "1h" })
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({ message: "Server Error!" })
        }
    })

router.get("/auth", authMiddleware,
    async (req, res) => {
        try {
            const user = await User.findOne({ _id: req.user.id })
            const token = jwt.sign({ id: user.id }, config.get("secretKey"), { expiresIn: "1h" })
            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    diskSpace: user.diskSpace,
                    usedSpace: user.usedSpace,
                    avatar: user.avatar
                }
            })
        } catch (e) {
            console.log(e)
            res.send({ message: "Server Error!" })
        }
    })

module.exports = router