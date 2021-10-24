
const socket = io()

//Elements
const $messageForm = document.querySelector('#message-form')
const $inputId = document.querySelector('input')
const $button = document.querySelector('button')
const $sendLocation = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $locationMessage = document.querySelector('#location-message')



//Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options

const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscrool = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    //Visible height
    const visibleHeight = $messages.offsetHeight

    //Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrool
    const scroolOffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scroolOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

//Client listen for messages
socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm a')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscrool()
})

//Client listening for location
socket.on('locationMessage', (url) => {
    console.log(url)
    const html = Mustache.render(locationTemplate, {
        username: url.username,
        url: url.url,
        message: 'My current location',
        createdAt: moment(url.createdAt).format('h:mm a')
    })
    $locationMessage.insertAdjacentHTML("beforeend", html)
    autoscrool()
})

socket.on('roomData', ({ room, users }) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
})


$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $button.setAttribute('disabled', 'disabled')
    //disable form
    const input = $inputId.value

    socket.emit('sendMessage', input, (message) => {
        $button.removeAttribute('disabled')
        $inputId.value = ''
        $inputId.focus()
        
        if (!message) {
            throw new Error('Messgae wasnt deleved')
        } 
        console.log('Message was delivered')
        //enable
    })
})

$sendLocation.addEventListener('click', () => {
    
    if(!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser')
    }

    $sendLocation.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }
        //Emit message when leaving chat room
        socket.emit('location', location, (acknowledgment) => {
            $sendLocation.removeAttribute('disabled')
            console.log(acknowledgment)
        })

    })
})

socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/'
    }
})