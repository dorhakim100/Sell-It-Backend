import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getChats,
  getMaxPage,
  getChatById,
  addChat,
  updateChat,
  removeChat,
  //   addItemMsg,
  //   removeItemMsg,
} from './chat.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getChats)
router.get('/maxPage', log, getMaxPage)
router.get('/:id', log, getChatById)
router.post('/', log, addChat)
router.put('/:id', requireAuth, updateChat)
router.delete('/:id', requireAuth, removeChat)
// router.delete('/:id', requireAuth, requireAdmin, removeChat)

// router.post('/:id/msg', requireAuth, addItemMsg)
// router.delete('/:id/msg/:msgId', requireAuth, removeItemMsg)

export const chatRoutes = router
