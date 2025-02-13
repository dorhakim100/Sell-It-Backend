import { ObjectId } from 'mongodb'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

export const chatService = {
  remove,
  query,
  getMaxPage,
  getById,
  add,
  update,
  addChatMsg,
  removeChatMsg,
}

async function query(filterBy = { txt: '', pageIdx: 0 }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const { loggedInUser } = filterBy

    const collection = await dbService.getCollection('chat')
    let chats = []

    // Calculate skip and limit for pagination
    // const skip = filterBy.pageIdx * PAGE_SIZE
    const skip = filterBy.pageIdx * PAGE_SIZE
    const limit = PAGE_SIZE

    // Aggregation pipeline for chats
    const aggregationPipeline = [
      { $match: criteria }, // Match chats based on criteria
      { $skip: skip }, // Pagination - skip
      { $limit: limit }, // Pagination - limit the number of chats
      {
        $addFields: {
          // Add a new field "latestMessage" that's the last element of the messages array.
          latestMessage: { $arrayElemAt: ['$messages', -1] },
        },
      },
      {
        $addFields: {
          // Convert each user id in the users array from a string to an ObjectId.
          users: {
            $map: {
              input: '$users',
              as: 'userId',
              in: { $toObjectId: '$$userId' },
            },
          },
          // Convert latestMessage from string to ObjectId.
          latestMessage: { $toObjectId: '$latestMessage' },
        },
      },
      {
        $lookup: {
          from: 'user', // The collection to join with for user details
          localField: 'users', // The converted array of ObjectIds from the chat document
          foreignField: '_id', // The _id field in the user collection
          as: 'userDetails', // Output array with the matching user documents
        },
      },
      {
        $lookup: {
          from: 'message', // The collection to join with for message details
          localField: 'latestMessage', // The converted latestMessage ObjectId
          foreignField: '_id', // The _id field in the message collection
          as: 'latestMessage', // Output array with the matching message document(s)
        },
      },
      {
        // Extract the first element of the latestMessage array
        $addFields: {
          latestMessage: { $arrayElemAt: ['$latestMessage', 0] },
        },
      },
      {
        $project: {
          _id: 1,
          messages: 1,
          latestMessage: 1,
          userDetails: {
            $map: {
              input: '$userDetails',
              as: 'user',
              in: {
                _id: '$$user._id',
                fullname: '$$user.fullname',
                username: '$$user.username',
                email: '$$user.email',
                image: '$$user.image',
                phone: '$$user.phone',
              },
            },
          },
        },
      },
    ]

    // Perform the aggregation on the 'item' collection
    chats = await collection.aggregate(aggregationPipeline).toArray()
    return chats
  } catch (err) {
    logger.error('Cannot find chats', err)
    throw err
  }
}

async function getMaxPage(filterBy = { txt: '', pageIdx: 0 }) {
  try {
    const criteria = _buildCriteria(filterBy)
    const sort = _buildSort(filterBy)

    const collection = await dbService.getCollection('item')
    let chats = []

    const aggregationPipeline = [
      { $match: criteria }, // Match chats based on criteria
      // { $sort: sort }, // Sort the chats
      { $skip: skip }, // Pagination - skip
      { $limit: limit }, // Pagination - limit the number of chats
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

    chats = await collection.aggregate(aggregationPipeline).toArray()
    const itemsLength = chats.length

    const max = Math.ceil(itemsLength / PAGE_SIZE)

    return chats
  } catch (err) {
    logger.error('Cannot find chats', err)
    throw err
  }
}

async function getById(chatId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(chatId) }

    const aggregationPipeline = [
      { $match: criteria }, // Match chats based on criteria
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
    const chats = await collection.aggregate(aggregationPipeline).toArray()

    if (!chats || chats.length === 0) {
      return null // Return null if no item is found
    }

    const chat = chats[0]
    chat.createdAt = item._id.getTimestamp() // Add createdAt from _id timestamp

    return chat
  } catch (err) {
    logger.error(`while finding chat ${chatId}`, err)
    throw err
  }
}

async function remove(chatId) {
  try {
    const criteria = {
      _id: ObjectId.createFromHexString(chatId),
    }

    const collection = await dbService.getCollection('chat')
    const res = await collection.deleteOne(criteria)

    if (res.deletedCount === 0) throw 'Not your item'
    return chatId
  } catch (err) {
    logger.error(`cannot remove item ${chatId}`, err)
    throw err
  }
}

async function add(chat) {
  try {
    const collection = await dbService.getCollection('chat')
    await collection.insertOne(chat)

    return chat
  } catch (err) {
    logger.error('cannot insert chat', err)
    throw err
  }
}

async function update(chat) {
  const itemToSave = { vendor: chat.vendor, speed: chat.speed }

  try {
    const criteria = { _id: ObjectId.createFromHexString(chat._id) }

    const collection = await dbService.getCollection('chat')
    await collection.updateOne(criteria, { $set: itemToSave })

    return chat
  } catch (err) {
    logger.error(`cannot update chat ${chat._id}`, err)
    throw err
  }
}

async function addChatMsg(chatId, msg) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(chatId) }
    msg.id = makeId()

    const collection = await dbService.getCollection('item')
    await collection.updateOne(criteria, { $push: { msgs: msg } })

    return msg
  } catch (err) {
    logger.error(`cannot add item msg ${chatId}`, err)
    throw err
  }
}

async function removeChatMsg(chatId, msgId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(chatId) }

    const collection = await dbService.getCollection('item')
    await collection.updateOne(criteria, { $pull: { msgs: { id: msgId } } })

    return msgId
  } catch (err) {
    logger.error(`cannot add item msg ${chatId}`, err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {
    // $or: [
    //   { label: { $regex: filterBy.txt, $options: 'i' } },
    //   { description: { $regex: filterBy.txt, $options: 'i' } },
    // ],
  }
  if (filterBy.loggedInUser) {
    criteria.users = { $in: [filterBy.loggedInUser] }
  }

  if (filterBy.chatsIds && filterBy.chatsIds.length > 0) {
    criteria._id = {
      $in: filterBy.chatsIds.map((id) => ObjectId.createFromHexString(id)),
    }
  }

  //   if (filterBy.soldBy) {
  //     criteria['sellingUser.id'] = { $eq: filterBy.soldBy }
  //   }

  return criteria
}

function _buildSort(filterBy) {
  // const sortField = filterBy.sortField || 'num'
  // const sortDir = filterBy.sortDir || 1
  // return { [sortField]: sortDir }
  return {}
}
