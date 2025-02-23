import { logger } from '../../services/logger.service.js'
import { itemService } from './item.service.js'

export async function getItems(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      categories: req.query.categories || [],
      soldBy: req.query.soldBy || '',
      pageIdx: +req.query.pageIdx || 0,
      itemsIds: req.query.itemsIds || [],
    }

    const items = await itemService.query(filterBy)
    res.json(items)
  } catch (err) {
    logger.error('Failed to get items', err)
    res.status(400).send({ err: 'Failed to get items' })
  }
}
export async function getMaxPage(req, res) {
  try {
    const filterBy = {
      txt: req.query.txt || '',
      categories: req.query.categories || [],
      soldBy: req.query.soldBy || '',
      pageIdx: +req.query.pageIdx || 0,
      itemsIds: req.query.itemsIds || [],
    }

    const max = await itemService.getMaxPage(filterBy)
    res.json(max)
  } catch (err) {
    logger.error('Failed to get items', err)
    res.status(400).send({ err: 'Failed to get items' })
  }
}

export async function getItemById(req, res) {
  try {
    const itemId = req.params.id
    const item = await itemService.getById(itemId)
    res.json(item)
  } catch (err) {
    logger.error('Failed to get item', err)
    res.status(400).send({ err: 'Failed to get item' })
  }
}

export async function addItem(req, res) {
  const { body: item } = req
  const stringifyImages = item.images
  const images = JSON.parse(stringifyImages)

  try {
    const addedItem = await itemService.add({ ...item, images })
    res.json(addedItem)
  } catch (err) {
    logger.error('Failed to add item', err)
    res.status(400).send({ err: 'Failed to add item' })
  }
}

export async function updateItem(req, res) {
  const { loggedinUser, body: item } = req
  const { _id: userId, isAdmin } = loggedinUser

  if (!isAdmin && item.owner._id !== userId) {
    res.status(403).send('Not your item...')
    return
  }

  try {
    const updatedItem = await itemService.update(item)
    res.json(updatedItem)
  } catch (err) {
    logger.error('Failed to update item', err)
    res.status(400).send({ err: 'Failed to update item' })
  }
}

export async function removeItem(req, res) {
  try {
    const itemId = req.params.id
    const removedId = await itemService.remove(itemId)

    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove item', err)
    res.status(400).send({ err: 'Failed to remove item' })
  }
}

export async function addItemMsg(req, res) {
  const { loggedinUser } = req

  try {
    const itemId = req.params.id
    const msg = {
      txt: req.body.txt,
      by: loggedinUser,
    }
    const savedMsg = await itemService.addItemMsg(itemId, msg)
    res.json(savedMsg)
  } catch (err) {
    logger.error('Failed to update item', err)
    res.status(400).send({ err: 'Failed to update item' })
  }
}

export async function removeItemMsg(req, res) {
  try {
    const itemId = req.params.id
    const { msgId } = req.params

    const removedId = await itemService.removeItemMsg(itemId, msgId)
    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove item msg', err)
    res.status(400).send({ err: 'Failed to remove item msg' })
  }
}
