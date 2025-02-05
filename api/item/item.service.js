import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const itemService = {
  remove,
  query,
  getMaxPage,
  getById,
  add,
  update,
  addItemMsg,
  removeItemMsg,
}

async function query(filterBy = { txt: '', pageIdx: 0 }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('item')
    let items = []

    // Calculate skip and limit
    const skip = filterBy.pageIdx * PAGE_SIZE
    const limit = PAGE_SIZE

    // Use aggregation for pagination
    let aggregationPipeline = [
      { $match: criteria }, // Match items based on your criteria
      { $sort: sort }, // Sort the items as per your sorting logic
      { $skip: skip }, // Skip items for pagination
      { $limit: limit }, // Limit the number of items per page
    ]

    items = await collection.aggregate(aggregationPipeline).toArray()

    // Log the fetched items
    return items
  } catch (err) {
    logger.error('Cannot find items', err)
    throw err
  }
}

async function getMaxPage(filterBy = { txt: '', pageIdx: 0 }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('item')
    let items = []

    items = await collection.aggregate(aggregationPipeline).toArray()
    const itemsLength = items.length

    const max = Math.ceil(itemsLength / PAGE_SIZE)

    return items
  } catch (err) {
    logger.error('Cannot find items', err)
    throw err
  }
}

async function getById(itemId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(itemId) }

    const collection = await dbService.getCollection('item')
    const item = await collection.findOne(criteria)

    item.createdAt = item._id.getTimestamp()
    return item
  } catch (err) {
    logger.error(`while finding item ${itemId}`, err)
    throw err
  }
}

async function remove(itemId) {
  const { loggedinUser } = asyncLocalStorage.getStore()
  const { _id: ownerId, isAdmin } = loggedinUser

  try {
    const criteria = {
      _id: ObjectId.createFromHexString(itemId),
    }
    if (!isAdmin) criteria['owner._id'] = ownerId

    const collection = await dbService.getCollection('item')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your item'
    return itemId
  } catch (err) {
    logger.error(`cannot remove item ${itemId}`, err)
    throw err
  }
}

async function add(item) {
  try {
    const collection = await dbService.getCollection('item')
    await collection.insertOne(item)

    return item
  } catch (err) {
    logger.error('cannot insert item', err)
    throw err
  }
}

async function update(item) {
  const itemToSave = { vendor: item.vendor, speed: item.speed }

  try {
    const criteria = { _id: ObjectId.createFromHexString(item._id) }

    const collection = await dbService.getCollection('item')
    await collection.updateOne(criteria, { $set: itemToSave })

    return item
  } catch (err) {
    logger.error(`cannot update item ${item._id}`, err)
    throw err
  }
}

async function addItemMsg(itemId, msg) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(itemId) }
    msg.id = makeId()

    const collection = await dbService.getCollection('item')
    await collection.updateOne(criteria, { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add item msg ${itemId}`, err)
    throw err
  }
}

async function removeItemMsg(itemId, msgId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(itemId) }

    const collection = await dbService.getCollection('item')
    await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot add item msg ${itemId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {
    $or: [
      { label: { $regex: filterBy.txt, $options: 'i' } },
      { description: { $regex: filterBy.txt, $options: 'i' } },
    ],
  }

  if (filterBy.categories.length > 0) {
    criteria.categories = { $in: filterBy.categories }
  }

  return criteria
}

function _buildSort(filterBy) {
  const sortField = filterBy.sortField || 'num'
  const sortDir = filterBy.sortDir || 1
  return { [sortField]: sortDir }
}
