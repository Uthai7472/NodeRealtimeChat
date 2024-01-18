require('dotenv').config();

const express = require('express');
const socketio = require('socket.io');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
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
    // console.log(`Username : ${username} Password : ${password}`);
    // const connection = await pool.getConnection();
    // const[user_rows] = await connection.query('SELECT * FROM users');
    // user_rows.forEach((user_row) => {
    //     console.log(`Username : ${user_row.username} Password : ${user_row.password}`);
    // });

    try {
        const connection = await pool.getConnection();
        const[user_rows] = await connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        connection.release();

        if (user_rows.length > 0) {
            console.log('Login successed');
            res.cookie('isAuthenticated', true); // Set the isAuthenticated cookie
            if (username === 'Ou') {
                thisUser = 'Ousmart';
            }
            else if (username === 'Milin') {
                thisUser = 'Milin Noi';
            }
            else {
                thisUser = username;
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

app.get('/logout', (req, res) => {
    res.clearCookie('isAuthenticated'); // Clear the isAuthenticated cookie
    res.redirect('/');
});


// Home page
app.get('/home', isAuthenticated, (req, res) => {
    io.on('connect', socket => {
        console.log('A user connected: ' + thisUser);
    });

    res.render('home', {thisUser: thisUser});
});


// Register page
app.get('/register', (req, res) => {
    res.render('register');
});

// Home page 1
app.get('/homepage1', isAuthenticated, (req, res) => {
    res.render('webpage1');
});