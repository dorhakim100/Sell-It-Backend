import express from 'express'

import { requireAuth } from '../../middlewares/requireAuth.middleware.js'
import { log } from '../../middlewares/logger.middleware.js'

import {
  getItems,
  getMaxPage,
  getItemById,
  addItem,
  updateItem,
  removeItem,
  addItemMsg,
  removeItemMsg,
} from './item.controller.js'

const router = express.Router()

// We can add a middleware for the entire router:
// router.use(requireAuth)

router.get('/', log, getItems)
router.get('/maxPage', log, getMaxPage)
router.get('/:id', log, getItemById)
router.post('/', log, addItem)
router.put('/:id', requireAuth, updateItem)
router.delete('/:id', requireAuth, removeItem)
// router.delete('/:id', requireAuth, requireAdmin, removeItem)

router.post('/:id/msg', requireAuth, addItemMsg)
router.delete('/:id/msg/:msgId', requireAuth, removeItemMsg)

export const itemRoutes = router
