// import { authService } from './auth.service.js'
// import { logger } from '../../services/logger.service.js'

// export async function login(req, res) {
// 	const { username, password } = req.body
// 	try {
// 		const user = await authService.login(username, password)
// 		const loginToken = authService.getLoginToken(user)

// 		logger.info('User login: ', user)

// 		res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
// 		res.json(user)
// 	} catch (err) {
// 		logger.error('Failed to Login ' + err)
// 		res.status(401).send({ err: 'Failed to Login' })
// 	}
// }

// export async function signup(req, res) {
// 	try {
// 		const credentials = req.body

// 		// Never log passwords
// 		// logger.debug(credentials)

//         const account = await authService.signup(credentials)
// 		logger.debug(`auth.route - new account created: ` + JSON.stringify(account))

//         const user = await authService.login(credentials.username, credentials.password)
// 		logger.info('User signup:', user)

//         const loginToken = authService.getLoginToken(user)
// 		res.cookie('loginToken', loginToken, { sameSite: 'None', secure: true })
// 		res.json(user)
// 	} catch (err) {
// 		logger.error('Failed to signup ' + err)
// 		res.status(400).send({ err: 'Failed to signup' })
// 	}
// }

// export async function logout(req, res) {
// 	try {
// 		res.clearCookie('loginToken')
// 		res.send({ msg: 'Logged out successfully' })
// 	} catch (err) {
// 		res.status(400).send({ err: 'Failed to logout' })
// 	}
// }

import { authService } from './auth.service.js'
import { logger } from '../../services/logger.service.js'

export async function login(req, res) {
  const { username, password } = req.body
  try {
    const { token } = await authService.login(username, password)
    logger.info('User login successful')

    const isMobile = req.headers['user-agent']?.includes('ReactNative')

    if (isMobile) {
      return res.json({ token }) // Mobile: Send token in response
    } else {
      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 1000 * 60 * 60 * 2, // 2 hours
      })
      return res.json({ token }) // Web: Still send token in response
    }
  } catch (err) {
    logger.error('Failed to Login ' + err)
    res.status(401).send({ err: 'Failed to Login' })
  }
}

export async function signup(req, res) {
  try {
    const credentials = req.body
    const { token } = await authService.signup(credentials)
    logger.info('User signup successful')

    const isMobile = req.headers['user-agent']?.includes('ReactNative')

    if (isMobile) {
      return res.json({ token })
    } else {
      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 1000 * 60 * 60 * 2,
      })
      return res.json({ token })
    }
  } catch (err) {
    logger.error('Failed to signup ' + err)
    res.status(400).send({ err: 'Failed to signup' })
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
    })
    res.send({ msg: 'Logged out successfully' })
  } catch (err) {
    logger.error('Failed to logout', err)
    res.status(400).send({ err: 'Failed to logout' })
  }
}
