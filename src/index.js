const path = require('path')
const http = require('http')
const express = require('express')
const app = express()
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const { addUser, getUser, removeUser, getUsersInRoom } = require('./utils/users')
const server = http.createServer(app)
const socketio = require('socket.io')

const io = socketio(server)
const port = process.env.PORT || 3000
const publicDir = path.join(__dirname, '../public')


app.use(express.static(publicDir))

//socket.emit - sends event to specific client
//io.emit - sends event to every client
//socket.broadcast.emit - sends event to every connected client (except for one sending event)
//socket.on - listening to client event
//io.to.emit - emits an event to everybody in specific room
//socket.broadcast.to.emit - similar to socket.broadcast.emit but only sends in specific room


io.on('connection', (socket) => {
    console.log('new websocket connect')
    
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if(error) {
           return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    

    socket.on('sendMessage', (input, callback) => {
        const user = getUser(socket.id) 

        io.to(user.room).emit('message', generateMessage(user.username, input))
        callback('Delievered')
    })

    socket.on('location', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?=${location.latitude},${location.longitude}`))
        callback('Location shared')
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        
        if(user) {
        io.to(user.room).emit('message', generateMessage( 'Admin',`${user.username} has left` ))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        }
    })

})

server.listen(port, () => {
    console.log('Server is running on port ' + port )
})