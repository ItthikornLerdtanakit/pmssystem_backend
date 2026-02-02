import express from 'express';
import { configDotenv } from 'dotenv';
import cors from 'cors';
import bodyparser from 'body-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import multer from 'multer';

import { check_permission, get_event, get_parttype_pmssystem, get_part_pmssystem, get_result_evaluation, get_evaluation_manager, get_staff_sumary } from './component/select.js';
import { save_evaluation } from './component/insert.js';

configDotenv();

const ipaddress = process.env.IPADDRESS;
const app = express();
const port = 5501;

app.set('trust proxy', 'loopback');

// กำหนดที่เก็บไฟล์
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

// -------------------------
//   RATE LIMIT ปลอดภัย IPv6
// -------------------------
// สร้าง Rate Limiter เพื่อลดการโจมตี DDoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 100, // จำกัดที่ 100 requests ต่อ 15 นาที
    keyGenerator: (req, res) => {
        // ใช้ helper ที่ถูกต้อง (รองรับ IPv6)
        let ip = ipKeyGenerator(req);
        // ถ้ามี port เช่น 10.1.1.5:54321 → remove port
        if (typeof ip === 'string' && ip.includes(':')) {
            // IPv4 + port (มีส่วนยาว 2 ส่วน เช่น 10.1.1.5:1234)
            if (ip.split(':').length === 2 && ip.includes('.')) {
                ip = ip.split(':')[0];
            }
        }
        return ip;
    },
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// -------------------------
// CORS
// -------------------------
app.use(cors({
    origin: ipaddress,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
}));
app.use(express.urlencoded({ extended: false }));
app.use(bodyparser.json());

// -------------------------
// ROUTES
// -------------------------
app.post(process.env.CHECK_PERMISSION, async (req, res) => {
    try {
        const result = await check_permission(req.body.oid);
        res.send(result);
    } catch (error) {
        console.error(error);
    }
});

// ดึงข้อมูล Event ของการประเมินพนักงานภายในบริษัท
app.get(process.env.GET_EVENT, async (_, res) => {
    try {
        const result = await get_event();
        res.send(result);
    } catch (error) {
        console.error(error);
    }
});

app.get(process.env.GET_QUESTION_EVALUATION, async (_, res) => {
    try {
        const result_parttype = await get_parttype_pmssystem();
        const result_part = await get_part_pmssystem();
        res.send({ result_parttype, result_part });
    } catch (error) {
        console.error(error);
    }
});

app.post(process.env.SAVE_EVALUATION, async (req, res) => {
    try {
        const result = await save_evaluation(req.body);
        res.send(result);
    } catch (error) {
        console.error(error);
    }
});

app.post(process.env.GET_RESUTL_EVALUATION, async (req, res) => {
    try {
        const result_self = await get_result_evaluation(req.body, 'self');
        const result_manager = await get_result_evaluation(req.body, 'manager');
        res.send({ result_self, result_manager });
    } catch (error) {
        console.error(error);
    }
});

app.post(process.env.GET_EVALUATION_MANAGER, async (req, res) => {
    try {
        const result = await get_evaluation_manager(req.body);
        res.send(result);
    } catch (error) {
        console.error(error);
    }
});

app.post(process.env.GET_STAFF_MANAGER, async (req, res) => {
    try {
        const result = await get_staff_sumary(req.body);
        res.send(result);
    } catch (error) {
        console.error(error);
    }
});

// -------------------------
// LISTEN
// -------------------------
app.listen(port, () => console.log(`Server Running On URL http://localhost:${port}`));