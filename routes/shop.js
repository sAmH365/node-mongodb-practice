const router = require('express').Router()

let connectDB = require('./../database.js')

let db;
connectDB.then((client) => {
    console.log('DB연결성공')
    db = client.db('forum')
}).catch(err => {
    console.log(err)
})

router.get('/shirts', (req, res) => {
    res.send('shirts page')
})

router.get('/pants', (req, res) => {
    res.send('pants page')
})

module.exports = router