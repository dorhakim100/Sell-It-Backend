import express from 'express'

import {
  requireAuth,
  requireAdmin,
} from '../../middlewares/requireAuth.middleware.js'

import {
  getUser,
  getUsers,
  deleteUser,
  updateUser,
  addExpoToken,
} from './user.controller.js'

const router = express.Router()

router.get('/', getUsers)
router.get('/:id', getUser)
router.put('/expoToken/:id', addExpoToken)
router.put('/:id', requireAuth, updateUser)
router.delete('/:id', requireAuth, requireAdmin, deleteUser)

export const userRoutes = router
