import http from 'http'
import path from 'path'
import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'

import { authRoutes } from './api/auth/auth.routes.js'
import { userRoutes } from './api/user/user.routes.js'
import { chatRoutes } from './api/chat/chat.routes.js'

import { itemRoutes } from './api/item/item.routes.js'
import { setupSocketAPI } from './services/socket.service.js'

import { setupAsyncLocalStorage } from './middlewares/setupAls.middleware.js'

const app = express()
const server = http.createServer(app)

// Express App Config
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve('public')))
} else {
  const corsOptions = {
    origin: [
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://localhost:5173',
      'http://localhost:8081', // ✅ React Native Metro Bundler
      'http://127.0.0.1:8081', // ✅ Alternate localhost for React Native
      'http://192.168.200.208:8081', // ✅ Alternate localhost for React Native
      'http://192.168.200.208:8082', // ✅ Alternate localhost for React Native
    ],
    credentials: true,
  }
  app.use(cors(corsOptions))
}

app.all('*', setupAsyncLocalStorage)

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/item', itemRoutes)
app.use('/api/chat', chatRoutes)

setupSocketAPI(server)

// Make every unhandled server-side-route match index.html
// so when requesting http://localhost:3030/unhandled-route...
// it will still serve the index.html file
// and allow vue/react-router to take it from there

app.get('/**', (req, res) => {
  res.sendFile(path.resolve('public/index.html'))
})

import { logger } from './services/logger.service.js'
const port = process.env.PORT || 3030

server.listen(port, () => {
  logger.info('Server is running on port: ' + port)
})
