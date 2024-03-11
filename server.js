const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')

app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))


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

    try {
        if (title === '') {
            res.send('제목은 필수입니다.')
        } else {
            let result = await db.collection('post').insertOne({
                title: title,
                content: content
            });
            res.redirect('/write');

            console.log(result);
        }
    } catch (e) {
        console.log(e);
        res.status(500).send('서버에러남');
    }
});

app.get('/detail/:id', async (req, res, next) => {
    try {
        let result = await db.collection('post').findOne({ _id : new ObjectId(req.params.id)});
        console.log(result);
        res.render('detail.ejs', {result: result})
    } catch (e) {
        console.log(e)
        res.status(400).send('이상한 url')
    }
});

app.get('/edit/:id', async (req, res, next) => {
    try {
        let result = await db.collection('post').findOne({ _id : new ObjectId(req.params.id)});
        console.log(result);
        res.render('edit.ejs', {result: result})
    } catch (e) {
        console.log(e)
        res.status(400).send('이상한 url')
    }
});

app.put('/edit', async (req, res, next) => {
    // console.log(req.body.id)
    await db.collection('post').updateOne({ _id : new ObjectId(req.body.id)}, {
        $set: {title : req.body.title, content: req.body.content}
    })
    res.redirect('/list')
});

app.delete('/delete', async (req, res) => {
    console.log(req.query)
    await db.collection('post').deleteOne({_id: new ObjectId(req.query.docid)})
    res.send('삭제완료');
})