# Sell-It Backend 🚀

Welcome to the Sell-It backend! This Express.js server powers the Sell-It mobile app built with React Native. It features a modular design that leverages multiple databases (collections) — specifically for **item**, **user**, **chat**, and **message** — to ensure efficient data storage and retrieval through aggregation.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Front End](#front-end)
- [Database Structure](#database-structure)
- [Routes & Middleware](#routes--middleware)
- [Installation](#installation)
- [Usage](#usage)

## Features ✨

- **Express.js Backend:** Fast, scalable, and robust.
- **React Native Integration:** Seamlessly connects with the Sell-It mobile app.
- **Modular Databases:** Separate collections for items, users, chats, and messages.
- **Data Aggregation:** Each collection stores only its core data while referencing additional information as needed.
- **Custom Middleware:** Different routes utilize specific middleware functions for authentication, authorization, and data validation.

## Tech Stack 🛠️

- **Server:** Node.js, Express.js
- **Database:** MongoDB (with collections: `item`, `user`, `chat`, `message`)
- **Frontend:** React Native

## Front End

Check out the Sell-It front-end built with React Native [here](https://github.com/dorhakim100/Sell-It-Front).

## Database Structure

The backend utilizes a modular approach with the following collections:

- **Item Collection:** Stores details of items listed for sale.
- **User Collection:** Contains user profiles and authentication data.
- **Chat Collection:** Manages conversation sessions between users.
- **Message Collection:** Holds individual messages exchanged in chats.

Data aggregation is implemented to ensure each collection only holds its own data and points to related extra data when needed.

## Routes & Middleware

Different API routes are safeguarded and customized through various middleware functions:

- **Authentication Middleware:** Verifies user tokens and session data.
- **Authorization Middleware:** Controls access based on user roles (e.g., admin, seller, buyer).
- **Validation Middleware:** Checks and sanitizes incoming data for consistency and security.

## Installation

Follow these steps to set up your Sell-It backend locally:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/sell-it-backend.git
   cd sell-it-backend
   ```
