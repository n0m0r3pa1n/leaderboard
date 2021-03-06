'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createUser = createUser;
exports.findUserById = findUserById;

var _user = require('../models/user');

var _user2 = _interopRequireDefault(_user);

var _authentication = require('./authentication');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createUser(name, email) {
    return _user2.default.findOneOrCreate({ email: email }, { name, email }).then(function (user) {
        user = user.toObject();
        user.token = (0, _authentication.generateToken)(user._id);

        return user;
    });
}

function findUserById(id) {
    return _user2.default.findOne({ _id: id });
}