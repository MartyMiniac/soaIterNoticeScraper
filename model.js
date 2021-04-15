const mongoose = require('mongoose');

const noticeSchema = mongoose.Schema({
    url: String,
    title: String,
    date: Date
})

const notice = mongoose.model('notice', noticeSchema);

module.exports = notice;