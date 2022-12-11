
class PrivateRoom {
    constructor(senderId, receiverId, senderName, receiverName) {
        this.id = senderId + '--' + receiverId;
        this.name = senderName +' - ' + receiverName;
        this.client = [senderId];
        this.quantity = 1;
        this.limit = 2;
    }
    //
    addClient(clientID) {
        if (this.quantity < this.limit) { 
            this.client.push(clientID);
            this.quantity++;
        } else {
            throw new Error('You cannot join this room. This is a private room between two users.')
        }
    }
}

module.exports = PrivateRoom; 