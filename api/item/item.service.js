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

    // Calculate skip and limit for pagination
    const skip = filterBy.pageIdx * PAGE_SIZE
    const limit = PAGE_SIZE

    // Aggregation pipeline for items
    const aggregationPipeline = [
      { $match: criteria }, // Match items based on criteria
      // { $sort: sort }, // Sort the items
      { $skip: skip }, // Pagination - skip
      { $limit: limit }, // Pagination - limit the number of items
      {
        $addFields: {
          // Convert sellingUser.id from string to ObjectId
          'sellingUser.id': { $toObjectId: '$sellingUser.id' },
        },
      },
      {
        $lookup: {
          from: 'user', // The collection to join with
          localField: 'sellingUser.id', // Field from the "item" collection
          foreignField: '_id', // Field in the "user" collection (it's an ObjectId)
          as: 'userDetails', // Name of the field where the matched data will be stored
        },
      },
      {
        $addFields: {
          // Extract the first element from the userDetails array
          userDetails: { $arrayElemAt: ['$userDetails', 0] },
        },
      },
    ]

    // Perform the aggregation on the 'item' collection
    items = await collection.aggregate(aggregationPipeline).toArray()
    console.log(items)
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

    const aggregationPipeline = [
      { $match: criteria }, // Match items based on criteria
      {
        $addFields: {
          // Convert sellingUser.id from string to ObjectId
          'sellingUser.id': { $toObjectId: '$sellingUser.id' },
        },
      },
      {
        $lookup: {
          from: 'user', // The collection to join with
          localField: 'sellingUser.id', // Field from the "item" collection
          foreignField: '_id', // Field in the "user" collection (it's an ObjectId)
          as: 'userDetails', // Name of the field where the matched data will be stored
        },
      },
      {
        $addFields: {
          // Extract the first element from the userDetails array
          userDetails: { $arrayElemAt: ['$userDetails', 0] },
        },
      },
    ]

    const collection = await dbService.getCollection('item')
    const items = await collection.aggregate(aggregationPipeline).toArray()

    if (!items || items.length === 0) {
      return null // Return null if no item is found
    }

    const item = items[0]
    item.createdAt = item._id.getTimestamp() // Add createdAt from _id timestamp

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
    console.log(item)
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

  if (filterBy.itemsIds && filterBy.itemsIds.length > 0) {
    criteria._id = {
      $in: filterBy.itemsIds.map((id) => ObjectId.createFromHexString(id)),
    }
  }

  if (filterBy.categories && filterBy.categories.length > 0) {
    criteria.categories = { $in: filterBy.categories }
  }

  if (filterBy.soldBy) {
    criteria['sellingUser.id'] = { $eq: filterBy.soldBy }
  }

  return criteria
}

function _buildSort(filterBy) {
  // const sortField = filterBy.sortField || 'num'
  // const sortDir = filterBy.sortDir || 1
  // return { [sortField]: sortDir }
  return {}
}
