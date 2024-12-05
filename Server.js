const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const session = require('express-session');
const app = express();

// Настройка body-parser для обработки JSON
app.use(bodyParser.json());

// Настройка сессий
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

const dbConfig = {
    host: 'localhost',
    user: 'root', 
    password: 'Roland11.', 
    database: 'divan' 
};


async function testConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Подключение к базе данных успешно установлено');
        await connection.end();
    } catch (err) {
        console.error('Ошибка подключения к базе данных:', err);
    }
}

testConnection();

// Роут для регистрации
app.post('/auth/register', async (req, res) => {
    const { Name, FirstName, patronymic, email, password } = req.body;

    console.log('Данные от клиента:', req.body); 

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Проверка на заполнение обязательных полей
        if (!Name || !FirstName || !email || !password) {
            return res.status(400).json({ message: 'Не все обязательные поля заполнены' });
        }

        // Проверка на корректность email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Некорректный email' });
        }

         
         

        const [rows, fields] = await connection.execute(
            'INSERT INTO Customers (UserName, FirstName, patronymic, email, userpassword) VALUES (?, ?, ?, ?, ?)',
            [Name, FirstName, patronymic || null, email, password]
        );

        console.log('Данные успешно вставлены:', rows); 

        res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (err) {
        console.error('Ошибка при вставке данных:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Роут для входа
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Проверка на корректность email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Некорректный email' });
        }

        const [rows, fields] = await connection.execute(
            'SELECT * FROM Customers WHERE email = ? AND userpassword = ?',
            [email, password]
        );

        if (rows.length > 0) {
            req.session.user = rows[0]; // Сохраняем информацию о пользователе в сессии
            res.status(200).json({ message: 'Успешный вход', user: rows[0] });
        } else {
            res.status(401).json({ message: 'Неверный email или пароль' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Роут для проверки статуса аутентификации
app.get('/auth/check', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ authenticated: true, user: req.session.user });
    } else {
        res.status(200).json({ authenticated: false });
    }
});

// Роут для получения списка заказов пользователя
app.get('/orders', async (req, res) => {
    const IdCustomers = req.session.user ? req.session.user.IdCustomers : null;

    if (!IdCustomers) {
        return res.status(401).json({ message: 'Пожалуйста, войдите в систему, чтобы просмотреть заказы' });
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        // Получение списка заказов пользователя
        const [rows] = await connection.execute(
            `SELECT Orders.IdOrders, Divan.NameDivan, Divan.Price, Orders.Status
             FROM Orders
             JOIN Divan ON Orders.IdDivan = Divan.IdDivan
             WHERE Orders.IdCustomers = ?`,
            [IdCustomers]
        );

        res.status(200).json(rows);
    } catch (err) {
        console.error('Ошибка при получении списка заказов:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Роут для выхода из аккаунта
app.post('/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка при выходе из аккаунта:', err);
            res.status(500).json({ message: 'Ошибка сервера' });
        } else {
            res.status(200).json({ message: 'Вы успешно вышли из аккаунта' });
        }
    });
});


// Роут для оформления заказа
app.post('/order', async (req, res) => {
    const { model, color, namePoluchateln, addrress, phone, dataOrders } = req.body;

    console.log('Данные от клиента:', req.body); 

    try {
        const connection = await mysql.createConnection(dbConfig);

        const IdCustomers = req.session.user ? req.session.user.IdCustomers : null;

        if (!IdCustomers) {
            return res.status(401).json({ message: 'Пожалуйста, войдите в систему, чтобы оформить заказ' });
        }

        // Получаем IdDivan из таблицы Divan
        const [divanRows] = await connection.execute(
            'SELECT IdDivan FROM Divan WHERE NameDivan = ? AND TypeTkani = ?',
            [model, color]
        );

        if (divanRows.length === 0) {
            return res.status(400).json({ message: 'Выбранный диван не найден' });
        }

        const IdDivan = divanRows[0].IdDivan;

        // Проверка даты заказа
        const currentDate = new Date();
        const orderDate = dataOrders ? new Date(dataOrders) : currentDate;

        if (orderDate < currentDate) {
            return res.status(400).json({ message: 'Дата заказа не может быть в прошлом' });
        }

        // Вставка данных в таблицу Orders
        const [orderRows] = await connection.execute(
            'INSERT INTO Orders (IdCustomers, IdDivan, NamePoluchateln, Addrress, Phone, DataOrders) VALUES (?, ?, ?, ?, ?, ?)',
            [IdCustomers, IdDivan, namePoluchateln, addrress, phone, orderDate]
        );

        console.log('Данные успешно вставлены:', orderRows); // Вывод результата вставки

        res.status(201).json({ message: 'Заказ успешно оформлен' });
    } catch (err) {
        console.error('0шибка при вставке данных:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});


app.use(express.static('public'));

app.listen(5000, () => {
    console.log('Сервер запущен по порту 5000');
});