import { dbService } from '../../services/db.service.js'
import { logger } from '../../services/logger.service.js'
import { ObjectId } from 'mongodb'
import jwt from 'jsonwebtoken'

export const userService = {
  add, // Create (Signup)
  getById, // Read (Profile page)
  update, // Update (Edit profile)
  remove, // Delete (remove user)
  query, // List (of users)
  getByUsername, // Used for Login
  addExpoToken,
}

const SECRET = process.env.JWT_SECRET || 'Secret-Puk-1234'

async function query(filterBy = {}) {
  const criteria = _buildCriteria(filterBy)
  try {
    const collection = await dbService.getCollection('user')
    var users = await collection.find(criteria).toArray()
    users = users.map((user) => {
      delete user.password
      user.createdAt = user._id.getTimestamp()
      // Returning fake fresh data
      // user.createdAt = Date.now() - (1000 * 60 * 60 * 24 * 3) // 3 days ago
      return user
    })
    return users
  } catch (err) {
    logger.error('cannot find users', err)
    throw err
  }
}

async function getById(userId) {
  try {
    var criteria = { _id: ObjectId.createFromHexString(userId) }

    const collection = await dbService.getCollection('user')
    const user = await collection.findOne(criteria)
    delete user.password

    return user
  } catch (err) {
    logger.error(`while finding user by id: ${userId}`, err)
    throw err
  }
}

async function getByUsername(data) {
  const { username, phone, email } = data
  try {
    const collection = await dbService.getCollection('user')
    const user = await collection.findOne({
      $or: [{ username }, { phone }, { email }],
    })
    return user
  } catch (err) {
    logger.error(`while finding user by username, phone, or email`, err)
    throw err
  }
}

async function remove(userId) {
  try {
    const criteria = { _id: ObjectId.createFromHexString(userId) }

    const collection = await dbService.getCollection('user')
    await collection.deleteOne(criteria)
  } catch (err) {
    logger.error(`cannot remove user ${userId}`, err)
    throw err
  }
}

async function update(user) {
  try {
    // peek only updatable properties
    const userToSave = {
      _id: ObjectId.createFromHexString(user._id), // needed for the returnd obj
      fullname: user.fullname,
      image: user.image,
      items: user.items,
      phone: user.phone,
      email: user.email,
      username: user.username,
      messages: user.messages,
    }
    const collection = await dbService.getCollection('user')
    await collection.updateOne({ _id: userToSave._id }, { $set: userToSave })
    const token = getLoginToken(userToSave)
    return token
  } catch (err) {
    logger.error(`cannot update user ${user._id}`, err)
    throw err
  }
}
async function addExpoToken(userId, token) {
  try {
    const collection = await dbService.getCollection('user')
    await collection.updateOne(
      { _id: ObjectId.createFromHexString(userId) },
      { $addToSet: { expoPushTokens: token } } // Adds token to array if not already present
    )
    return token
  } catch (err) {
    logger.error(`cannot update user ${user._id}`, err)
    throw err
  }
}

async function add(user) {
  try {
    // peek only updatable fields!
    const userToAdd = {
      username: user.username,
      password: user.password,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
      email: user.email,
      phone: user.phone,
      items: user.items,
      image: user.image,
      messages: user.messages,
    }
    const collection = await dbService.getCollection('user')
    await collection.insertOne(userToAdd)
    return userToAdd
  } catch (err) {
    logger.error('cannot add user', err)
    throw err
  }
}

function _buildCriteria(filterBy) {
  const criteria = {}
  if (filterBy.txt) {
    const txtCriteria = { $regex: filterBy.txt, $options: 'i' }
    criteria.$or = [
      {
        username: txtCriteria,
      },
      {
        fullname: txtCriteria,
      },
    ]
  }
  if (filterBy.minBalance) {
    criteria.score = { $gte: filterBy.minBalance }
  }
  return criteria
}

function getLoginToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
      email: user.email,
      phone: user.phone,
      items: user.items,
      image: user.image,
      username: user.username,
      messages: user.messages,
    },
    SECRET,
    { expiresIn: '2h' } // Token expires in 2 hours
  )
}
