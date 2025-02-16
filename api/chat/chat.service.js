import { ObjectId } from 'mongodb'
import { Expo } from 'expo-server-sdk'

import { logger } from '../../services/logger.service.js'
import { makeId } from '../../services/util.service.js'
import { dbService } from '../../services/db.service.js'
import { asyncLocalStorage } from '../../services/als.service.js'

const PAGE_SIZE = 3

const expo = new Expo()

export const chatService = {
  remove,
  query,
  getMaxPage,
  checkIsChat,
  getById,
  add,
  update,
  addChatMsg,
  removeMessage,
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
      { $sort: { 'latestMessage.sentAt': -1 } },

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
                expoPushTokens: '$$user.expoPushTokens',
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

    const collection = await dbService.getCollection('chat')
    let chats = []

    const aggregationPipeline = [
      { $match: criteria }, // Match chats based on criteria

      // { $limit: limit }, // Pagination - limit the number of chats
    ]

    chats = await collection.aggregate(aggregationPipeline).toArray()
    const itemsLength = chats.length

    const max = Math.ceil(itemsLength / PAGE_SIZE)

    return max
  } catch (err) {
    logger.error('Cannot find chats', err)
    throw err
  }
}
async function checkIsChat(users = { from: '', to: '' }) {
  try {
    const criteria = {} // getting all chats

    const collection = await dbService.getCollection('chat')
    let chats = []

    const aggregationPipeline = [
      { $match: criteria }, // Match chats based on criteria
    ]

    chats = await collection.aggregate(aggregationPipeline).toArray()
    const chat = chats.find(
      (chat) => chat.users.includes(users.from) && chat.users.includes(users.to)
    )
    return chat ? chat : false
  } catch (err) {
    logger.error('Cannot find chats', err)
    throw err
  }
}

async function getById(chatId, userId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(chatId) }

    const aggregationPipeline = [
      { $match: criteria }, // Match chats based on criteria

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
          messages: {
            $map: {
              input: '$messages',
              as: 'messageId',
              in: { $toObjectId: '$$messageId' },
            },
          },
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
          localField: 'messages', // The converted latestMessage ObjectId
          foreignField: '_id', // The _id field in the message collection
          as: 'messageDetails', // Output array with the matching message document(s)
        },
      },
      {
        $project: {
          _id: 1,
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
                expoPushTokens: '$$user.expoPushTokens',
              },
            },
          },
          messageDetails: 1,
        },
      },
    ]

    const collection = await dbService.getCollection('chat')
    const chats = await collection.aggregate(aggregationPipeline).toArray()

    if (!chats || chats.length === 0) {
      return null // Return null if no item is found
    }

    const chat = await _modifyChatRead(chats[0], userId)

    return chat
  } catch (err) {
    logger.error(`while finding chat ${chatId}`, err)
    throw err
  }
}

async function _modifyChatRead(chat, userId) {
  try {
    chat.createdAt = chat._id.getTimestamp() // Add createdAt from _id timestamp

    // Extract all message IDs from the aggregated messageDetails
    const messageIds = chat.messageDetails.map((msg) => msg._id)

    if (messageIds.length > 0) {
      const messagesCollection = await dbService.getCollection('message')

      // For example, update only the most recent message:

      const modifiedMessages = await Promise.all(
        chat.messageDetails.map(async (message) => {
          if (message.to === userId) {
            await messagesCollection.updateOne(
              { _id: message._id },
              { $set: { isRead: true } }
            )
            message.isRead = true
          }
          return message
        })
      )

      chat.messageDetails = [...modifiedMessages]
    }

    // if (chat.latestMessage.to === userId) chat.latestMessage.isRead = true

    return chat
  } catch (err) {
    logger.error(`while finding chat ${chat._id}`, err)
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
async function removeMessage(messageId, chatId) {
  try {
    const criteria = {
      _id: ObjectId.createFromHexString(messageId),
    }
    const chatCriteria = {
      _id: ObjectId.createFromHexString(chatId),
    }

    const messageCollection = await dbService.getCollection('message')
    const messageRes = await messageCollection.deleteOne(criteria)

    const chatCollection = await dbService.getCollection('chat')
    const chatRes = await chatCollection.updateOne(chatCriteria, {
      $pull: { messages: messageId },
    })

    if (messageRes.deletedCount === 0) throw 'Not your item'
    return messageId
  } catch (err) {
    logger.error(`cannot remove item ${messageId}`, err)
    throw err
  }
}

async function add(users) {
  try {
    const chatToAdd = {
      users: [users.from, users.to],
      messages: [],
    }
    const collection = await dbService.getCollection('chat')
    const res = await collection.insertOne(chatToAdd)

    return res.insertedId.toString()
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

    const msgCollection = await dbService.getCollection('message')
    const result = await msgCollection.insertOne(msg)

    const newId = result.insertedId.toString() // This is an ObjectId

    const chatCollection = await dbService.getCollection('chat')

    await chatCollection.updateOne(criteria, { $push: { messages: newId } })

    const userCollection = await dbService.getCollection('user')
    const user = await userCollection.findOne({
      _id: ObjectId.createFromHexString(msg.to),
    })

    await sendNotification(user.expoPushTokens, msg.content)

    return msg
  } catch (err) {
    logger.error(`cannot add item msg ${chatId}`, err)
    throw err
  }
}

async function sendNotification(
  tokens = [],
  body = '',
  title = 'New Message',
  data = {}
) {
  const messages = tokens.map((token) => {
    return {
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }
  })

  let chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
      console.log('Notification tickets:', ticketChunk)
    } catch (error) {
      console.error('Error sending notifications:', error)
    }
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
