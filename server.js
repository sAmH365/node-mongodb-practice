const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb')
const methodOverride = require('method-override')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const bcrypt = require('bcrypt')
const MongoStore = require('connect-mongo')

const { createServer } = require('http')
const { Server } = require('socket.io')
const server = createServer(app)
const io = new Server(server)

require('dotenv').config()

app.use(methodOverride('_method'))
app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(passport.initialize())
app.use(session({
    secret: '암호화에쓸 비번',
    resave : false,
    saveUninitialized: false,
    cookie: { maxAge : 60 * 60 * 1000 },
    store : MongoStore.create({
        mongoUrl : process.env.DB_URL,
        dbName : 'forum'
    })
}))
app.use(passport.session())

let connectDB = require('./database.js')

let db;
let changeStream;
connectDB.then((client) => {
    console.log('DB연결 성공')
    server.listen(process.env.PORT, () => {
        console.log('http://localhost:8080 에서 서버 실행중');
    })
    db = client.db('forum')

    let condition = [
        { $match: { operationType: 'insert' } }
    ]
    changeStream = db.collection('post').watch(condition)

}).catch(err => {
    console.log(err)
})

function checkLogin(req, res, next) {
    if (!res.user) {
        res.send('로그인하세요')
    }
    next()
}

// app.use(checkLogin) // 여기 밑에있는 모든 API는 checkLogin 미들웨어 적용됨

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
                content: content,
                user: req.user._id,
                username: req.user.username
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
    console.log(new ObjectId(req.query.docid))
    await db.collection('post').deleteOne({
        _id: new ObjectId(req.query.docid),
        user: new ObjectId(req.user._id)
    })
    res.send('삭제완료');
})

app.get('/URL', (req, res) => {
    res.send('hello');
})

app.get('/list/:page', async (req, res) => {
    console.log(req.params)
    let result = await db.collection('post').find()
        .skip((req.params.page - 1) * 5)
        .limit(5).toArray()
    res.render('list.ejs', {posts : result})
})

app.get('/list/next/:id', async (req, res) => {
    console.log(req.params.id)
    let result = await db.collection('post')
        .find({
            _id : {
                $gt : new ObjectId(req.params.id)
            }
        }).limit(5).toArray()
    res.render('list.ejs', {posts : result})
})

// passport.authenticate('local')() 쓰면 아래 함수 실행
passport.use(new LocalStrategy(async (usernameInput, passwordInput, cb) => {
    let result = await db.collection('user').findOne({username: usernameInput})
    if (!result) {
        return cb(null, false, {message : 'db에 아이디 없음'})
    }

    if (await bcrypt.compare(passwordInput, result.password)) {
        console.log("아이디ok + 비밀번호ok", result)
        return cb(null, result)
    } else {
        return cb(null, false, {message: '비번 불일치'})
    }
}))

passport.serializeUser((user, done) => {
    // console.log(user)
    process.nextTick(() => { // req.login() 쓰면 자동 실행됨
        done(null, {id : user._id, username: user.username})
    })
})

passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({_id : new ObjectId(user.id)})
    delete result.password
    process.nextTick(() => { // 유저가 보낸 쿠키 분석은 passport.deserializeUser()
        done(null, result)
    })
})

app.get('/login', (req, res) => {
    console.log(req.user)
    res.render('login.ejs')
})

app.post('/login', async (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
        console.log('실행')
        if (error) return res.status(500).json(error)
        if (!user) return res.status(401).json(info.message)

        req.logIn(user, (err) => {
            if (err) return next(err)
            res.redirect('/')
        })
    })(req, res, next)
})

app.get('/register', (req, res) => {
    res.render('register.ejs')
})

app.post('/register', async(req, res) => {

    let hash =  await bcrypt.hash(req.body.password, 10)
    console.log(hash)

    await db.collection('user').insertOne({
        username: req.body.username,
        password: hash
    })
    res.redirect('/')
})

app.use('/shop', require('./routes/shop.js'))

app.get('/search', async (req, res) => {
    let searchCondition = [
        {$search : {
            index : 'title_index',
            text : { query : req.query.val, path : 'title' }
        }},
        { $sort : {_id : 1} }
    ]

    let result = await db.collection('post')
        .aggregate(searchCondition).toArray()
    res.render('search.ejs', {posts: result})
})

app.get('/chat/request', async (req, res) => {
    await db.collection('chatroom').insertOne({
        member: [req.user._id , new ObjectId(req.query.writerId)],
        date: new Date()
    })
    res.redirect('/chat/list')
})

app.get('/chat/list', async (req, res) => {
    let result = await db.collection('chatroom').find({
        member : req.user._id
    }).toArray()
    res.render('chatList.ejs', {result : result})
})

app.get('/chat/detail/:id', async (req, res) => {
    let result = await db.collection('chatroom').findOne({_id : new ObjectId(req.params.id)})
    res.render('chatDetail.ejs', {result : result})
})

io.on('connection', (socket) => {
    console.log('some people websocket connection!')

    socket.on('age', data => {
        console.log('유저가 보낸거 : ', data)
        io.emit('name', 'kim')
    })

    socket.on('ask-join', data => {
        socket.join(data)
    })

    socket.on('message-send', data => {
        io.to(data.room).emit('message-broadcast', data.msg)
        console.log(data)
    })
})

app.get('/stream/list', (req, res) => {
    res.writeHead(200, {
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache"
    })

    changeStream.on('change', result => {
        console.log(result.fullDocument)
        res.write('event: msg\n')
        res.write(`data: ${JSON.stringify(result.fullDocument)}\n\n`)
    })

})
