const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const shortid = require('shortid');
const ROOM = require('./room.js');
const PrivateRoom = require('./private_room.js');
const auth = require('./auth').auth;
const User = require('./user.js').User;
const Token = require('./user.js').Token;

let user = [];
let token = [];

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/login.html');
});
app.get('/chat', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

const allRoomObj = {};
const roomList = {};
const allPrivateRoom = {};

const createRoom = (clientId, roomName) => {
    // check if both params are passed into
    if (typeof clientId === 'undefined' || typeof roomName === 'undefined') {
        throw new Error('Error: params are not passed into the function');
    } else {
        let roomId = shortid.generate();
        let newRoom = new ROOM(roomId, roomName, clientId);
        allRoomObj[roomId] = newRoom;
        roomList[roomId] = roomName;
        return roomId;
    }
}

const deleteRoom = (clientID, roomID) => {
    if (typeof clientID === 'undefined' || typeof roomID === 'undefined') {
        throw new Error('Error: params are not passed into the function');
    } else if (allRoomObj[roomID] === undefined) {
        throw new Error('Error: Room does not exist !!');
    } else {
        // only allows the room's creator
        let roomCreator = allRoomObj[roomID].creator;
        if (clientID !== roomCreator) {
            throw new Error("Error: Only the room's creator is allowed to delete it !!");
        } else {
            delete allRoomObj[roomID];
            delete roomList[roomID];
        }
    }
}

const joinRoom = (clientID, roomID) => {
    if (typeof clientID === 'undefined' || typeof roomID === 'undefined') {
        throw new Error('Error: params are not passed into the function');
    } else if (allRoomObj[roomID] === undefined) {
        throw new Error('Error: Room does not exist !!');
    } else {
        let room = allRoomObj[roomID];
        room.addClient(clientID);
    }
}


const leaveRoom = (clientID, roomID) => {
    if (typeof clientID === 'undefined' || typeof roomID === 'undefined') {
        throw new Error('Error: params are not passed into the function');
    } else if (allRoomObj[roomID] === undefined) {
        throw new Error('Error: Room does not exist !!');
    } else {
        let room = allRoomObj[roomID];
        room.removeClient(clientID);
    }
}

const changeRoomName = (clientID, roomID, newRoomName) => {
    if (typeof clientID === 'undefined' || typeof roomID === 'undefined' || typeof newRoomName === 'undefined') {
        throw new Error('Error: params are not passed into the function');
    } else if (allRoomObj[roomID] === undefined) {
        throw new Error('Error: Room does not exist !!');
    } else {
        let room = allRoomObj[roomID];
        let roomCreator = allRoomObj[roomID].creator;
        if (clientID !== roomCreator) {
            throw new Error("Error: Only the room's creator is allowed to change room name !!");
        } else {
            room.changeName(newRoomName);
            roomList[roomID] = newRoomName;
        }
    }
}

const createPrivateRoom = (senderId, receiverId, senderName, receiverName) => {
    if (typeof senderId === 'undefined' || typeof receiverId === 'undefined' || typeof senderName === 'undefined' || typeof receiverName === 'undefined') {
        throw new Error('Error: params are not passed into the function');
    } else {
        let newPrivateRoom = new PrivateRoom(senderId, receiverId, senderName, receiverName);
        newPrivateRoom.addClient(receiverId);
        let roomId = newPrivateRoom.id;
        console.log(roomId);
        allPrivateRoom[roomId] = newPrivateRoom;
        return roomId;
    }
}

const main = io.on('connection', (socket) => {

    socket.on('send clientId', (id) => {
        socket.join('main')
        let clientId = id;
        let connectClient = user.find(ele => ele.id === clientId);
        connectClient.socketId = socket.id;
        socket.username = connectClient.username;
        io.to(socket.id).emit('reconnect', connectClient, roomList);
        io.sockets.emit('user connect', connectClient, roomList, user);
    });

    auth(socket, user, token);
    socket.on('send private', (senderId, receiverId) => {
        let sender = user.find(ele => ele.id === senderId);
        let receiver = user.find(ele => ele.id === receiverId);
        let senderFriend = sender.friend;
        if (senderFriend.hasOwnProperty(receiverId)) {
            let roomId = senderFriend[receiverId];
            let roomName = allPrivateRoom[roomId].name;
            socket.emit('create private chat', roomId, roomName, sender.username, receiver.username);
        } else {
            let newRoomId = createPrivateRoom(senderId, receiverId, sender.username, receiver.username);
            console.log('newRoomId: ' + newRoomId);
            let newRoomName = allPrivateRoom[newRoomId].name;
            sender.friend[receiverId] = newRoomId;
            receiver.friend[senderId] = newRoomId;
            socket.emit('create private chat', newRoomId, newRoomName, sender.username, receiver.username);
        }
    })
    socket.on('private message', (data) => {
        let sender = user.find(ele => ele.socketId === socket.id);
        let senderId = sender.id;
        let receiverId = data.roomId.split('--').find(ele => ele !== senderId);
        let receiverSocketId = user.find(ele => ele.id === receiverId).socketId;
        let roomName = allPrivateRoom[data.roomId].name;
        socket.broadcast.to(receiverSocketId).emit('private message', {
            roomId: data.roomId,
            roomName: roomName,
            username: sender.username,
            message: data.message
        })
    })

    socket.on('create room', (roomName, clientId) => {
        try {
            let newRoomId = createRoom(clientId, roomName);
            let client = user.find(ele => ele.id === clientId);
            client.room.push(newRoomId);
            socket.emit('new room', {
                clientName: socket.username,
                newRoomId: newRoomId,
                newRoomName: roomList[newRoomId]
            });
            io.sockets.emit('update room', roomList);
            socket.join(newRoomId)
            console.log(socket.room);
            console.log(io.sockets.adapter.rooms[newRoomId]);
        } catch (err) {
            console.log(err);
            socket.emit('create room error', socket.username, err);
        }
    });

    socket.on('join room', (clientId, roomId) => {
        let alreadyInRoom = allRoomObj[roomId].client.some(ele => ele === clientId);
        if (!alreadyInRoom) {
            joinRoom(clientId, roomId);
            let client = user.find(ele => ele.id === clientId);
            client.room.push(roomId);
            socket.join(roomId)
            socket.emit('join room', {
                clientName: socket.username,
                roomId: roomId,
                roomName: roomList[roomId]
            });
        } else {
            socket.emit('join room error', "You are already in the room!");
        }
    });

    socket.on('leave room', (clientId, roomId) => {
        let alreadyInRoom = allRoomObj[roomId].client.some(ele => ele === clientId);
        if (alreadyInRoom) {
            leaveRoom(clientId, roomId);
            let client = user.find(ele => ele.id === clientId);
            let roomIndex = client.room.indexOf(roomId);
            client.room.splice(roomIndex, 1);
            socket.leave(roomId)
            socket.emit('leave room', {
                clientName: socket.username,
                roomId: roomId,
                roomName: roomList[roomId]
            });
        } else {
            socket.emit('leave room error', "You are not in the room!");
        }

    });

    socket.on('delete room', (clientId, roomId) => {
        let roomName = roomList[roomId];
        try {
            deleteRoom(clientId, roomId);
            let client = user.find(ele => ele.id === clientId);
            let roomIndex = client.room.indexOf(roomId);
            client.room.splice(roomIndex, 1);
            io.in(roomId).clients(function (error, clients) {
                if (clients.length > 0) {
                    console.log('clients in the room: ');
                    console.log(clients);
                    clients.forEach(function (socket_id) {
                        io.sockets.sockets[socket_id].leave(roomId);
                    });
                }
            });
            io.sockets.emit('delete room', roomId, roomName, roomList);
        } catch (err) {
            console.log(err);
            socket.emit('delete room error', err.message);
        }
    })

    socket.on('chat message', (data) => {
        socket.broadcast.to(data.roomId).emit('chat message', {
            roomId: data.roomId,
            username: socket.username,
            message: data.message
        });
    });
})

http.listen(3000, () => {
    console.log('listening on *:3000');
});