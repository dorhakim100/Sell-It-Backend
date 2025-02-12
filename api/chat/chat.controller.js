import { logger } from '../../services/logger.service.js'
import { chatService } from './chat.service.js'

export async function getChats(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      loggedInUser: req.query.loggedInUser || '',
      pageIdx: +req.query.pageIdx || 0,
      chatsIds: req.query.chatsIds || [],
    }

    const chats = await chatService.query(filterBy)
    res.json(chats)
  } catch (err) {
    logger.error('Failed to get chats', err)
    res.status(400).send({ err: 'Failed to get chats' })
  }
}
export async function getMaxPage(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      categories: req.query.categories || [],
      pageIdx: req.query.pageIdx || 0,
    }

    const max = await chatService.getMaxPage(filterBy)
    res.json(max)
  } catch (err) {
    logger.error('Failed to get chats', err)
    res.status(400).send({ err: 'Failed to get chats' })
  }
}

export async function getChatById(req, res) {
  try {
    const chatId = req.params.id
    const chat = await chatService.getById(chatId)
    res.json(chat)
  } catch (err) {
    logger.error('Failed to get chat', err)
    res.status(400).send({ err: 'Failed to get chat' })
  }
}

export async function addChat(req, res) {
  const { body: chat } = req
  const stringifyImages = chat.images
  const images = JSON.parse(stringifyImages)

  try {
    const addedChat = await chatService.add({ ...chat, images })
    res.json(addedChat)
  } catch (err) {
    logger.error('Failed to add chat', err)
    res.status(400).send({ err: 'Failed to add chat' })
  }
}

export async function updateChat(req, res) {
  const { loggedinUser, body: chat } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && chat.owner._id !== userId) {
    res.status(403).send('Not your chat...')
    return
  }

  try {
    const updatedChat = await chatService.update(chat)
    res.json(updatedChat)
  } catch (err) {
    logger.error('Failed to update chat', err)
    res.status(400).send({ err: 'Failed to update chat' })
  }
}

export async function removeChat(req, res) {
  try {
    const chatId = req.params.id
    const removedId = await chatService.remove(chatId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove chat', err)
    res.status(400).send({ err: 'Failed to remove chat' })
  }
}

export async function addChatMsg(req, res) {
  const { loggedinUser } = req

  try {
    const chatId = req.params.id
    const msg = {
      txt: req.body.txt,
      by: loggedinUser,
    }
    const savedMsg = await chatService.addChatMsg(chatId, msg)
    res.json(savedMsg)
  } catch (err) {
    logger.error('Failed to update chat', err)
    res.status(400).send({ err: 'Failed to update chat' })
  }
}

export async function removeChatMsg(req, res) {
  try {
    const chatId = req.params.id
    const { msgId } = req.params

    const removedId = await chatService.removeChatMsg(chatId, msgId)
    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove chat msg', err)
    res.status(400).send({ err: 'Failed to remove chat msg' })
  }
}
