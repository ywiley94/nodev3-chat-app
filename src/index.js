require('dotenv').config()
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
const mongoose = require('mongoose')
const session = require('express-session')
var passport = require('passport');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');

const User = require('../models/chat_users')
require('../config/passport')(passport); // pass passport for configuration



app.use(express.static(publicDir))

const PORT = process.env.PORT || 3000;

//Database connection; 
mongoose.connect(process.env.DB, { useUnifiedTopology: true, useNewUrlParser: true })
const db = mongoose.connection;
db.on('error', (error) => {
    console.log(error)
});
db.once('open', () => {
    console.log('Connected to database')
})



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

//middlewares
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(express.urlencoded({extended:false}));
app.use(express.json());
app.use(
    session({
    secret: 'My Secret key',
    saveUninitialized: true,
    resave: false,
})
);
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next()
});

app.set('view engine', 'ejs');

// Show login form
app.get('/', (req, res) => {
    res.render('login', {title: "Add Users"})
})
app.get('/login', (req, res) => {
    res.render('login.ejs', {title: "Add Users"})
})

// app.get('/signup', isLoggedIn, function(req, res) {
//     if (err) return console.log(err)
//     res.render('create')
// });

app.get('/create', function(req, res) {
    res.render('create')
});

app.get('/chat', function(req, res) {
    res.render('chat.html')
});

app.post('/signup', passport.authenticate('local-signup', {
    successRedirect : '/create', // redirect to the secure profile section
    failureRedirect : '/signup', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));

app.post('/login', passport.authenticate('local-login', {
    successRedirect : '/create', // redirect to the secure profile section
    failureRedirect : '/login', // redirect back to the signup page if there is an error
    failureFlash : true // allow flash messages
}));



// app.post('/login', (req, res) => {
//     console.log(req.body)
//     const chatUser = new User({
//         name: req.body.name,
//         email: req.body.email,
//         password: req.body.password,
//     });
//     // Saves user model to mongodb
//     chatUser.save((error) => {
//         if(error) {
//             console.log(error)
//         } else {
//             req.session.message = {
//                 type: "success",
//                 message: "User added successfully"
//             };
//             res.redirect('/');
//         }
//     })
// })

// SIGNUP =================================
        // show the signup form
        app.get('/signup', function(req, res) {
            res.render('signup.ejs', { message: req.flash('signupMessage') });
        });

        function isLoggedIn(req, res, next) {
            if (req.isAuthenticated())
                return next();
        
            res.redirect('/');
        }

      

app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT )
})