import { configDotenv } from 'dotenv';
import jwt from 'jsonwebtoken';
import moment from 'moment-timezone';

import db from './connectdatabase.js';
import { get_period } from './functions.js';

configDotenv();

export const check_permission = async (oid) => {
    const select = 'select e.employee_id, e.employee_code, e.employee_nameen, e.employee_position, e.employee_usertype, e.employee_level, d.department_id, d.department_code, d.department_name from employees e inner join departments d on e.department_id = d.department_id where employee_oid = ?';
    const [result] = await db.connectdatabase.query(select, [oid]);
    if (result.length > 0) {
        const token = jwt.sign({ result_employee: result[0] }, process.env.SECRET_KEY, { expiresIn: '1h' });
        return { status: true, token };
    } else {
        return { status: false };
    }
}

// ดึงข้อมูล Event ของการประเมินพนักงานภายในบริษัท
export const get_event = async () => {
    const select = 'select * from events';
    const [result] = await db.connectdatabase_pmssystem.query(select);
    const resultformatdate = await Promise.all(result.map(async item => {
        return {
            ...item,
            event_startdate: moment.utc(item.event_startdate).tz('Asia/Bangkok').format('DD/MM/YYYY'),
            event_enddate: moment.utc(item.event_enddate).tz('Asia/Bangkok').format('DD/MM/YYYY')
        };
    }));
    return resultformatdate;
}

export const get_parttype_pmssystem = async (level) => {
    if (level === 'level_5' || level === 'level_4' || level === 'level_3') {
        const select = 'select * from parttypes where parttype_statusheadof = ?';
        const [result] = await db.connectdatabase_pmssystem.query(select, [1]);
        return result;
    } else if (level === 'level_2') {
        const select = 'select * from parttypes where parttype_statusmanager = ?';
        const [result] = await db.connectdatabase_pmssystem.query(select, [1]);
        return result;
    } else if (level === 'level_1') {
        const select = 'select * from parttypes where parttype_statusstaff = ?';
        const [result] = await db.connectdatabase_pmssystem.query(select, [1]);
        return result;
    }
}

export const get_part_pmssystem = async (level) => {
    let evaluate = 'fail';
    if (['level_5','level_4','level_3'].includes(level)) evaluate = 'Head Of Evaluate Manager';
    else if (level === 'level_2') evaluate = 'Manager Evaluate Staff';
    else if (level === 'level_1') evaluate = 'Evaluate Self';
    if (evaluate === 'fail') {
        return evaluate;
    } else {
        const select_event = 'select event_startdate, event_enddate from events where event_statusdate = ? and event_evaluate = ?';
        const [check_open_pms] = await db.connectdatabase_pmssystem.query(select_event, ['2-2024', evaluate]);
        const now = new Date();
        const isOpen = now >= new Date(check_open_pms[0].event_startdate) && now <= new Date(check_open_pms[0].event_enddate);
        if (isOpen) {
            const select_part = 'select * from parts';
            const [result] = await db.connectdatabase_pmssystem.query(select_part);
            return result;
        } else {
            return 'fail';
        }
    }
}

export const get_result_evaluation = async (item, type) => {
    const { employee_id } = item;
    const parts = ['part1', 'part2', 'part3', 'part4', 'part5'];
    const result = {};
    for (const part of parts) {
        const sql = `select * from ${part} where employee_id = ? and part_type = ?`;
        const [rows] = await db.connectdatabase_pmssystem.query(sql, [employee_id, type]);
        result[part] = rows ?? [];
    }
    return result;
}

export const get_evaluation_manager = async (item) => {
    const { employee_code } = item;
    const select = 'select e.employee_id, e.employee_code, e.employee_nameen, e.employee_nameth, e.employee_position, e.employee_supervisor, e.employee_usertype, e.employee_email, e.employee_level, e.employee_status, e.employee_image, e.employee_annotation, e.employee_startdate, e.employee_enddate, d.department_id, d.department_code, d.department_name from employees e inner join departments d on e.department_id = d.department_id where employee_supervisor = ? && employee_status != ?';
    const [result] = await db.connectdatabase.query(select, [employee_code, 'resign']);
    const data = await Promise.all(
        result.map(async (emp) => {
            const [score_part1_self] = await get_evaluation_score_part1(emp.employee_id, 'self');
            const [score_part1_manager] = await get_evaluation_score_part1(emp.employee_id, 'manager');
            const [score_part2_self] = await get_evaluation_score_part2(emp.employee_id, 'self');
            const [score_part2_manager] = await get_evaluation_score_part2(emp.employee_id, 'manager');
            return {
                ...emp,
                part1_score_self: Number(score_part1_self?.score ?? 0),
                part1_score_manager: Number(score_part1_manager?.score ?? 0),
                part2_score_self: Number(score_part2_self?.score ?? 0),
                part2_score_manager: Number(score_part2_manager?.score ?? 0)
            };
        })
    );
    return data;
}

export const get_staff_sumary = async (item) => {
    const { employee_id, department_id, employee_level } = item;
    if (employee_level === 'level_5' || employee_level === 'level_4') {
        const select = 'select e.employee_id, e.employee_code, e.employee_nameen, e.employee_nameth, e.employee_position, e.employee_supervisor, e.employee_usertype, e.employee_email, e.employee_level, e.employee_status, e.employee_image, e.employee_annotation, e.employee_startdate, e.employee_enddate, d.department_id, d.department_code, d.department_name from employees e inner join departments d on e.department_id = d.department_id where d.department_id = ? && employee_status != ? order by employee_level desc';
        const [result] = await db.connectdatabase.query(select, [department_id, 'resign']);
        const data = await Promise.all(
            result.map(async (emp) => {
                const [score_part1_self] = await get_evaluation_score_part1(emp.employee_id, 'self');
                const [score_part1_manager] = await get_evaluation_score_part1(emp.employee_id, 'manager');
                const [score_part2_self] = await get_evaluation_score_part2(emp.employee_id, 'self');
                const [score_part2_manager] = await get_evaluation_score_part2(emp.employee_id, 'manager');
                return {
                    ...emp,
                    part1_score_self: Number(score_part1_self?.score ?? 0),
                    part1_score_manager: Number(score_part1_manager?.score ?? 0),
                    part2_score_self: Number(score_part2_self?.score ?? 0),
                    part2_score_manager: Number(score_part2_manager?.score ?? 0)
                };
            })
        );
        return data;
    } else if (employee_level === 'level_3') {
        const select = 'select e.employee_id, e.employee_code, e.employee_nameen, e.employee_nameth, e.employee_position, e.employee_supervisor, e.employee_usertype, e.employee_email, e.employee_level, e.employee_status, e.employee_image, e.employee_annotation, e.employee_startdate, e.employee_enddate, d.department_id, d.department_code, d.department_name from employees e inner join departments d on e.department_id = d.department_id where employee_id = ? && (d.department_id = ? && (employee_level = ? && employee_level = ?)) && employee_status != ? order by employee_level desc';
        const [result] = await db.connectdatabase.query(select, [employee_id, department_id, 'level_2', 'level_1', 'resign']);
        const data = await Promise.all(
            result.map(async (emp) => {
                const [score_part1_self] = await get_evaluation_score_part1(emp.employee_id, 'self');
                const [score_part1_manager] = await get_evaluation_score_part1(emp.employee_id, 'manager');
                const [score_part2_self] = await get_evaluation_score_part2(emp.employee_id, 'self');
                const [score_part2_manager] = await get_evaluation_score_part2(emp.employee_id, 'manager');
                return {
                    ...emp,
                    part1_score_self: Number(score_part1_self?.score ?? 0),
                    part1_score_manager: Number(score_part1_manager?.score ?? 0),
                    part2_score_self: Number(score_part2_self?.score ?? 0),
                    part2_score_manager: Number(score_part2_manager?.score ?? 0)
                };
            })
        );
        return data;
    } else if (employee_level === 'level_2') {
        const select = 'select e.employee_id, e.employee_code, e.employee_nameen, e.employee_nameth, e.employee_position, e.employee_supervisor, e.employee_usertype, e.employee_email, e.employee_level, e.employee_status, e.employee_image, e.employee_annotation, e.employee_startdate, e.employee_enddate, d.department_id, d.department_code, d.department_name from employees e inner join departments d on e.department_id = d.department_id where employee_id = ? || (d.department_id = ? && employee_level = ?) && employee_status != ? order by employee_level desc';
        const [result] = await db.connectdatabase.query(select, [employee_id, department_id, 'level_1', 'resign']);
        const data = await Promise.all(
            result.map(async (emp) => {
                const [score_part1_self] = await get_evaluation_score_part1(emp.employee_id, 'self');
                const [score_part1_manager] = await get_evaluation_score_part1(emp.employee_id, 'manager');
                const [score_part2_self] = await get_evaluation_score_part2(emp.employee_id, 'self');
                const [score_part2_manager] = await get_evaluation_score_part2(emp.employee_id, 'manager');
                return {
                    ...emp,
                    part1_score_self: Number(score_part1_self?.score ?? 0),
                    part1_score_manager: Number(score_part1_manager?.score ?? 0),
                    part2_score_self: Number(score_part2_self?.score ?? 0),
                    part2_score_manager: Number(score_part2_manager?.score ?? 0)
                };
            })
        );
        return data;
    } else {
        const select = 'select e.employee_id, e.employee_code, e.employee_nameen, e.employee_nameth, e.employee_position, e.employee_supervisor, e.employee_usertype, e.employee_email, e.employee_level, e.employee_status, e.employee_image, e.employee_annotation, e.employee_startdate, e.employee_enddate, d.department_id, d.department_code, d.department_name from employees e inner join departments d on e.department_id = d.department_id where employee_id = ? && employee_status != ? order by employee_level desc';
        const [result] = await db.connectdatabase.query(select, [employee_id, 'resign']);
        const data = await Promise.all(
            result.map(async (emp) => {
                const [score_part1_self] = await get_evaluation_score_part1(emp.employee_id, 'self');
                const [score_part1_manager] = await get_evaluation_score_part1(emp.employee_id, 'manager');
                const [score_part2_self] = await get_evaluation_score_part2(emp.employee_id, 'self');
                const [score_part2_manager] = await get_evaluation_score_part2(emp.employee_id, 'manager');
                return {
                    ...emp,
                    part1_score_self: Number(score_part1_self?.score ?? 0),
                    part1_score_manager: Number(score_part1_manager?.score ?? 0),
                    part2_score_self: Number(score_part2_self?.score ?? 0),
                    part2_score_manager: Number(score_part2_manager?.score ?? 0)
                };
            })
        );
        return data;
    }
}

const get_evaluation_score_part1 = async (id, type) => {
    const select = 'select sum((part_weight * part_rating) / cast(100 as decimal(10,2))) as score, part_status from part1 where employee_id = ? and part_type = ? and part_status = ? group by part_status';
    const [result] = await db.connectdatabase_pmssystem.query(select, [id, type, get_period()]);
    return result;
}

const get_evaluation_score_part2 = async (id, type) => {
    const select = 'select sum((part_weight * part_rating) / cast(100 as decimal(10,2))) as score, part_status from part2 where employee_id = ? and part_type = ? and part_status = ? group by part_status';
    const [result] = await db.connectdatabase_pmssystem.query(select, [id, type, get_period()]);
    return result;
}