import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getChats,
  getMaxPage,
  checkIsChat,
  getChatById,
  addChat,
  updateChat,
  removeChat,
  addChatMsg,
  deleteMessage,
  //   removeItemMsg,
} from './chat.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getChats)
router.get('/maxPage', log, getMaxPage)
router.get('/isChat', log, checkIsChat)
router.get('/:id', log, getChatById)
// router.get('/:id', log, requireAuth, getChatById)
router.post('/', log, addChat)
router.post('/:id/msg', requireAuth, addChatMsg)
router.put('/:id', requireAuth, updateChat)
router.delete('/message/:id', requireAuth, deleteMessage)
router.delete('/:id', requireAuth, removeChat)
// router.delete('/:id', requireAuth, requireAdmin, removeChat)

// router.delete('/:id/msg/:msgId', requireAuth, removeItemMsg)

export const chatRoutes = router
