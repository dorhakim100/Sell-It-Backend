import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { userService } from '../user/user.service.js'
import { logger } from '../../services/logger.service.js'

const SECRET = process.env.JWT_SECRET || 'Secret-Puk-1234'

export const authService = {
  signup,
  login,
  getLoginToken,
  validateToken,
}

async function login(username, password) {
  try {
    logger.debug(`auth.service - login with username: ${username}`)

    const user = await userService.getByUsername({
      username,
      phone: username,
      email: username,
    })
    if (!user) return Promise.reject('Invalid username or password')

    const match = await bcrypt.compare(password, user.password)
    if (!match) return Promise.reject('Invalid username or password')

    delete user.password
    user._id = user._id.toString()

    return {
      user,
      token: getLoginToken(user),
    }
  } catch (err) {
    console.log(err)
    throw err
  }
}

async function signup({ username, password, fullname, email, phone, isAdmin }) {
  try {
    const saltRounds = 10

    logger.debug(
      `auth.service - signup with username: ${username}, fullname: ${fullname}`
    )
    if (!username || !password || !fullname)
      return Promise.reject('Missing required signup information')

    const userExist = await userService.getByUsername({
      username,
      email,
      phone,
    })
    if (userExist) return Promise.reject('Username already taken')

    const hash = await bcrypt.hash(password, saltRounds)
    const newUser = await userService.add({
      username,
      password: hash,
      fullname,
      email,
      phone,
      isAdmin,
    })

    return {
      user: newUser,
      token: getLoginToken(newUser),
    }
  } catch (err) {
    console.log(err)
    throw err
  }
}

function getLoginToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
      email: user.email,
      phone: user.phone,
    },
    SECRET,
    { expiresIn: '2h' } // Token expires in 2 hours
  )
}

function validateToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch (err) {
    console.log('Invalid login token')
    return null
  }
}
