const express = require('express')
const app = express()

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))

const { MongoClient } = require('mongodb')

let db;
const url = 'mongodb+srv://admin:green1234@cluster0.oypy2of.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
new MongoClient(url).connect().then((client) => {
    console.log('DB연결 성공')
    app.listen(8080, () => {
        console.log('http://localhost:8080 에서 서버 실행중');
    })
    db = client.db('forum')
}).catch(err => {
    console.log(err)
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.get('/news', (req, res) => {
    db.collection('post').insertOne({title: 'something'})
    res.send('sunny')
})

app.get('/shop', (req, res) => {
    res.send('shopping page')
})

app.get('/about', (req, res) => {
    res.sendFile(__dirname + '/test.html')
})

app.get('/list', async (req, res) => {
    let result = await db.collection('post').find().toArray()
    console.log(result)
    res.render('list.ejs', {posts : result})
})

app.get('/time', (req, res) => {
    res.render('time.ejs', { time: new Date()})
})

app.get('/write', (req, res) => {
    res.render('write.ejs');
})

app.post('/add', async (req, res) => {
    console.log(req.body);

    let title = req.body.title;
    let content = req.body.content;

    let result = await db.collection('post').insertOne(req.body);
    db.close;
    console.log(result);
})