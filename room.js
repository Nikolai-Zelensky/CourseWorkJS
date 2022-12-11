

function Room(id, name, creatorID) {
    this.id = id;
    this.name = name;
    this.creator = creatorID;
    this.client = [];
    this.quantity = 0;
};

Room.prototype.addClient = function (clientID) {
    this.client.push(clientID);
    this.quantity ++;
};

Room.prototype.removeClient = function (clientID) {
    let clientIndex = -1;
    for (let i = 0; i < this.client.length; i++) {
        if (this.client[i].id === clientID) {
            clientIndex = i;
            break;
        }
    }
    this.client.splice(clientIndex, 1);
    this.quantity --;
};

class ROOM {
    constructor (id, name, creatorID) {
        this.id = id;
        this.name = name;
        this.creator = creatorID;
        this.client = [creatorID];
        this.quantity = 1;
    }
    //
    addClient (clientID) {
        this.client.push(clientID);
        this.quantity ++;
    }

    removeClient (clientID) {
        let clientIndex = -1;
        for (let i = 0; i < this.client.length; i++) {
            if (this.client[i] === clientID) {
                clientIndex = i;
                break;
            }
        }
        this.client.splice(clientIndex, 1);
        this.quantity --;
    }

    changeName (newRoomName) {
        this.name = newRoomName;
    }
}

module.exports = ROOM; 