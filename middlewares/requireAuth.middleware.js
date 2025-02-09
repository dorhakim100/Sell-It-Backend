import { config } from '../config/index.js'
import { logger } from '../services/logger.service.js'
import { asyncLocalStorage } from '../services/als.service.js'
import { jwtDecode } from 'jwt-decode'

export async function requireAuth(req, res, next) {
  try {
    // Get the token from the Authorization header or cookie

    const authorizationHeader = req.headers['authorization']

    if (!authorizationHeader) {
      return res.status(401).send('Authorization header missing')
    }

    const token = authorizationHeader.split(' ')[1]

    // Decode and verify the token
    const decoded = jwtDecode(token)

    if (config.isGuestMode && !decoded) {
      req.loggedinUser = { _id: '', fullname: 'Guest' }
      return next()
    }

    if (!decoded) {
      return res.status(401).send('Not Authenticated')
    }

    req.loggedinUser = decoded
    next() // Continue to the next middleware
  } catch (error) {
    console.error('Error in requireAuth middleware', error)
    res.status(500).send('Server error')
  }
}

export function requireAdmin(req, res, next) {
  const { loggedinUser } = asyncLocalStorage.getStore()

  if (!loggedinUser) return res.status(401).send('Not Authenticated')
  if (!loggedinUser.isAdmin) {
    logger.warn(loggedinUser.fullname + 'attempted to perform admin action')
    res.status(403).end('Not Authorized')
    return
  }
  next()
}
