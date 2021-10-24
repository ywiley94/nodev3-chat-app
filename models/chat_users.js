var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var ChatUserSchema = new mongoose.Schema({
    name: {
        type: String,
        reuired: true,
    },
    email: {
        type: String,
        require: true,
    },
    password: {
        type: String,
    },
    created: {
        type: Date,
        required: true,
        default: Date.now,
    },
});

ChatUserSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
ChatUserSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};


module.exports = mongoose.model('User', ChatUserSchema);