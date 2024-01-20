require('dotenv').config();
const formattedFunc = require('./function');
const express = require('express');
const socketio = require('socket.io');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cookieParser = require('cookie-parser');
const moment = require('moment-timezone');

const port = 1707;

const app = express();
// Configure cookie-parser middleware
app.use(cookieParser());

let thisUser = '';

app.set("view engine", "ejs");
app.use(express.static('public'));

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const io = socketio(server);

const pool = mysql.createPool({
    host: process.env.MYSQL_HOSTNAME,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DB,  
});

const sessionMiddleware = session({
    secret: 'your-session-secret',
    resave: false,
    saveUninitialized: true,
  });
  
app.use(sessionMiddleware);

// Middleware to parse JSON data
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const isAuthenticated = (req, res, next) => {
    if (req.cookies.isAuthenticated) {
      // User is authenticated, proceed to the next middleware or route handler
      next();
    } else {
      // User is not authenticated, redirect to the login page
      res.redirect('/');
    }
};

// Login End point
app.post('/login', async (req, res) => {
    const { username, password } = req.body; // REF. variable by html form "name"

    try {
        const connection = await pool.getConnection();
        const[user_rows] = await connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        connection.release();

        if (user_rows.length > 0) {
            console.log('Login successed');
            res.cookie('isAuthenticated', true); // Set the isAuthenticated cookie
            if (username === 'Ou') {
                req.session.username = 'Ousmart';
                // thisUser = "Ousmart";
            }
            else if (username === 'Milin') {
                req.session.username = 'Milin Noi';
                // thisUser = "Milin Noi";
            }
            else {
                req.session.username = username;
                // thisUser = username;
            }
            res.redirect('/home');
        }
        else {
            console.log('Login failed');
            res.redirect('/');
        }
    }
    catch (error) {
        console.error('Error:', error);
        res.redirect('/login');
    }
});

// Login page
app.get('/', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tb_chatHistory (
            id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(255),
            message VARCHAR(1000),
            date DATE,
            time TIME)`);
        connection.release();
        const [user_rows] = await connection.query('SELECT * FROM users');
        connection.release();
        // res.render('index', { users: user_rows });

        user_rows.forEach((user_row) => {
            console.log(`Username: ${user_row.username} Password: ${user_row.password}`);
        });

        res.render('index');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Register End point
app.post('/registing', async (req, res) => {
    try {
        const { username, password } = req.body;

        const connection = await pool.getConnection();
        await connection.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
        connection.release();

        res.redirect('/');
    }
    catch (error) {
        console.error('Error : ', error);
        res.redirect('/register');
    } 
});

// Delete all message end point
app.all('/delete_all_msg', async (req, res) => {
    const connection = await pool.getConnection();
    await connection.query('DELETE FROM tb_chatHistory');
    connection.release();

    res.redirect('/home');
})

app.get('/logout', (req, res) => {
    res.clearCookie('isAuthenticated'); // Clear the isAuthenticated cookie

    
    res.redirect('/');
});


// Home page
app.get('/home', isAuthenticated, async (req, res) => {
    const curUser = req.session.username;

    const connection = await pool.getConnection();
    const [chat_rows] = await connection.query('SELECT * FROM tb_chatHistory');
    connection.release();

    

    res.render('home', {curUser: curUser, chat_rows: chat_rows});
});

io.on('connect', socket => {
    // console.log('A user connected: ' + curUser);

    socket.on('send_message', async (msg) => {
        const connection = await pool.getConnection();
        const thailandTime = moment().tz('Asia/Bangkok');
        const formattedDate = thailandTime.format('YYYY-MM-DD').split("T")[0]; // Format date as YYYY-MM-DD
        const formattedTime = thailandTime.format('HH:mm:ss'); // Format time as HH:mm:ss
    
        await connection.query(
            `INSERT INTO tb_chatHistory (username, message, date, time) VALUES (?, ?, ?, ?)`,
            [msg.username, msg.message, formattedDate, formattedTime]
        );
        connection.release();
        const [updatedChatRows] = await connection.query('SELECT * FROM tb_chatHistory');
        connection.release();

        io.emit('receive_message', updatedChatRows);
    });

    socket.on('confirm_read', (readPayload) => {
        socket.broadcast.emit('confirm_read', {readPayload: readPayload});
    })
});


// Register page
app.get('/register', (req, res) => {
    res.render('register');
});

// Home page 1
app.get('/homepage1', isAuthenticated, (req, res) => {
    res.render('webpage1');
});